'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCollections } from '@/hooks/useCollections';
import { saveCollections } from '@/lib/storage';
import { Bookmark, Star, Trash2 } from 'lucide-react';

export function CollectionSidebar() {
  const collections = useCollections();
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null);

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
        return {
          ...col,
          papers: col.papers.filter((p) => p.id !== paperId),
        };
      }
      return col;
    });
    saveCollections(updated);
  };

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
      <CardContent className="p-2 flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          {!activeCollection || activeCollection.papers.length === 0 ? (
            <div className="text-center p-4 text-xs text-neutral-500">
              No saved papers in collection.
            </div>
          ) : (
            <div className="space-y-2">
              {activeCollection.papers.map((paper) => (
                <div
                  key={paper.id}
                  className="p-2.5 bg-neutral-950 border border-neutral-800/80 rounded text-xs space-y-1.5"
                >
                  <div className="flex justify-between items-start gap-1">
                    <span className="font-medium text-neutral-200 line-clamp-2">
                      {paper.title}
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleRemovePaper(paper.id)}
                      className="h-5 w-5 text-neutral-500 hover:text-rose-400 shrink-0"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-neutral-400">
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
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
