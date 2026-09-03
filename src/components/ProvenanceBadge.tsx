'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { PaperSection } from '@/types';
import { BookOpenCheck, Quote } from 'lucide-react';

interface ProvenanceBadgeProps {
  section: PaperSection;
}

export function ProvenanceBadge({ section }: ProvenanceBadgeProps) {
  return (
    <div className="flex items-center gap-1.5">
      {section.agentDraft && (
        <Badge variant="outline" className="text-[10px] px-2 py-0.5 bg-blue-950/30 text-blue-300 border-blue-800/70">
          <BookOpenCheck className="mr-1 h-3 w-3" /> Source draft ready
        </Badge>
      )}
      <Badge variant="outline" className="text-[10px] px-2 py-0.5 bg-neutral-950 text-neutral-400 border-neutral-700">
        <Quote className="mr-1 h-3 w-3" /> {section.citations.length} citation{section.citations.length === 1 ? '' : 's'} linked
      </Badge>
    </div>
  );
}
