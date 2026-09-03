'use client';

import { useState } from 'react';
import { useCollections } from '@/hooks/useCollections';
import { Button } from '@/components/ui/button';
import { Quote } from 'lucide-react';

interface CitationPickerProps {
  onSelect: (paperId: string) => void;
}

export function CitationPicker({ onSelect }: CitationPickerProps) {
  const collections = useCollections();
  const [selectedId, setSelectedId] = useState('');

  const allPapers = collections.flatMap((c) => c.papers);

  const handleInsert = () => {
    if (selectedId) {
      onSelect(selectedId);
      setSelectedId('');
    }
  };

  if (allPapers.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5">
      <select
        value={selectedId}
        onChange={(e) => setSelectedId(e.target.value)}
        aria-label="Choose a paper to cite"
        className="h-7.5 w-48 max-w-[42vw] bg-background border border-border/80 text-foreground rounded-lg px-2 text-xs font-medium focus:ring-1 focus:ring-amber-500/30 outline-none shadow-2xs"
      >
        <option value="">Insert citation...</option>
        {allPapers.map((paper) => (
          <option key={paper.id} value={paper.id}>
            {paper.authors[0]?.split(' ').pop()} et al. ({paper.published.split('-')[0]})
          </option>
        ))}
      </select>
      <Button
        onClick={handleInsert}
        disabled={!selectedId}
        variant="outline"
        size="sm"
        className="h-7.5 px-2.5 text-xs font-semibold rounded-lg border-border/80 bg-background hover:bg-accent gap-1"
      >
        <Quote className="w-3 h-3 text-amber-600 dark:text-amber-400" />
        <span>Cite</span>
      </Button>
    </div>
  );
}
