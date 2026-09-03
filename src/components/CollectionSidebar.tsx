'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useCollections } from '@/hooks/useCollections';
import { saveCollections } from '@/lib/storage';
import { comparePapersAction, extractFindingsAction } from '@/actions/papers';
import { Bookmark, Star, Trash2, BarChart2, Sparkles, Loader2, ChevronDown, Square, CheckSquare, MessageSquare } from 'lucide-react';

const COMPARE_DIMENSIONS = ['methodology', 'results', 'limitations'];
const MAX_COMPARE = 5;
const NOT_STATED = 'Not explicitly stated';

interface MatrixCell {
  dimension: string;
  paperId: string;
  value: string;
}

function FindingsRow({ label, value }: { label: string; value: string }) {
  const missing = !value || value === NOT_STATED;
  return (
    <p className="text-[11px] leading-relaxed">
      <span className="font-medium text-muted-foreground">{label}: </span>
      <span className={missing ? 'italic text-muted-foreground/60' : 'text-foreground/90'}>
        {missing ? 'not stated' : value}
      </span>
    </p>
  );
}

function FindingsList({ label, items }: { label: string; items?: string[] }) {
  const usable = (items || []).filter(i => i && i !== NOT_STATED);
  if (usable.length === 0) return <FindingsRow label={label} value="" />;
  return (
    <div className="text-[11px] leading-relaxed">
      <span className="font-medium text-muted-foreground">{label}:</span>
      <ul className="list-disc pl-4 mt-1 space-y-1">
        {usable.map((item, i) => (
          <li key={i} className="text-foreground/90">{item}</li>
        ))}
      </ul>
    </div>
  );
}

