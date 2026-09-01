'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Plus, BookmarkCheck } from 'lucide-react';
import { Paper } from '@/types';
import { searchArxiv } from '@/lib/arxiv';
import { useCollections } from '@/hooks/useCollections';
import { saveCollections } from '@/lib/storage';

export function ResearchPanel() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Paper[]>([]);
  const collections = useCollections();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      const papers = await searchArxiv(query, 10);
      setResults(papers);
    } catch (err) {
      console.error('Search failed', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCollection = (paper: Paper) => {
    const current = [...collections];
    let target = current.find(c => c.name === 'Default') || current[0];
    if (!target) {
      target = { id: `col-${Date.now()}`, name: 'Default', papers: [], createdAt: new Date().toISOString() };
      current.push(target);
    }
    if (!target.papers.some(p => p.id === paper.id)) {
      target.papers.push({
        ...paper,
        userAnnotation: '',
        relevanceRating: 4,
        addedAt: new Date().toISOString(),
      });
      saveCollections(current);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      <Card className="bg-neutral-900 border-neutral-800">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-medium text-neutral-200 flex items-center justify-between">
            <span>arXiv Research Explorer</span>
            <Badge variant="outline" className="text-xs border-neutral-700 text-neutral-400">
              {collections[0]?.papers.length || 0} saved
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              placeholder="Search arXiv papers (e.g. WebMCP security)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="bg-neutral-950 border-neutral-800 text-xs h-8"
            />
            <Button type="submit" size="sm" disabled={loading} className="h-8 px-3">
              <Search className="w-3.5 h-3.5" />
            </Button>
          </form>
        </CardContent>
      </Card>

      <ScrollArea className="flex-1 rounded-md border border-neutral-800 bg-neutral-900/50 p-2">
        {results.length === 0 && !loading && (
          <div className="text-center p-6 text-xs text-neutral-500">
            Search arXiv or browse pre-seeded collections.
          </div>
        )}
        {loading && (
          <div className="text-center p-6 text-xs text-neutral-400">
            Searching arXiv...
          </div>
        )}
        <div className="space-y-2">
          {results.map((paper) => (
            <Card key={paper.id} className="bg-neutral-950 border-neutral-800/80 p-3 text-xs space-y-2">
              <div className="font-medium text-neutral-200 line-clamp-2">{paper.title}</div>
              <div className="text-[11px] text-neutral-400">{paper.authors.join(', ')} • {paper.published}</div>
              <p className="text-[11px] text-neutral-400 line-clamp-3 leading-relaxed">{paper.abstract}</p>
              <div className="flex justify-between items-center pt-1 border-t border-neutral-900">
                <span className="text-[10px] text-neutral-500 font-mono">arXiv:{paper.id}</span>
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-6 text-[10px] px-2"
                  onClick={() => handleAddToCollection(paper)}
                >
                  <Plus className="w-3 h-3 mr-1" /> Add
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
