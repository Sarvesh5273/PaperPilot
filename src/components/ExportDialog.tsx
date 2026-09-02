'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { PaperOutline } from '@/types';
import { Download, FileDown, CheckCircle } from 'lucide-react';
import { formatAPACitation, formatIEEECitation } from '@/lib/citations';
import { loadCollections } from '@/lib/storage';

interface ExportDialogProps {
  outline?: PaperOutline;
  disabled?: boolean;
}

export function ExportDialog({ outline, disabled }: ExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [citationFormat, setCitationFormat] = useState<'apa' | 'ieee'>('apa');

  if (!outline) return null;

  const approved = outline.sections.filter((s) => s.status === 'approved');
  const sectionsToExport = approved.length > 0 ? approved : outline.sections;

  const body = sectionsToExport
    .map((s) => `## ${s.title}\n\n${s.humanEdit || s.agentDraft || '(Empty section)'}`)
    .join('\n\n');

  const allPapers = loadCollections().flatMap((collection) => collection.papers);
  const bib = outline.sections.flatMap((s) => s.citations.map((c) => {
    const paper = allPapers.find((candidate) => candidate.id === c.paperId);
    if (!paper) return c.formatted;
    return citationFormat === 'ieee' ? formatIEEECitation(paper) : formatAPACitation(paper);
  }));
  const uniqueBib = [...new Set(bib)];

  const markdownContent = `# ${outline.title}\n\n${body}\n\n## References\n\n${
    uniqueBib.length > 0 ? uniqueBib.join('\n\n') : 'No references cited.'
  }`;

  const handleDownload = () => {
    const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${outline.title.toLowerCase().replace(/[^a-z0-9]/gi, '_')}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        disabled={disabled}
        className="h-7 text-xs border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 rounded px-2.5 inline-flex items-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Download className="w-3.5 h-3.5 mr-1 text-emerald-400" />
        Export Paper
      </DialogTrigger>
      <DialogContent className="max-w-xl bg-neutral-900 border-neutral-800 text-neutral-200">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold flex items-center gap-2">
            <FileDown className="w-4 h-4 text-emerald-400" />
            Export Paper as Markdown ({citationFormat.toUpperCase()} citations)
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2 text-xs">
          <p className="text-neutral-400">
            {approved.length} of {outline.sections.length} sections approved.
            {approved.length === 0 && ' (Exporting all sections as draft).'}
          </p>
          <label className="flex items-center gap-2 text-neutral-300">
            Citation format
            <select
              value={citationFormat}
              onChange={(e) => setCitationFormat(e.target.value as 'apa' | 'ieee')}
              className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-xs text-neutral-200"
            >
              <option value="apa">APA</option>
              <option value="ieee">IEEE</option>
            </select>
          </label>
          <pre className="h-64 overflow-y-auto p-3 bg-neutral-950 rounded border border-neutral-800 text-[11px] text-neutral-300 font-mono whitespace-pre-wrap">
            {markdownContent}
          </pre>
        </div>
        <DialogFooter className="flex justify-end gap-2">
          <Button size="sm" onClick={handleDownload} className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700">
            {copied ? <CheckCircle className="w-3.5 h-3.5 mr-1" /> : <Download className="w-3.5 h-3.5 mr-1" />}
            {copied ? 'Downloaded' : 'Download .md File'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