export function CollectionSidebar() {
  const collections = useCollections();
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [comparing, setComparing] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);
  const [matrix, setMatrix] = useState<MatrixCell[] | null>(null);
  const [comparedTitles, setComparedTitles] = useState<string[]>([]);
  const [compareDialogOpen, setCompareDialogOpen] = useState(false);
  const [extracting, setExtracting] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const handleActiveCollection = (event: Event) => {
      const detail = (event as CustomEvent<{ collectionId?: string }>).detail;
      if (detail?.collectionId) setActiveCollectionId(detail.collectionId);
    };
    window.addEventListener('paperpilot:active-collection-changed', handleActiveCollection);
    return () => window.removeEventListener('paperpilot:active-collection-changed', handleActiveCollection);
  }, []);

  useEffect(() => {
    if (!activeCollectionId || !collections.some(c => c.id === activeCollectionId)) {
      setActiveCollectionId(collections[0]?.id || null);
    }
  }, [activeCollectionId, collections]);

  const activeCollection = collections.find(c => c.id === activeCollectionId) || collections[0];

  useEffect(() => {
    setSelectedIds(new Set());
    setMatrix(null);
    setCompareError(null);
  }, [activeCollection?.id]);

  const handleCollectionChange = (collectionId: string) => {
    setActiveCollectionId(collectionId);
    const selected = collections.find(c => c.id === collectionId);
    window.dispatchEvent(new CustomEvent('paperpilot:active-collection-changed', {
      detail: { collectionId, collectionName: selected?.name },
    }));
  };

  const handleRemovePaper = (paperId: string) => {
    if (!activeCollection) return;
    const updated = collections.map((col) => {
      if (col.id === activeCollection.id) {
        return { ...col, papers: col.papers.filter((p) => p.id !== paperId) };
      }
      return col;
    });
    saveCollections(updated);
  };

  const toggleSelect = (paperId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(paperId)) {
        next.delete(paperId);
      } else if (next.size < MAX_COMPARE) {
        next.add(paperId);
      }
      return next;
    });
    setMatrix(null);
    setCompareError(null);
  };

  const selectedPapers = activeCollection?.papers.filter(p => selectedIds.has(p.id)) || [];
  const unanalyzedSelected = selectedPapers.filter(p => !p.extractedFindings);

  const handleExtract = async (paperId: string) => {
    setExtracting(prev => ({ ...prev, [paperId]: true }));
    try {
      await extractFindingsAction(paperId);
      window.dispatchEvent(new CustomEvent('paperpilot:collections-changed'));
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Failed to extract findings.');
    } finally {
      setExtracting(prev => ({ ...prev, [paperId]: false }));
    }
  };

  const handleCompare = async () => {
    if (selectedIds.size < 2) return;
    if (unanalyzedSelected.length > 0) {
      setCompareError(`Extract findings for ${unanalyzedSelected.length} selected paper${unanalyzedSelected.length > 1 ? 's' : ''} first.`);
      return;
    }
    setComparing(true);
    setCompareError(null);
    try {
      const result = await comparePapersAction(Array.from(selectedIds), COMPARE_DIMENSIONS);
      setMatrix(result.comparisonMatrix);
      setComparedTitles(selectedPapers.map(p => p.title));
      setCompareDialogOpen(true);
    } catch (err) {
      setCompareError(err instanceof Error ? err.message : 'Comparison failed.');
      setMatrix(null);
    } finally {
      setComparing(false);
    }
  };

  const cellValue = (dim: string, paperId: string) =>
    matrix?.find(c => c.dimension === dim && c.paperId === paperId)?.value || NOT_STATED;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="pb-2.5 mb-2.5 border-b border-border/70 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Bookmark className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          {collections.length > 1 ? (
            <select
              aria-label="Active collection"
              value={activeCollection?.id || ''}
              onChange={(e) => handleCollectionChange(e.target.value)}
              className="bg-muted/50 border border-border/60 text-xs font-semibold text-foreground rounded-lg px-2 py-1 outline-none max-w-[170px]"
            >
              {collections.map(col => <option key={col.id} value={col.id}>{col.name}</option>)}
            </select>
          ) : (
            <span className="font-editorial font-bold text-sm text-foreground truncate">
              {activeCollection?.name || 'Collection'}
            </span>
          )}
        </div>
        <Badge variant="outline" className="border-border bg-muted/60 text-[10px] text-muted-foreground font-mono">
          {activeCollection?.papers.length || 0} papers
        </Badge>
      </div>

      {activeCollection && activeCollection.papers.length >= 2 && (
        <div className="mb-2.5 p-2 rounded-xl bg-accent/30 border border-border/60 shrink-0 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleCompare}
              disabled={selectedIds.size < 2 || comparing}
              className="h-7 px-2.5 text-xs rounded-lg font-medium border-border/80 bg-background hover:bg-accent gap-1.5"
            >
              {comparing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
              ) : (
                <BarChart2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              )}
              <span>{comparing ? 'Comparing…' : `Compare${selectedIds.size ? ` (${selectedIds.size})` : ''}`}</span>
            </Button>
            <span className="text-[10px] text-muted-foreground">
              {selectedIds.size < 2 ? 'Select 2–5 papers' : `${selectedIds.size} / ${MAX_COMPARE} selected`}
            </span>
          </div>
          {compareError && <p className="text-[10px] text-rose-500 font-medium">{compareError}</p>}
        </div>
      )}

      <ScrollArea className="flex-1 pr-1 min-h-0">
        {!activeCollection || activeCollection.papers.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center space-y-2">
            <Bookmark className="w-6 h-6 text-muted-foreground/60" />
            <p className="text-xs font-medium text-foreground">No papers saved yet</p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Use the arXiv Search tab to add papers to this collection.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {activeCollection.papers.map((paper) => {
              const isSelected = selectedIds.has(paper.id);
              return (
                <div
                  key={paper.id}
                  className={`p-3 rounded-xl border transition-all shadow-2xs space-y-2 ${
                    isSelected
                      ? 'border-amber-500/70 bg-amber-500/5 ring-1 ring-amber-500/20'
                      : 'border-border/80 bg-card hover:border-border'
                  }`}
                >
                  <div className="flex justify-between items-start gap-1.5">
                    <div className="flex items-start gap-2 min-w-0">
                      <button
                        onClick={() => toggleSelect(paper.id)}
                        aria-label={isSelected ? 'Deselect paper' : 'Select paper for comparison'}
                        className="mt-0.5 text-amber-600 dark:text-amber-400 hover:text-amber-700 shrink-0 cursor-pointer"
                      >
                        {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                      </button>
                      <span className="font-editorial font-semibold text-xs leading-snug text-foreground line-clamp-2">
                        {paper.title}
                      </span>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleRemovePaper(paper.id)}
                      className="h-6 w-6 text-muted-foreground hover:text-rose-500 shrink-0 rounded-md"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-muted-foreground pl-6">
                    <span className="font-mono">arXiv:{paper.id}</span>
                    <span className="flex items-center text-amber-600 dark:text-amber-400 font-medium">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-500 mr-1" />
                      {paper.relevanceRating}/5
                    </span>
                  </div>

                  {paper.userAnnotation && (
                    <div className="text-[11px] text-foreground/80 italic bg-amber-500/10 border-l-2 border-amber-500 p-2 rounded-r-lg ml-6">
                      &ldquo;{paper.userAnnotation}&rdquo;
                    </div>
                  )}

                  {paper.extractedFindings ? (
                    <details className="text-[11px] bg-muted/40 border border-border/60 p-2 rounded-lg ml-6 group">
                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground font-medium flex items-center gap-1.5 select-none text-[10px]">
                        <ChevronDown className="w-3 h-3 transition-transform group-open:rotate-180 text-amber-600" />
                        <span>Extracted findings &amp; claims</span>
                      </summary>
                      <div className="mt-2 space-y-1.5 pt-1.5 border-t border-border/40">
                        <FindingsRow label="Question" value={paper.extractedFindings.researchQuestion} />
                        <FindingsRow label="Method" value={paper.extractedFindings.methodology} />
                        <FindingsList label="Key claims" items={paper.extractedFindings.keyClaims} />
                        <FindingsList label="Limitations" items={paper.extractedFindings.limitations} />
                        <FindingsRow label="Conclusion" value={paper.extractedFindings.conclusionSummary} />
                      </div>
                    </details>
                  ) : (
                    <div className="flex items-center justify-between pl-6 pt-1">
                      <span className="text-[10px] italic text-muted-foreground">Findings not extracted</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleExtract(paper.id)}
                        disabled={Boolean(extracting[paper.id])}
                        className="h-6 px-2 text-[10px] font-medium rounded-lg text-amber-700 dark:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30"
                      >
                        {extracting[paper.id] ? (
                          <Loader2 className="w-3 h-3 animate-spin mr-1" />
                        ) : (
                          <Sparkles className="w-3 h-3 mr-1 text-amber-600" />
                        )}
                        <span>Extract</span>
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      <Dialog open={compareDialogOpen} onOpenChange={setCompareDialogOpen}>
        <DialogContent className="w-[95vw] sm:max-w-4xl max-h-[88vh] flex flex-col bg-card border-border/80 text-foreground rounded-2xl shadow-xl overflow-hidden p-4 sm:p-5">
          <DialogHeader className="shrink-0 pb-2 border-b border-border/60">
            <DialogTitle className="font-editorial text-base sm:text-lg font-bold flex items-center gap-2 text-foreground">
              <BarChart2 className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>Comparative Analysis ({comparedTitles.length} papers)</span>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto rounded-xl border border-border/70 my-2 min-h-0">
            <table className="w-full min-w-[500px] text-xs">
              <thead className="sticky top-0 z-10">
                <tr className="bg-muted/95 backdrop-blur-xs text-muted-foreground border-b border-border/70">
                  <th className="py-2.5 px-3 font-semibold whitespace-nowrap text-left w-24 sm:w-28 uppercase text-[10px] tracking-wider bg-muted">
                    Dimension
                  </th>
                  {comparedTitles.map((title, i) => (
                    <th key={i} className="py-2.5 px-3 font-semibold text-left text-foreground bg-muted min-w-[150px] sm:min-w-[190px]">
                      <span className="text-amber-600 dark:text-amber-400 font-mono mr-1">[{i + 1}]</span>
                      <span className="font-editorial line-clamp-2">{title}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {COMPARE_DIMENSIONS.map((dim, idx) => (
                  <tr key={dim} className={idx % 2 === 0 ? 'bg-background/40' : 'bg-muted/20'}>
                    <td className="py-3 px-3 font-semibold text-muted-foreground capitalize text-[11px] align-top whitespace-nowrap">
                      {dim}
                    </td>
                    {selectedPapers.map(p => (
                      <td key={p.id} className="py-3 px-3 text-foreground/90 text-[11px] leading-relaxed align-top">
                        {cellValue(dim, p.id)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="shrink-0 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-foreground/90 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <span className="font-semibold text-amber-800 dark:text-amber-300">Agent Co-Pilot Tip: </span>
              <span className="text-muted-foreground">Ask ChatGPT in the browser:</span>
              <code className="block mt-1.5 font-mono text-[11px] bg-background/90 p-2 rounded-lg border border-border/70 text-foreground break-words whitespace-normal select-all leading-relaxed shadow-2xs">
                &ldquo;Use compare_papers on the {comparedTitles.length} selected papers and summarize key trade-offs in prose.&rdquo;
              </code>
            </div>
          </div>
          <DialogFooter className="shrink-0 pt-2 border-t border-border/60">
            <Button
              size="sm"
              onClick={() => setCompareDialogOpen(false)}
              className="h-8 text-xs font-medium rounded-xl bg-secondary hover:bg-accent text-secondary-foreground"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}