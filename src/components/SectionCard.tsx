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
import { Sparkles, Check, ShieldCheck, ArrowRight, Loader2, PencilLine, Eye, FileEdit } from 'lucide-react';

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
    if (!paperId) return setVerifyMsg('⚠️ No paper cited yet in this section to verify against.');
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

  const wordCount = editableText.trim().split(/\s+/).filter(Boolean).length;
  const charCount = editableText.length;

  return (
    <Card className="bg-card/90 backdrop-blur-md border border-border/80 rounded-2xl shadow-sm flex flex-col space-y-3.5 p-4">
      <CardHeader className="p-0 pb-2.5 flex flex-row items-center justify-between space-y-0 border-b border-border/60">
        <div>
          <CardTitle className="font-editorial text-base font-bold text-foreground">
            {section.title}
          </CardTitle>
          <div className="flex items-center gap-2 mt-1">
            <ProvenanceBadge section={section} />
            <Badge
              variant="outline"
              className={`text-[10px] font-semibold tracking-wide px-2.5 py-0.5 rounded-full ${
                section.status === 'approved'
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                  : section.status === 'editing'
                  ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30'
                  : 'bg-muted text-muted-foreground border-border/70'
              }`}
            >
              {section.status.toUpperCase()}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleDraft}
            disabled={drafting}
            className="h-8 px-3 text-xs rounded-xl font-medium border-border/80 bg-background hover:bg-accent gap-1.5"
          >
            {drafting ? <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" /> : <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />}
            <span>{drafting ? 'Drafting...' : 'Draft'}</span>
          </Button>
          <Button
            size="sm"
            onClick={handleApprove}
            className={`h-8 px-3.5 text-xs rounded-xl font-medium shadow-xs transition-all ${
              section.status === 'approved'
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white'
            }`}
          >
            <Check className="w-3.5 h-3.5 mr-1.5 stroke-[2.5]" />
            <span>{section.status === 'approved' ? 'Approved' : 'Approve'}</span>
          </Button>
        </div>
      </CardHeader>

      <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-border/70 bg-accent/30 px-3 py-2">
        <p className="text-xs font-medium text-foreground/80 flex items-center gap-1.5">
          <PencilLine className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>Review agent drafts, insert citations, and refine your section.</span>
        </p>
        <CitationPicker onSelect={handleInsertCitation} />
      </div>

      <CardContent className="p-0 flex-1 flex flex-col space-y-2.5">
        <Tabs value={tab} onValueChange={(v) => setTab(v as 'draft' | 'edit' | 'preview')} className="flex flex-col flex-1">
          <TabsList className="bg-muted/80 p-1 rounded-xl border border-border/50 grid grid-cols-3 h-9">
            <TabsTrigger
              value="draft"
              className="text-xs font-semibold rounded-lg data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Source Draft</span>
            </TabsTrigger>
            <TabsTrigger
              value="edit"
              className="text-xs font-semibold rounded-lg data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs flex items-center justify-center gap-1.5"
            >
              <FileEdit className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
              <span>Write &amp; Edit</span>
            </TabsTrigger>
            <TabsTrigger
              value="preview"
              className="text-xs font-semibold rounded-lg data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs flex items-center justify-center gap-1.5"
            >
              <Eye className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Reading View</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="draft"
            className="m-0 pt-2 text-xs leading-relaxed text-foreground/90 font-editorial min-h-[180px] max-h-[260px] overflow-y-auto p-3.5 rounded-xl border border-border/70 bg-muted/20"
          >
            {!section.agentDraft ? (
              <div className="text-muted-foreground italic space-y-1.5 py-4 text-center font-sans">
                <p className="font-medium text-xs">No source draft generated yet.</p>
                <p className="not-italic text-[11px]">
                  Click <strong className="text-foreground">Draft</strong> above to create an academic starting point synthesized from the collection.
                </p>
              </div>
            ) : (
              <div className="space-y-2 whitespace-pre-wrap">
                {section.agentDraft.split(/(\{\{[^}]+\}\})/).map((chunk, i) =>
                  chunk.startsWith('{{') ? (
                    <span
                      key={i}
                      className="bg-amber-500/15 text-amber-800 dark:text-amber-300 font-mono px-1.5 py-0.5 rounded border border-amber-500/30 text-[11px] font-semibold"
                    >
                      {chunk}
                    </span>
                  ) : (
                    <span key={i}>{chunk}</span>
                  )
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="edit" className="m-0 pt-2 flex flex-col space-y-1.5">
            <Textarea
              value={editableText}
              onChange={(e) => updateText(e.target.value)}
              placeholder="Write, revise, and shape this section here..."
              className="min-h-[270px] max-h-[420px] bg-background border-border/80 focus-visible:ring-amber-500/30 text-sm leading-relaxed text-foreground rounded-xl p-3.5 shadow-2xs font-sans resize-y"
            />
            <div className="text-[11px] font-medium text-muted-foreground text-right pr-1">
              {wordCount} words <span className="text-border mx-1">|</span> {charCount} chars
            </div>
          </TabsContent>

          <TabsContent
            value="preview"
            className="m-0 pt-2 text-sm leading-relaxed text-foreground font-editorial min-h-[180px] max-h-[260px] overflow-y-auto whitespace-pre-wrap p-4 rounded-xl border border-border/70 bg-card shadow-2xs"
          >
            {previewText || (
              <span className="text-muted-foreground italic font-sans text-xs">
                Your edited section will appear here as a formatted academic reading view with resolved citations.
              </span>
            )}
          </TabsContent>
        </Tabs>

        {draftError && <p className="text-xs font-medium text-rose-500">{draftError}</p>}

        <div className="flex flex-wrap items-center justify-between pt-2.5 border-t border-border/60 text-xs">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleVerify}
              className="h-7 px-2.5 text-xs font-medium rounded-lg text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Verify Claim</span>
            </Button>
            {nextSectionId && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleTransition}
                className="h-7 px-2.5 text-xs font-medium rounded-lg text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 gap-1.5"
              >
                <ArrowRight className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Suggest Transition</span>
              </Button>
            )}
          </div>
          {verifyMsg && (
            <span className="text-[11px] font-medium text-foreground/80 bg-accent/40 px-2.5 py-1 rounded-lg border border-border/60 max-w-sm truncate">
              {verifyMsg}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
