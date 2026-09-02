'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Search, Plus, Check } from 'lucide-react';
import { Paper } from '@/types';
import { searchPapersAction, addToCollectionAction } from '@/actions/papers';
import { CollectionSidebar } from './CollectionSidebar';

export function ResearchPanel() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Paper[]>([]);
  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({});

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
    try {
      await addToCollectionAction(paper.id, 'WebMCP Security', '', 3);
      window.dispatchEvent(new CustomEvent('paperpilot:collections-changed'));
      setAddedIds((prev) => ({ ...prev, [paper.id]: true }));
    } catch (err) {
      console.error('Failed to add paper', err);
      window.alert(err instanceof Error ? err.message : 'Failed to add paper to collection.');
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Tabs defaultValue="search" className="flex flex-col h-full">
        <div className="px-2 pt-1 pb-2 border-b border-neutral-800">
          <TabsList className="w-full grid grid-cols-2 bg-neutral-900">
            <TabsTrigger value="search" className="text-xs">arXiv Search</TabsTrigger>
            <TabsTrigger value="collection" className="text-xs">Collection</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="search" className="flex-1 flex flex-col overflow-hidden m-0 p-2 space-y-2">
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              placeholder="Search arXiv (e.g. WebMCP)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="bg-neutral-950 border-neutral-800 text-xs h-8"
            />
            <Button type="submit" size="sm" disabled={loading} className="h-8 px-3">
              <Search className="w-3.5 h-3.5" />
            </Button>
          </form>

          <ScrollArea className="flex-1 overflow-y-auto max-h-[70vh] rounded border border-neutral-800 bg-neutral-900/50 p-2">
            {loading && <div className="text-center p-4 text-xs text-neutral-400">Searching arXiv...</div>}
            {!loading && results.length === 0 && (
              <div className="text-center p-4 text-xs text-neutral-500">
                Enter keywords above to search arXiv papers.
              </div>
            )}
            <div className="space-y-2">
              {results.map((paper) => (
                <Card key={paper.id} className="bg-neutral-950 border-neutral-800/80 p-2.5 text-xs space-y-1.5">
                  <div className="font-medium text-neutral-200 line-clamp-2">{paper.title}</div>
                  <div className="text-[10px] text-neutral-400">{paper.authors.join(', ')} • {paper.published}</div>
                  <p className="text-[11px] text-neutral-400 line-clamp-3 leading-relaxed">{paper.abstract}</p>
                  <div className="flex justify-between items-center pt-1 border-t border-neutral-900">
                    <span className="text-[10px] text-neutral-500 font-mono">arXiv:{paper.id}</span>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-6 text-[10px] px-2"
                      onClick={() => handleAdd(paper)}
                      disabled={addedIds[paper.id]}
                    >
                      {addedIds[paper.id] ? (
                        <><Check className="w-3 h-3 mr-1 text-emerald-400" /> Saved</>
                      ) : (
                        <><Plus className="w-3 h-3 mr-1" /> Add to Collection</>
                      )}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="collection" className="flex-1 overflow-hidden m-0 p-2">
          <CollectionSidebar />
        </TabsContent>
      </Tabs>
    </div>
  );
}
