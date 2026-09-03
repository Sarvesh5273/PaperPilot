'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { PaperOutline, PaperSection } from '@/types';
import { draftSectionAction, verifyClaimAction, suggestTransitionAction } from '@/actions/writing';
import { saveOutlines, loadOutlines, loadCollections } from '@/lib/storage';
import { formatInTextCitation, formatAPACitation } from '@/lib/citations';
import { ProvenanceBadge } from './ProvenanceBadge';
import { CitationPicker } from './CitationPicker';
import { Sparkles, Check, ShieldCheck, ArrowRight, Loader2, PencilLine } from 'lucide-react';

interface SectionCardProps {
  outline: PaperOutline;
  section: PaperSection;
  nextSectionId?: string;
}

export function SectionCard({ outline, section, nextSectionId }: SectionCardProps) {
  const [tab, setTab] = useState<'draft' | 'edit' | 'preview'>('edit');
  const [verifyMsg, setVerifyMsg] = useState<string | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);

  const updateText = (text: string) => {
    const outlines = loadOutlines();
    const curSec = outlines.find(o => o.id === outline.id)?.sections.find(s => s.id === section.id);
    if (curSec) {
      curSec.humanEdit = text;
      if (curSec.status === 'draft') curSec.status = 'editing';
      saveOutlines(outlines);
    }
  };

  const handleInsertCitation = (paperId: string) => {
    const placeholder = `{{${paperId}}}`;
    updateText(section.humanEdit ? `${section.humanEdit} ${placeholder}` : placeholder);
    const outlines = loadOutlines();
    const curSec = outlines.find(o => o.id === outline.id)?.sections.find(s => s.id === section.id);
    const paper = loadCollections().flatMap(c => c.papers).find(p => p.id === paperId);
    if (curSec && paper && !curSec.citations.some(c => c.paperId === paperId)) {
      curSec.citations.push({ paperId, placeholder, formatted: formatAPACitation(paper) });
      saveOutlines(outlines);
    }
  };

  const handleVerify = async () => {
    const paperId = section.citations[0]?.paperId;
    if (!paperId) return setVerifyMsg('⚠️ No paper cited yet to verify against.');
    const res = await verifyClaimAction(outline.id, section.id, section.humanEdit.slice(0, 200), paperId);
    setVerifyMsg(`${res.verified ? '✅' : '⚠️'} [${res.confidence.toUpperCase()}] ${res.evidence}`);
  };

  const handleDraft = async () => {
    setDrafting(true);
    setDraftError(null);
    try {
      await draftSectionAction(outline.id, section.id, 'academic');
      setTab('draft');
    } catch (error) {
      setDraftError(error instanceof Error ? error.message : 'Could not draft this section.');
    } finally {
      setDrafting(false);
    }
  };

  const handleTransition = async () => {
    if (!nextSectionId) return;
    const res = await suggestTransitionAction(outline.id, section.id, nextSectionId);
    updateText(`${section.humanEdit}\n\n${res.transitionText}`);
  };

  const handleApprove = () => {
    const outlines = loadOutlines();
    const curSec = outlines.find(o => o.id === outline.id)?.sections.find(s => s.id === section.id);
    if (curSec) {
      curSec.status = curSec.status === 'approved' ? 'editing' : 'approved';
      saveOutlines(outlines);
    }
  };

  const allPapers = loadCollections().flatMap(c => c.papers);
  const normalizeCitationPunctuation = (text: string) => text.replace(/\(\(([^()]+,\s*\d{4})\)\)/g, '($1)');
  const editableText = normalizeCitationPunctuation(section.humanEdit);
  const previewText = normalizeCitationPunctuation((section.humanEdit || section.agentDraft || '').replace(/\{\{([^}]+)\}\}/g, (m, id) => {
    const p = allPapers.find(paper => paper.id === id);
    return p ? formatInTextCitation(p.authors, p.published.split('-')[0]) : m;
  }));

  return (
    <Card className="bg-neutral-900 border-neutral-800 flex flex-col space-y-3 p-4">
      <CardHeader className="p-0 pb-2 flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-sm font-semibold text-neutral-200">{section.title}</CardTitle>
          <div className="flex items-center gap-2 mt-1">
            <ProvenanceBadge section={section} />
            <Badge variant="outline" className={`text-[10px] ${section.status === 'approved' ? 'text-emerald-400 border-emerald-800' : 'text-neutral-400 border-neutral-800'}`}>
              {section.status.toUpperCase()}
            </Badge>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <Button size="sm" variant="outline" onClick={handleDraft} disabled={drafting} className="h-7 text-xs border-neutral-700">
            {drafting ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1 text-amber-400" />}
            {drafting ? 'Drafting...' : 'Draft'}
          </Button>
          <Button size="sm" variant={section.status === 'approved' ? 'default' : 'secondary'} onClick={handleApprove} className="h-7 text-xs">
            <Check className="w-3 h-3 mr-1" /> {section.status === 'approved' ? 'Approved' : 'Approve'}
          </Button>
        </div>
      </CardHeader>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-neutral-800 bg-neutral-950/60 px-2.5 py-2">
        <p className="text-[11px] text-neutral-400 flex items-center gap-1.5">
          <PencilLine className="h-3.5 w-3.5 text-blue-400" /> Review the source draft, then make this section your own.
        </p>
        <CitationPicker onSelect={handleInsertCitation} />
      </div>

      <CardContent className="p-0 flex-1 flex flex-col space-y-2">
        <Tabs value={tab} onValueChange={(v) => setTab(v as 'draft' | 'edit' | 'preview')} className="flex flex-col flex-1">
          <TabsList className="bg-neutral-950 grid grid-cols-3 h-8">
            <TabsTrigger value="draft" className="text-xs">Source Draft</TabsTrigger>
            <TabsTrigger value="edit" className="text-xs">Write & Edit</TabsTrigger>
            <TabsTrigger value="preview" className="text-xs">Reading View</TabsTrigger>
          </TabsList>
          <TabsContent value="draft" className="m-0 pt-2 text-xs leading-relaxed text-neutral-300 min-h-[160px] max-h-[220px] overflow-y-auto">
            {!section.agentDraft ? <div className="text-neutral-500 italic space-y-1"><p>No source draft generated yet.</p><p className="not-italic text-[10px]">Click Draft to create a research-grounded starting point from the collection.</p></div> :
              section.agentDraft.split(/(\{\{[^}]+\}\})/).map((chunk, i) => chunk.startsWith('{{') ?
                <span key={i} className="bg-amber-500/20 text-amber-300 font-mono px-1 py-0.5 rounded">{chunk}</span> :
                <span key={i}>{chunk}</span>
              )}
          </TabsContent>
          <TabsContent value="edit" className="m-0 pt-2 flex flex-col space-y-1">
            <Textarea
              value={editableText}
              onChange={(e) => updateText(e.target.value)}
              placeholder="Write, revise, and shape this section here..."
              className="min-h-[260px] max-h-[420px] bg-neutral-950 border-neutral-800 text-sm leading-relaxed text-neutral-200 resize-y"
            />
            <div className="text-[10px] text-neutral-500 text-right">{editableText.length} chars | {editableText.trim().split(/\s+/).filter(Boolean).length} words</div>
          </TabsContent>
          <TabsContent value="preview" className="m-0 pt-2 text-xs leading-relaxed text-neutral-200 min-h-[160px] max-h-[220px] overflow-y-auto whitespace-pre-wrap">
            {previewText || <span className="text-neutral-500 italic">Your edited section will appear here as a clean reading view.</span>}
          </TabsContent>
        </Tabs>

        {draftError && <p className="text-[10px] text-rose-400">{draftError}</p>}

        <div className="flex items-center justify-between pt-2 border-t border-neutral-800 text-[11px]">
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={handleVerify} className="h-6 px-2 text-[10px] text-neutral-300 hover:text-white">
              <ShieldCheck className="w-3 h-3 mr-1 text-emerald-400" /> Verify Claim
            </Button>
            {nextSectionId && (
              <Button size="sm" variant="ghost" onClick={handleTransition} className="h-6 px-2 text-[10px] text-neutral-300 hover:text-white">
                <ArrowRight className="w-3 h-3 mr-1 text-blue-400" /> Suggest Transition
              </Button>
            )}
          </div>
          {verifyMsg && <span className="text-[10px] text-neutral-400 italic">{verifyMsg}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
