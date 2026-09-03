'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useOutlines } from '@/hooks/useOutline';
import { useCollections } from '@/hooks/useCollections';
import { generateOutlineAction } from '@/actions/writing';
import { SectionCard } from './SectionCard';
import { ExportDialog } from './ExportDialog';
import { FileText, PlusCircle, CheckCircle, Clock, Library, ArrowRight, Loader2, Check, X, Sparkles } from 'lucide-react';
import { loadOutlines, saveOutlines } from '@/lib/storage';

type PaperType = 'literature_review' | 'research_article' | 'thesis_chapter';

const PAPER_TYPE_LABELS: Record<PaperType, string> = {
  literature_review: 'Literature review',
  research_article: 'Research article',
  thesis_chapter: 'Thesis chapter',
};

export function EditorPanel() {
  const outlines = useOutlines();
  const collections = useCollections();
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [paperType, setPaperType] = useState<PaperType>('literature_review');

  useEffect(() => {
    if (!activeCollectionId || !collections.some((collection) => collection.id === activeCollectionId)) {
      setActiveCollectionId(collections[0]?.id || null);
    }
  }, [activeCollectionId, collections]);

  useEffect(() => {
    const handleActiveCollection = (event: Event) => {
      const detail = (event as CustomEvent<{ collectionId?: string }>).detail;
      if (detail?.collectionId) {
        setActiveCollectionId(detail.collectionId);
        setSelectedSectionId(null);
      }
    };
    window.addEventListener('paperpilot:active-collection-changed', handleActiveCollection);
    return () => window.removeEventListener('paperpilot:active-collection-changed', handleActiveCollection);
  }, []);

  const activeCollection = collections.find((collection) => collection.id === activeCollectionId) || collections[0];
  const activeOutline = activeCollection
    ? outlines.find((outline) => outline.collectionId === activeCollection.id)
    : outlines[0];
  const activeSection =
    activeOutline?.sections.find((s) => s.id === selectedSectionId) ||
    activeOutline?.sections[0];
  const hasSourcePapers = Boolean(activeCollection?.papers.length);

  const paperCount = activeCollection?.papers.length || 0;
  const analyzedCount = activeCollection?.papers.filter(p => p.extractedFindings).length || 0;
  const currentStep = paperCount === 0 ? 1 : analyzedCount < paperCount ? 2 : 3;

  const handleGenerateOutline = async () => {
    const colId = activeCollection?.id;
    if (!colId) return;
    setGenerating(true);
    setGenerationError(null);
    try {
      const outline = await generateOutlineAction(colId, paperType);
      setSelectedSectionId(outline.sections[0]?.id || null);
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : 'Could not generate the outline.');
    } finally {
      setGenerating(false);
    }
  };

  const handleCloseOutline = () => {
    if (!activeOutline) return;
    const remaining = loadOutlines().filter(o => o.id !== activeOutline.id);
    saveOutlines(remaining);
    setSelectedSectionId(null);
    window.dispatchEvent(new CustomEvent('paperpilot:outlines-changed'));
  };

  const getStatusIcon = (status: string) => {
    if (status === 'approved') return <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />;
    if (status === 'editing') return <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />;
    return <span className="w-2 h-2 rounded-full bg-muted-foreground/40 shrink-0" />;
  };

  const activeIndex = activeOutline?.sections.findIndex((s) => s.id === activeSection?.id) ?? -1;
  const nextSectionId = activeIndex >= 0 && activeOutline && activeIndex < activeOutline.sections.length - 1
    ? activeOutline.sections[activeIndex + 1].id
    : undefined;

  const approvedCount = activeOutline?.sections.filter(s => s.status === 'approved').length || 0;
  const totalCount = activeOutline?.sections.length || 0;
  const progressPercent = totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0;

  return (
    <div className="flex flex-col h-full space-y-3 overflow-hidden">
      <Card className="bg-card/85 backdrop-blur-md border border-border/80 rounded-2xl shadow-xs shrink-0 overflow-hidden">
        <CardHeader className="p-3.5 pb-2.5 flex flex-row items-center justify-between space-y-0 border-b border-border/60">
          <CardTitle className="font-editorial text-sm font-bold text-foreground flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span className="truncate max-w-[280px]">
              {activeOutline?.title || `${activeCollection?.name || 'Paper'} workspace`}
            </span>
          </CardTitle>
          <div className="flex items-center gap-2">
            <ExportDialog outline={activeOutline} disabled={!activeOutline} />
            {activeOutline ? (
              <Button
                size="sm"
                variant="outline"
                onClick={handleCloseOutline}
                className="h-7 text-xs rounded-lg border-border/80 text-muted-foreground hover:text-rose-500 hover:border-rose-300"
              >
                <X className="w-3.5 h-3.5 mr-1" /> Close outline
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <select
                  aria-label="Paper type"
                  value={paperType}
                  onChange={(e) => setPaperType(e.target.value as PaperType)}
                  className="h-7.5 rounded-lg border border-border/80 bg-background px-2 text-xs font-medium text-foreground outline-none shadow-2xs"
                >
                  {(Object.keys(PAPER_TYPE_LABELS) as PaperType[]).map(t => (
                    <option key={t} value={t}>{PAPER_TYPE_LABELS[t]}</option>
                  ))}
                </select>
                <Button
                  size="sm"
                  onClick={handleGenerateOutline}
                  disabled={generating || !hasSourcePapers}
                  className="h-7.5 text-xs px-3 font-medium bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-lg shadow-xs"
                >
                  {generating ? (
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  )}
                  {generating ? 'Building...' : hasSourcePapers ? 'Generate Outline' : 'Add papers first'}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-3">
          {!activeOutline ? (
            <div className="py-2 px-1 space-y-3.5">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-accent/30 border border-border/60">
                <Library className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <p className="font-editorial text-sm font-bold text-foreground">Turn this collection into a manuscript</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    Save sources, generate an outline, and craft each section with agent assistance grounded in arXiv papers.
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <StepBadge n={1} done={paperCount > 0} current={currentStep === 1} />
                  <div>
                    <p className={`text-xs font-semibold ${paperCount > 0 ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                      Save papers to your collection
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {paperCount > 0 ? `${paperCount} papers ready in “${activeCollection?.name}”` : 'Search arXiv on the left tab to find research papers'}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <StepBadge n={2} done={analyzedCount === paperCount && paperCount > 0} current={currentStep === 2} />
                  <div>
                    <p className={`text-xs font-semibold ${analyzedCount === paperCount && paperCount > 0 ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                      Understand your sources
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {paperCount === 0
                        ? 'Extract research questions, claims, and limitations'
                        : `Findings extracted for ${analyzedCount}/${paperCount} papers — click Extract in the Collection tab`}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <StepBadge n={3} done={false} current={currentStep === 3} />
                  <div>
                    <p className="text-xs font-semibold text-foreground">
                      Build your outline
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Choose a paper type above and click “Generate Outline” to synthesize structured sections.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <StepBadge n={4} done={false} current={false} />
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground/80">
                      Draft, verify, and export
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Review grounded agent drafts, verify claims against citations, polish your prose, and export to Word or Markdown.
                    </p>
                  </div>
                </div>
              </div>
              {generationError && <p className="text-xs font-medium text-rose-500">{generationError}</p>}
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-medium">{activeCollection?.name || 'Collection'} · {activeCollection?.papers.length || 0} source papers</span>
                <span className="font-semibold text-foreground">
                  {approvedCount}/{totalCount} sections approved ({progressPercent}%)
                </span>
              </div>
              <div className="w-full bg-muted/70 h-1.5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-all duration-300 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <ul className="flex flex-wrap gap-1.5 pt-1">
                {activeOutline.sections.map((sec, idx) => {
                  const isSelected = sec.id === activeSection?.id;
                  return (
                    <li key={sec.id}>
                      <button
                        onClick={() => setSelectedSectionId(sec.id)}
                        className={`text-xs px-3 py-1.5 rounded-xl flex items-center gap-2 border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-card border-amber-500/70 text-foreground font-semibold shadow-xs ring-1 ring-amber-500/25'
                            : 'bg-muted/40 border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted/80'
                        }`}
                      >
                        {getStatusIcon(sec.status)}
                        <span>{idx + 1}. {sec.title}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex-1 overflow-y-auto min-h-0">
        {activeOutline && !hasSourcePapers ? (
          <Card className="bg-card/85 backdrop-blur-md border border-border/80 p-8 text-center rounded-2xl shadow-xs">
            <div className="flex flex-col items-center gap-2 max-w-sm mx-auto">
              <Library className="w-8 h-8 text-amber-500" />
              <p className="font-editorial text-base font-bold text-foreground">Waiting for source papers</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Add papers from the arXiv Search tab on the left, then return here to draft research-grounded sections.
              </p>
            </div>
          </Card>
        ) : activeOutline && activeSection ? (
          <SectionCard outline={activeOutline} section={activeSection} nextSectionId={nextSectionId} />
        ) : (
          <Card className="bg-card/85 backdrop-blur-md border border-border/80 p-8 text-center rounded-2xl shadow-xs">
            <div className="flex flex-col items-center gap-2 max-w-sm mx-auto">
              <Sparkles className="w-8 h-8 text-amber-500" />
              <p className="font-editorial text-base font-bold text-foreground">Ready to start writing</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Generate an outline above to begin collaborative drafting and synthesis with your research assistant.
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function StepBadge({ n, done, current }: { n: number; done: boolean; current: boolean }) {
  return (
    <span
      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
        done
          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
          : current
          ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-2xs shadow-orange-500/30 ring-2 ring-amber-500/20'
          : 'bg-muted text-muted-foreground border border-border/70'
      }`}
    >
      {done ? <Check className="w-3 h-3 stroke-[2.5]" /> : n}
    </span>
  );
}