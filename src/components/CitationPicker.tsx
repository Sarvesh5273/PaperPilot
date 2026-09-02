'use client';

import React from 'react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useCollections } from '@/hooks/useCollections';
import { Quote } from 'lucide-react';

interface CitationPickerProps {
  onSelectCitation: (paperId: string) => void;
  disabled?: boolean;
}

export function CitationPicker({ onSelectCitation, disabled }: CitationPickerProps) {
  const collections = useCollections();
  const allPapers = collections.flatMap((c) => c.papers);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled || allPapers.length === 0}
        className="h-7 text-xs border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 rounded px-2.5 inline-flex items-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Quote className="w-3 h-3 mr-1 text-blue-400" />
        Insert Citation
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 bg-neutral-900 border-neutral-800 text-neutral-200">
        <DropdownMenuLabel className="text-xs text-neutral-400">Available Papers</DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-neutral-800" />
        {allPapers.length === 0 ? (
          <div className="p-2 text-xs text-neutral-500">No papers in collection</div>
        ) : (
          allPapers.map((p) => (
            <DropdownMenuItem
              key={p.id}
              onClick={() => onSelectCitation(p.id)}
              className="text-xs flex flex-col items-start gap-0.5 cursor-pointer hover:bg-neutral-800 focus:bg-neutral-800"
            >
              <span className="font-medium text-neutral-200 line-clamp-1">{p.title}</span>
              <span className="text-[10px] text-neutral-400 font-mono">
                {p.authors[0]?.split(' ').pop()} • arXiv:{p.id}
              </span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
