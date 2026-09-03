'use client';

import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Paper, PaperOutline } from '@/types';
import { Download, FileDown, FileText, CheckCircle, Loader2 } from 'lucide-react';
import { formatAPACitation, formatBibtexCitation, formatIEEECitation } from '@/lib/citations';
import { loadCollections } from '@/lib/storage';
import { buildDocxBlob, resolveSectionText, CitationFormat } from '@/lib/exportDocx';

interface ExportDialogProps {
  outline?: PaperOutline;
  disabled?: boolean;
}

type ExportFormat = 'markdown' | 'docx' | 'bibtex';

export function ExportDialog({ outline, disabled }: ExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [citationFormat, setCitationFormat] = useState<CitationFormat>('apa');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('markdown');

  const allPapers = useMemo(() => loadCollections().flatMap(c => c.papers) as Paper[], [open]);

  const approved = outline?.sections.filter(s => s.status === 'approved') || [];
  const sectionsToExport = outline ? (approved.length > 0 ? approved : outline.sections) : [];

  const citedPapers = useMemo(() => {
    if (!outline) return [] as Paper[];
    const seen = new Set<string>();
    return outline.sections.flatMap(s => s.citations)
      .map(c => allPapers.find(p => p.id === c.paperId))
      .filter((p): p is Paper => Boolean(p))
      .filter(p => (seen.has(p.id) ? false : (seen.add(p.id), true)));
  }, [allPapers, outline]);

  const body = sectionsToExport
    .map(s => `## ${s.title}\n\n${resolveSectionText(s.humanEdit || s.agentDraft || '(Empty section)', citedPapers, citationFormat)}`)
    .join('\n\n');

  const references = citedPapers.map((p, i) =>
    citationFormat === 'ieee' ? formatIEEECitation(p, i + 1) : formatAPACitation(p));

  const markdownContent = `# ${outline?.title || 'PaperPilot Draft'}\n\n${body}\n\n## References\n\n${
    references.length > 0 ? references.join('\n\n') : 'No references cited.'
  }`;

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

  const handleDownload = async () => {
    if (!outline) return;
    setError(null);

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
      const bibContent = bibSource.map(formatBibtexCitation).join('\n\n');
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
      <DialogTrigger disabled={disabled} className="h-7 text-xs border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 rounded px-2.5 inline-flex items-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
        <Download className="w-3.5 h-3.5 mr-1 text-emerald-400" /> Export
      </DialogTrigger>
      <DialogContent className="max-w-xl bg-neutral-900 border-neutral-800 text-neutral-200">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold flex items-center gap-2">
            <FileDown className="w-4 h-4 text-emerald-400" /> Export paper
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-xs">
          <p className="text-neutral-400">
            {approved.length} of {outline.sections.length} sections approved.
            {approved.length === 0 && ' All sections will be included as a working draft.'}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1 text-neutral-300">
              <span>File type</span>
              <select value={exportFormat} onChange={e => setExportFormat(e.target.value as ExportFormat)}
                className="w-full rounded border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-xs text-neutral-200">
                <option value="markdown">Markdown (.md)</option>
                <option value="docx">Word (.docx)</option>
                <option value="bibtex">BibTeX (.bib)</option>
              </select>
            </label>
            <label className="space-y-1 text-neutral-300">
              <span>Citation style</span>
              <select value={citationFormat} onChange={e => setCitationFormat(e.target.value as CitationFormat)}
                className="w-full rounded border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-xs text-neutral-200">
                <option value="apa">APA</option>
                <option value="ieee">IEEE numbered</option>
              </select>
            </label>
          </div>
          {exportFormat === 'docx' && (
            <p className="rounded border border-amber-900/70 bg-amber-950/20 p-2 text-[11px] leading-relaxed text-amber-200">
              {citationFormat === 'ieee'
                ? 'IEEE: two-column manuscript, 10pt Times, numbered citations [n]. Always apply the official conference template before submitting.'
                : 'APA: student-paper format with title page, double-spaced indented paragraphs, and hanging-indent references.'}
            </p>
          )}
          {error && <p className="text-[11px] text-rose-400">{error}</p>}
          <pre className="h-56 overflow-y-auto rounded border border-neutral-800 bg-neutral-950 p-3 text-[11px] text-neutral-300 font-mono whitespace-pre-wrap">{markdownContent}</pre>
        </div>
        <DialogFooter>
          <Button size="sm" onClick={handleDownload} disabled={exporting}
            className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700">
            {exporting ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
              : downloaded ? <CheckCircle className="w-3.5 h-3.5 mr-1" />
              : <FileText className="w-3.5 h-3.5 mr-1" />}
            {exporting ? 'Generating...' : downloaded ? 'Downloaded'
              : exportFormat === 'docx' ? 'Download .docx'
              : exportFormat === 'bibtex' ? 'Download .bib'
              : 'Download .md'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}