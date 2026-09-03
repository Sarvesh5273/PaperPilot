'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Search, Plus, Check, BookOpen, FolderHeart, Sparkles } from 'lucide-react';
import { Paper } from '@/types';
import { searchPapersAction, addToCollectionAction } from '@/actions/papers';
import { CollectionSidebar } from './CollectionSidebar';
import { useCollections } from '@/hooks/useCollections';

export function ResearchPanel() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Paper[]>([]);
  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({});
  const collections = useCollections();
  const [collectionName, setCollectionName] = useState('');
  const [collectionNameInitialized, setCollectionNameInitialized] = useState(false);
  const [collectionError, setCollectionError] = useState<string | null>(null);

  useEffect(() => {
    if (!collectionNameInitialized && collections[0]?.name) {
      setCollectionName(collections[0].name);
      setCollectionNameInitialized(true);
    }
  }, [collectionNameInitialized, collections]);

  useEffect(() => {
    const handleAgentSearch = (event: Event) => {
      const detail = (event as CustomEvent<{ papers?: Paper[]; query?: string }>).detail;
      if (!detail?.papers) return;
      setResults(detail.papers);
      if (detail.query) setQuery(detail.query);
      setLoading(false);
    };

    window.addEventListener('paperpilot:search-results-changed', handleAgentSearch);
    const handleActiveCollection = (event: Event) => {
      const detail = (event as CustomEvent<{ collectionName?: string }>).detail;
      if (detail?.collectionName) {
        setCollectionName(detail.collectionName);
        setCollectionError(null);
      }
    };
    window.addEventListener('paperpilot:active-collection-changed', handleActiveCollection);
    return () => {
      window.removeEventListener('paperpilot:search-results-changed', handleAgentSearch);
      window.removeEventListener('paperpilot:active-collection-changed', handleActiveCollection);
    };
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await searchPapersAction(query.trim(), 10);
      setResults(res.papers);
    } catch (err) {
      console.error('Search failed', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (paper: Paper) => {
    const targetCollection = collectionName.trim();
    if (!targetCollection) {
      setCollectionError('Enter a collection name before saving a paper.');
      return;
    }

    const savedKey = `${targetCollection.toLowerCase()}::${paper.id}`;
    try {
      const result = await addToCollectionAction(paper.id, targetCollection, '', 3);
      window.dispatchEvent(new CustomEvent('paperpilot:collections-changed'));
      window.dispatchEvent(new CustomEvent('paperpilot:active-collection-changed', {
        detail: { collectionId: result.collectionId, collectionName: targetCollection },
      }));
      setAddedIds((prev) => ({ ...prev, [savedKey]: true }));
    } catch (err) {
      console.error('Failed to add paper', err);
      window.alert(err instanceof Error ? err.message : 'Failed to add paper to collection.');
    }
  };

  return (
    <Card className="flex flex-col h-full bg-card/85 backdrop-blur-md border border-border/80 rounded-2xl shadow-xs overflow-hidden">
      <Tabs defaultValue="search" className="flex flex-col h-full">
        <div className="p-2.5 border-b border-border/70 bg-muted/40 shrink-0">
          <TabsList className="w-full grid grid-cols-2 bg-muted/80 p-1 rounded-xl border border-border/50 h-9">
            <TabsTrigger
              value="search"
              className="text-xs font-semibold rounded-lg data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs flex items-center justify-center gap-1.5 transition-all"
            >
              <Search className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>arXiv Search</span>
            </TabsTrigger>
            <TabsTrigger
              value="collection"
              className="text-xs font-semibold rounded-lg data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs flex items-center justify-center gap-1.5 transition-all"
            >
              <FolderHeart className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
              <span>Collection</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="search" className="flex-1 flex flex-col overflow-hidden m-0 p-3 space-y-2.5 min-h-0">
          <form onSubmit={handleSearch} className="flex gap-2 shrink-0">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search arXiv papers (e.g. WebMCP)..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="bg-background/90 border-border/80 focus-visible:ring-amber-500/30 text-xs h-8.5 pl-8 rounded-xl shadow-2xs"
              />
            </div>
            <Button
              type="submit"
              size="sm"
              disabled={loading}
              className="h-8.5 px-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl shadow-xs font-medium shrink-0"
            >
              {loading ? <Sparkles className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            </Button>
          </form>

          <div className="rounded-xl border border-border/60 bg-accent/30 p-2 text-xs space-y-1 shrink-0">
            <label className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-muted-foreground shrink-0">Save target:</span>
              <Input
                aria-label="Collection name"
                placeholder="Target collection name"
                value={collectionName}
                onChange={(e) => {
                  setCollectionName(e.target.value);
                  setCollectionError(null);
                }}
                className="bg-background/90 border-border/70 text-xs h-7 rounded-lg"
              />
            </label>
            {collectionError ? (
              <p className="text-[10px] font-medium text-rose-500">{collectionError}</p>
            ) : !collectionName.trim() ? (
              <p className="text-[10px] text-muted-foreground">Type a collection name above to enable saving.</p>
            ) : null}
          </div>

          <ScrollArea className="flex-1 rounded-xl border border-border/70 bg-background/50 p-2 min-h-0">
            {loading && (
              <div className="flex flex-col items-center justify-center p-8 text-center space-y-2">
                <Sparkles className="w-5 h-5 text-amber-500 animate-spin" />
                <p className="text-xs font-medium text-muted-foreground">Searching arXiv repository...</p>
              </div>
            )}
            {!loading && results.length === 0 && (
              <div className="flex flex-col items-center justify-center p-8 text-center space-y-2">
                <BookOpen className="w-6 h-6 text-muted-foreground/60" />
                <p className="text-xs font-medium text-foreground">Find Academic Sources</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed max-w-[220px]">
                  Search keywords, paper IDs, or author names on arXiv to discover research.
                </p>
              </div>
            )}
            <div className="space-y-2.5">
              {results.map((paper) => {
                const isSaved = addedIds[`${collectionName.trim().toLowerCase()}::${paper.id}`];
                return (
                  <div
                    key={paper.id}
                    className="p-3 bg-card hover:bg-card/95 border border-border/80 hover:border-amber-500/30 rounded-xl transition-all shadow-2xs space-y-1.5"
                  >
                    <div className="font-editorial font-semibold text-xs text-foreground leading-snug line-clamp-2">
                      {paper.title}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {paper.authors.join(', ')} • {paper.published}
                    </div>
                    <p className="text-[11px] text-muted-foreground/90 line-clamp-3 leading-relaxed">
                      {paper.abstract}
                    </p>
                    <div className="flex justify-between items-center pt-1.5 border-t border-border/50">
                      <span className="text-[10px] text-muted-foreground font-mono bg-muted/60 px-1.5 py-0.5 rounded border border-border/40">
                        arXiv:{paper.id}
                      </span>
                      <Button
                        size="sm"
                        variant={isSaved ? 'outline' : 'secondary'}
                        className={`h-6.5 text-[10px] px-2.5 rounded-lg font-medium transition-all ${
                          isSaved
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                            : 'bg-secondary hover:bg-accent text-secondary-foreground'
                        }`}
                        onClick={() => handleAdd(paper)}
                        disabled={Boolean(isSaved) || !collectionName.trim()}
                      >
                        {isSaved ? (
                          <>
                            <Check className="w-3 h-3 mr-1 text-emerald-600 dark:text-emerald-400" /> Saved
                          </>
                        ) : (
                          <>
                            <Plus className="w-3 h-3 mr-1 text-amber-600 dark:text-amber-400" /> Add to Collection
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="collection" className="flex-1 overflow-hidden m-0 p-3 min-h-0">
          <CollectionSidebar />
        </TabsContent>
      </Tabs>
    </Card>
  );
}
