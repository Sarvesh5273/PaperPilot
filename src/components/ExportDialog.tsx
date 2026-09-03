'use client';

import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Paper, PaperOutline } from '@/types';
import { Download, FileDown, FileText, CheckCircle, Loader2 } from 'lucide-react';
import { formatAPACitation, formatBibtexCitation, formatIEEECitation } from '@/lib/citations';
import { loadCollections } from '@/lib/storage';
import { buildDocxBlob, resolveSectionText, CitationFormat } from '@/lib/exportDocx';
import { buildLatexDocument } from '@/lib/exportLatex';
import { Copy, Check } from 'lucide-react';

interface ExportDialogProps {
  outline?: PaperOutline;
  disabled?: boolean;
}

type ExportFormat = 'latex' | 'docx' | 'markdown' | 'bibtex';

export function ExportDialog({ outline, disabled }: ExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [citationFormat, setCitationFormat] = useState<CitationFormat>('ieee');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('latex');

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const allPapers = useMemo(() => loadCollections().flatMap(c => c.papers) as Paper[], [open]);

  const sectionsToExport = useMemo(() => {
    const approved = outline?.sections.filter(s => s.status === 'approved') || [];
    return outline ? (approved.length > 0 ? approved : outline.sections) : [];
  }, [outline]);

  const citedPapers = useMemo(() => {
    if (!outline) return [] as Paper[];
    const seen = new Set<string>();

    const explicitCited = outline.sections.flatMap(s => s.citations)
      .map(c => allPapers.find(p => p.id === c.paperId))
      .filter((p): p is Paper => Boolean(p));

    const textPlaceholders = outline.sections.flatMap(s => {
      const text = `${s.humanEdit || ''} ${s.agentDraft || ''}`;
      const matches = text.match(/\{\{([^}]+)\}\}/g) || [];
      return matches.map(m => m.replace(/[{}]/g, '').trim());
    });
    const fromText = textPlaceholders
      .map(id => allPapers.find(p => p.id === id || p.title.toLowerCase().includes(id.toLowerCase())))
      .filter((p): p is Paper => Boolean(p));

    const combined = [...explicitCited, ...fromText];
    const pool = combined.length > 0 ? combined : allPapers;
    return pool.filter(p => (seen.has(p.id) ? false : (seen.add(p.id), true)));
  }, [allPapers, outline]);

  const body = sectionsToExport
    .map(s => `## ${s.title}\n\n${resolveSectionText(s.humanEdit || s.agentDraft || '(Empty section)', citedPapers, citationFormat)}`)
    .join('\n\n');

  const references = citedPapers.map((p, i) =>
    citationFormat === 'ieee' ? formatIEEECitation(p, i + 1) : formatAPACitation(p));

  const markdownContent = `# ${outline?.title || 'PaperPilot Draft'}\n\n${body}\n\n## References\n\n${
    references.length > 0 ? references.join('\n\n') : 'No references cited.'
  }`;

  const latexContent = useMemo(() => {
    if (!outline) return '';
    return buildLatexDocument({
      outline,
      sections: sectionsToExport.map(s => ({
        title: s.title,
        text: s.humanEdit || s.agentDraft || '(Empty section)',
      })),
      citedPapers,
      citationFormat,
    });
  }, [outline, sectionsToExport, citedPapers, citationFormat]);

  const bibContent = useMemo(() => {
    const bibSource = citedPapers.length > 0 ? citedPapers : allPapers;
    return bibSource.map(formatBibtexCitation).join('\n\n');
  }, [citedPapers, allPapers]);

  const previewContent = useMemo(() => {
    if (exportFormat === 'latex') return latexContent;
    if (exportFormat === 'bibtex') return bibContent;
    return markdownContent;
  }, [exportFormat, latexContent, bibContent, markdownContent]);

  const triggerDownload = (blob: Blob, extension: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(outline?.title || 'paperpilot_draft').toLowerCase().replace(/[^a-z0-9]/gi, '_')}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setDownloaded(true);
    window.setTimeout(() => setDownloaded(false), 2000);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(previewContent);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleDownload = async () => {
    if (!outline) return;
    setError(null);

    if (exportFormat === 'latex') {
      triggerDownload(new Blob([latexContent], { type: 'application/x-tex;charset=utf-8' }), 'tex');
      return;
    }

    if (exportFormat === 'markdown') {
      triggerDownload(new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' }), 'md');
      return;
    }

    if (exportFormat === 'bibtex') {
      const bibSource = citedPapers.length > 0 ? citedPapers : allPapers;
      if (bibSource.length === 0) {
        setError('No papers available to export as BibTeX.');
        return;
      }
      triggerDownload(new Blob([bibContent], { type: 'text/plain;charset=utf-8' }), 'bib');
      return;
    }

    setExporting(true);
    try {
      const blob = await buildDocxBlob({
        outline,
        sections: sectionsToExport.map(s => ({
          title: s.title,
          text: s.humanEdit || s.agentDraft || '(Empty section)',
        })),
        citedPapers,
        citationFormat,
      });
      triggerDownload(blob, 'docx');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate the Word file.');
    } finally {
      setExporting(false);
    }
  };

  if (!outline) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        disabled={disabled}
        className="h-7.5 text-xs font-semibold border border-border/80 bg-background hover:bg-accent text-foreground rounded-lg px-2.5 inline-flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Download className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
        <span>Export</span>
      </DialogTrigger>
      <DialogContent className="w-[94vw] sm:max-w-2xl max-h-[90vh] flex flex-col bg-card border-border/80 text-foreground rounded-2xl shadow-2xl overflow-hidden p-4 sm:p-5">
        <DialogHeader className="shrink-0 pb-2 border-b border-border/60">
          <DialogTitle className="font-editorial text-base sm:text-lg font-bold flex items-center gap-2 text-foreground">
            <FileDown className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>Export Manuscript</span>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-xs flex-1 flex flex-col min-h-0 overflow-y-auto py-1">
          <p className="text-muted-foreground shrink-0">
            <strong className="text-foreground">{approved.length}</strong> of {outline.sections.length} sections approved.
            {approved.length === 0 && ' All sections will be included as a working draft.'}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 shrink-0">
            <label className="space-y-1 text-foreground font-medium">
              <span className="text-[11px] text-muted-foreground">File format</span>
              <select
                value={exportFormat}
                onChange={e => setExportFormat(e.target.value as ExportFormat)}
                className="w-full rounded-xl border border-border/80 bg-background px-3 py-2 text-xs font-medium text-foreground outline-none shadow-2xs"
              >
                <option value="latex">LaTeX (.tex) — Overleaf Ready</option>
                <option value="docx">Word (.docx)</option>
                <option value="markdown">Markdown (.md)</option>
                <option value="bibtex">BibTeX (.bib)</option>
              </select>
            </label>
            <label className="space-y-1 text-foreground font-medium">
              <span className="text-[11px] text-muted-foreground">Citation convention</span>
              <select
                value={citationFormat}
                onChange={e => setCitationFormat(e.target.value as CitationFormat)}
                className="w-full rounded-xl border border-border/80 bg-background px-3 py-2 text-xs font-medium text-foreground outline-none shadow-2xs"
              >
                <option value="ieee">IEEE numbered [n]</option>
                <option value="apa">APA (Author, Year)</option>
              </select>
            </label>
          </div>
          {exportFormat === 'latex' && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 text-[11px] leading-relaxed text-amber-800 dark:text-amber-300 flex flex-wrap items-center justify-between gap-2 shrink-0">
              <span>
                {citationFormat === 'ieee'
                  ? 'Compiles with IEEEtran conference style on Overleaf.'
                  : 'Compiles with standard academic article style on Overleaf.'}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopy}
                className="h-6.5 px-2 text-[10px] font-semibold shrink-0 border-amber-500/40 bg-background/80 hover:bg-amber-500/20 gap-1"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-amber-600 dark:text-amber-400" />}
                <span>{copied ? 'Copied!' : 'Copy LaTeX'}</span>
              </Button>
            </div>
          )}
          {exportFormat === 'docx' && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 text-[11px] leading-relaxed text-amber-800 dark:text-amber-300 shrink-0">
              {citationFormat === 'ieee'
                ? 'IEEE format: two-column layout, Times font, bracketed numbered citations [n].'
                : 'APA format: student-paper format with double-spacing and hanging-indent references.'}
            </div>
          )}
          {error && <p className="text-xs font-medium text-rose-500 shrink-0">{error}</p>}
          <div className="relative flex-1 min-h-[140px] flex flex-col">
            <pre className="flex-1 min-h-[140px] max-h-56 overflow-y-auto rounded-xl border border-border/70 bg-muted/30 p-3 text-[11px] text-foreground/90 font-mono leading-relaxed whitespace-pre-wrap">
              {previewContent}
            </pre>
            {exportFormat !== 'docx' && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopy}
                className="absolute top-2 right-2 h-6 px-2 text-[10px] bg-background/90 border-border/80 shadow-2xs gap-1 opacity-80 hover:opacity-100"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </Button>
            )}
          </div>
        </div>
        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2 shrink-0 pt-3 border-t border-border/60">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCopy}
            className="h-8 px-3 text-xs font-medium rounded-xl gap-1.5 text-muted-foreground hover:text-foreground w-full sm:w-auto"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied to clipboard' : 'Copy code'}</span>
          </Button>
          <Button
            size="sm"
            onClick={handleDownload}
            disabled={exporting}
            className="h-8.5 px-4 text-xs font-semibold rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-xs gap-1.5 w-full sm:w-auto"
          >
            {exporting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : downloaded ? (
              <CheckCircle className="w-3.5 h-3.5" />
            ) : (
              <FileText className="w-3.5 h-3.5" />
            )}
            <span>
              {exporting
                ? 'Generating...'
                : downloaded
                ? 'Downloaded!'
                : exportFormat === 'latex'
                ? 'Download .tex'
                : exportFormat === 'docx'
                ? 'Download .docx'
                : exportFormat === 'bibtex'
                ? 'Download .bib'
                : 'Download .md'}
            </span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}