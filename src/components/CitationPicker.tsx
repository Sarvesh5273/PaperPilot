'use client';

import { useState } from 'react';
import { useCollections } from '@/hooks/useCollections';
import { Button } from '@/components/ui/button';

interface CitationPickerProps {
  onSelect: (paperId: string) => void;
}

export function CitationPicker({ onSelect }: CitationPickerProps) {
  const collections = useCollections();
  const [selectedId, setSelectedId] = useState('');
  
  const allPapers = collections.flatMap(c => c.papers);
  
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
        className="h-7 w-44 max-w-[42vw] bg-neutral-950 text-neutral-200 border border-neutral-700 rounded px-2 text-[11px]"
      >
        <option value="">Select paper to cite...</option>
        {allPapers.map(paper => (
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
        className="h-7 px-2 text-[11px]"
      >
        Cite
      </Button>
    </div>
  );
}
