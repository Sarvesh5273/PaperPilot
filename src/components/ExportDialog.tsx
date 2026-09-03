'use client';

import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Paper, PaperOutline } from '@/types';
import { Download, FileDown, FileText, CheckCircle } from 'lucide-react';
import { formatAPACitation, formatIEEECitation, formatIEEEInTextCitation, formatInTextCitation } from '@/lib/citations';
import { loadCollections } from '@/lib/storage';

interface ExportDialogProps {
  outline?: PaperOutline;
  disabled?: boolean;
}

type CitationFormat = 'apa' | 'ieee';
type ExportFormat = 'markdown' | 'word';

const escapeHtml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

export function ExportDialog({ outline, disabled }: ExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [citationFormat, setCitationFormat] = useState<CitationFormat>('apa');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('markdown');

  const approved = outline?.sections.filter((section) => section.status === 'approved') || [];
  const sectionsToExport = outline ? (approved.length > 0 ? approved : outline.sections) : [];
  const allPapers = loadCollections().flatMap((collection) => collection.papers) as Paper[];

  const citedPapers = useMemo(() => {
    if (!outline) return [] as Paper[];
    const seen = new Set<string>();
    return outline.sections.flatMap((section) => section.citations)
      .map((citation) => allPapers.find((paper) => paper.id === citation.paperId))
      .filter((paper): paper is Paper => Boolean(paper))
      .filter((paper) => {
        if (seen.has(paper.id)) return false;
        seen.add(paper.id);
        return true;
      });
  }, [allPapers, outline]);

  const paperNumber = (paperId: string) => citedPapers.findIndex((paper) => paper.id === paperId) + 1;

  const formatSectionText = (text: string) => {
    if (citationFormat !== 'ieee') return text;
    let formatted = text;
    for (const paper of citedPapers) {
      const number = paperNumber(paper.id);
      const placeholder = `{{${paper.id}}}`;
      const authorYear = formatInTextCitation(paper.authors, paper.published.split('-')[0]);
      const ieee = formatIEEEInTextCitation(number);
      formatted = formatted.split(`(${placeholder})`).join(ieee);
      formatted = formatted.split(placeholder).join(ieee);
      formatted = formatted.split(`(${authorYear})`).join(ieee);
      formatted = formatted.split(authorYear).join(ieee);
    }
    return formatted;
  };

  const body = sectionsToExport
    .map((section) => `## ${section.title}\n\n${formatSectionText(section.humanEdit || section.agentDraft || '(Empty section)')}`)
    .join('\n\n');

  const references = citedPapers.map((paper, index) => (
    citationFormat === 'ieee' ? formatIEEECitation(paper, index + 1) : formatAPACitation(paper)
  ));

  const markdownContent = `# ${outline?.title || 'PaperPilot Draft'}\n\n${body}\n\n## References\n\n${
    references.length > 0 ? references.join('\n\n') : 'No references cited.'
  }`;

  const wordContent = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>${escapeHtml(outline?.title || 'PaperPilot Draft')}</title>
<style>
@page { size: 8.5in 11in; margin: 0.75in; }
body { font-family: 'Times New Roman', serif; font-size: 10pt; line-height: 1.15; color: #000; }
h1 { font-size: 18pt; text-align: center; margin: 0 0 8pt; }
h2 { font-size: 10pt; text-transform: uppercase; margin: 10pt 0 4pt; }
.subtitle { text-align: center; font-size: 9pt; margin-bottom: 14pt; }
.columns { column-count: 2; column-gap: 0.25in; }
p { margin: 0 0 7pt; text-align: justify; }
.reference { padding-left: 0.22in; text-indent: -0.22in; margin-bottom: 6pt; }
.notice { font-family: Arial, sans-serif; font-size: 8pt; color: #555; border-top: 1px solid #aaa; margin-top: 12pt; padding-top: 6pt; }
</style></head>
<body><h1>${escapeHtml(outline?.title || 'PaperPilot Draft')}</h1><p class="subtitle">Draft prepared in PaperPilot · Review against your target conference template before submission.</p>
<div class="columns">${sectionsToExport.map((section) => `<h2>${escapeHtml(section.title)}</h2>${formatSectionText(section.humanEdit || section.agentDraft || '(Empty section)').split(/\n{2,}/).map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('')}`).join('')}<h2>References</h2>${references.length ? references.map((reference) => `<p class="reference">${escapeHtml(reference)}</p>`).join('') : '<p>No references cited.</p>'}</div>
<p class="notice">This Word-compatible IEEE-style draft provides numbered citations and a two-column manuscript layout. Each conference has its own official template, page limit, and submission checks; apply that venue’s template before submitting.</p>
</body></html>`;

  const download = (content: string, mimeType: string, extension: string) => {
    const blob = new Blob([content], { type: mimeType });
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

  const handleDownload = () => {
    if (exportFormat === 'word') {
      download(wordContent, 'application/msword;charset=utf-8', 'doc');
      return;
    }
    download(markdownContent, 'text/markdown;charset=utf-8', 'md');
  };

  if (!outline) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger disabled={disabled} className="h-7 text-xs border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 rounded px-2.5 inline-flex items-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
        <Download className="w-3.5 h-3.5 mr-1 text-emerald-400" /> Export
      </DialogTrigger>
      <DialogContent className="max-w-xl bg-neutral-900 border-neutral-800 text-neutral-200">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold flex items-center gap-2"><FileDown className="w-4 h-4 text-emerald-400" /> Export paper</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-xs">
          <p className="text-neutral-400">{approved.length} of {outline.sections.length} sections approved. {approved.length === 0 && 'All sections will be included as a working draft.'}</p>
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1 text-neutral-300"><span>File type</span><select value={exportFormat} onChange={(event) => setExportFormat(event.target.value as ExportFormat)} className="w-full rounded border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-xs text-neutral-200"><option value="markdown">Markdown (.md)</option><option value="word">Word-compatible (.doc)</option></select></label>
            <label className="space-y-1 text-neutral-300"><span>Citation style</span><select value={citationFormat} onChange={(event) => setCitationFormat(event.target.value as CitationFormat)} className="w-full rounded border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-xs text-neutral-200"><option value="apa">APA</option><option value="ieee">IEEE numbered</option></select></label>
          </div>
          {exportFormat === 'word' && citationFormat === 'ieee' && <p className="rounded border border-amber-900/70 bg-amber-950/20 p-2 text-[11px] leading-relaxed text-amber-200">This creates a Word-compatible IEEE-style draft with two columns and numbered citations. Confirm the official template and requirements for your specific conference before submission.</p>}
          <pre className="h-56 overflow-y-auto rounded border border-neutral-800 bg-neutral-950 p-3 text-[11px] text-neutral-300 font-mono whitespace-pre-wrap">{markdownContent}</pre>
        </div>
        <DialogFooter><Button size="sm" onClick={handleDownload} className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700">{downloaded ? <CheckCircle className="w-3.5 h-3.5 mr-1" /> : <FileText className="w-3.5 h-3.5 mr-1" />}{downloaded ? 'Downloaded' : exportFormat === 'word' ? 'Download Word file' : 'Download Markdown'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
