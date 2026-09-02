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
    <div className="flex items-center gap-2">
      <select 
        value={selectedId}
        onChange={(e) => setSelectedId(e.target.value)}
        className="bg-neutral-800 text-neutral-100 border border-neutral-700 rounded px-3 py-2 text-sm min-w-[200px]"
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
      >
        Insert
      </Button>
    </div>
  );
}