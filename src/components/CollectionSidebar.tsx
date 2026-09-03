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
import { Bookmark, Star, Trash2, BarChart2, Sparkles, Loader2, ChevronDown, Square, CheckSquare } from 'lucide-react';

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
    <p>
      <span className="text-neutral-500">{label}: </span>
      <span className={missing ? 'italic text-neutral-600' : 'text-neutral-300'}>
        {missing ? 'not stated' : value}
      </span>
    </p>
  );
}

function FindingsList({ label, items }: { label: string; items?: string[] }) {
  const usable = (items || []).filter(i => i && i !== NOT_STATED);
  if (usable.length === 0) return <FindingsRow label={label} value="" />;
  return (
    <div>
      <span className="text-neutral-500">{label}:</span>
      <ul className="list-disc pl-3.5 mt-0.5 space-y-0.5">
        {usable.map((item, i) => (
          <li key={i} className="text-neutral-300">{item}</li>
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

  // Reset compare state when switching collections
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
      setCompareError(`Extract findings for ${unanalyzedSelected.length} selected paper${unanalyzedSelected.length > 1 ? 's' : ''} first — open the paper card and click Extract.`);
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
    <Card className="bg-neutral-900 border-neutral-800 flex flex-col h-full">
      <CardHeader className="p-3 pb-2 border-b border-neutral-800">
        <div className="flex justify-between items-center">
          <CardTitle className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
            <Bookmark className="w-3.5 h-3.5 text-blue-400" />
            {collections.length > 1 ? (
              <select
                aria-label="Active collection"
                value={activeCollection?.id || ''}
                onChange={(e) => handleCollectionChange(e.target.value)}
                className="bg-transparent text-xs text-neutral-200 outline-none max-w-[150px]"
              >
                {collections.map(collection => <option key={collection.id} value={collection.id}>{collection.name}</option>)}
              </select>
            ) : <span>{activeCollection?.name || 'Collection'}</span>}
          </CardTitle>
          <Badge variant="outline" className="text-[10px] border-neutral-700 text-neutral-400">
            {activeCollection?.papers.length || 0} papers
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-2 flex-1 overflow-hidden flex flex-col">
        {activeCollection && activeCollection.papers.length >= 2 && (
          <div className="mb-2 shrink-0">
            <div className="flex items-center gap-2">
              <Button
                size="sm" variant="outline" onClick={handleCompare}
                disabled={selectedIds.size < 2 || comparing}
                className="h-6 px-2 text-[10px] border-neutral-700"
              >
                {comparing ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <BarChart2 className="w-3 h-3 mr-1 text-blue-400" />}
                {comparing ? 'Comparing…' : `Compare${selectedIds.size ? ` (${selectedIds.size})` : ''}`}
              </Button>
              <span className="text-[10px] text-neutral-500">
                {selectedIds.size < 2 ? 'Select 2–5 papers to compare' : `${selectedIds.size} of ${MAX_COMPARE} max selected`}
              </span>
            </div>
            {compareError && <p className="text-[10px] text-rose-400 mt-1">{compareError}</p>}
          </div>
        )}
        <ScrollArea className="flex-1">
          {!activeCollection || activeCollection.papers.length === 0 ? (
            <div className="text-center p-4 text-xs text-neutral-500">
              No saved papers in collection.
            </div>
          ) : (
            <div className="space-y-2">
              {activeCollection.papers.map((paper) => (
                <div
                  key={paper.id}
                  className={`p-2.5 bg-neutral-950 border rounded text-xs space-y-1.5 ${
                    selectedIds.has(paper.id) ? 'border-blue-800' : 'border-neutral-800/80'
                  }`}
                >
                  <div className="flex justify-between items-start gap-1">
                    <div className="flex items-start gap-1.5 min-w-0">
                      <button
                        onClick={() => toggleSelect(paper.id)}
                        aria-label={selectedIds.has(paper.id) ? 'Deselect paper' : 'Select paper for comparison'}
                        className="mt-0.5 text-blue-400 hover:text-blue-300 shrink-0"
                      >
                        {selectedIds.has(paper.id)
                          ? <CheckSquare className="w-3.5 h-3.5" />
                          : <Square className="w-3.5 h-3.5" />}
                      </button>
                      <span className="font-medium text-neutral-200 line-clamp-2">{paper.title}</span>
                    </div>
                    <Button
                      size="icon" variant="ghost" onClick={() => handleRemovePaper(paper.id)}
                      className="h-5 w-5 text-neutral-500 hover:text-rose-400 shrink-0"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-neutral-400 pl-5">
                    <span>arXiv:{paper.id}</span>
                    <span className="flex items-center text-amber-400">
                      <Star className="w-2.5 h-2.5 fill-amber-400 mr-0.5" />
                      {paper.relevanceRating}/5
                    </span>
                  </div>
                  {paper.userAnnotation && (
                    <div className="text-[10px] text-neutral-400 italic bg-neutral-900/60 p-1.5 rounded">
                      &ldquo;{paper.userAnnotation}&rdquo;
                    </div>
                  )}
                  {paper.extractedFindings ? (
                    <details className="text-[10px] bg-neutral-900/60 p-1.5 rounded group">
                      <summary className="cursor-pointer text-neutral-400 hover:text-neutral-200 flex items-center gap-1 select-none">
                        <ChevronDown className="w-3 h-3 transition-transform group-open:rotate-180" />
                        Extracted findings
                      </summary>
                      <div className="mt-1.5 space-y-1">
                        <FindingsRow label="Question" value={paper.extractedFindings.researchQuestion} />
                        <FindingsRow label="Method" value={paper.extractedFindings.methodology} />
                        <FindingsList label="Key claims" items={paper.extractedFindings.keyClaims} />
                        <FindingsList label="Limitations" items={paper.extractedFindings.limitations} />
                        <FindingsRow label="Conclusion" value={paper.extractedFindings.conclusionSummary} />
                      </div>
                    </details>
                  ) : (
                    <div className="flex items-center justify-between pl-5">
                      <span className="text-[10px] italic text-neutral-600">No findings extracted yet</span>
                      <Button
                        size="sm" variant="ghost" onClick={() => handleExtract(paper.id)}
                        disabled={Boolean(extracting[paper.id])}
                        className="h-5 px-1.5 text-[10px] text-amber-400 hover:text-amber-300"
                      >
                        {extracting[paper.id]
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : <><Sparkles className="w-3 h-3 mr-1" />Extract</>}
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>

      <Dialog open={compareDialogOpen} onOpenChange={setCompareDialogOpen}>
        <DialogContent className="max-w-3xl bg-neutral-900 border-neutral-800 text-neutral-200">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-blue-400" />
              Paper comparison ({comparedTitles.length} papers)
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-[11px]">
              <thead>
                <tr className="text-left text-neutral-500">
                  <th className="py-2 pr-3 font-medium whitespace-nowrap align-top">Dimension</th>
                  {comparedTitles.map((title, i) => (
                    <th key={i} className="py-2 pr-3 font-medium align-top text-neutral-300 w-1/3">
                      <span className="text-neutral-500 font-mono mr-1">[{i + 1}]</span>{title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARE_DIMENSIONS.map(dim => (
                  <tr key={dim} className="border-t border-neutral-800 align-top">
                    <td className="py-2.5 pr-3 text-neutral-500 capitalize whitespace-nowrap">{dim}</td>
                    {selectedPapers.map(p => (
                      <td key={p.id} className="py-2.5 pr-3 text-neutral-300">{cellValue(dim, p.id)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="rounded border border-neutral-800 bg-neutral-950 p-2.5 text-[11px] text-neutral-400">
            <span className="text-blue-400 font-medium">Agent tip: </span>
            for a richer narrative comparison, ask ChatGPT in the browser:
            <code className="block mt-1 text-[10px] text-neutral-300 font-mono">&ldquo;Use compare_papers on the {comparedTitles.length} selected papers and summarize the key trade-offs in prose.&rdquo;</code>
          </div>
          <DialogFooter>
            <Button size="sm" onClick={() => setCompareDialogOpen(false)} className="h-7 text-xs bg-neutral-800 hover:bg-neutral-700">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}