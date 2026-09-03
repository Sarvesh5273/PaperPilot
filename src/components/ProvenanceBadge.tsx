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
        <Badge
          variant="outline"
          className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30 flex items-center gap-1"
        >
          <BookOpenCheck className="h-3 w-3 text-amber-600 dark:text-amber-400" />
          <span>Source draft ready</span>
        </Badge>
      )}
      <Badge
        variant="outline"
        className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted/70 text-muted-foreground border-border/70 flex items-center gap-1"
      >
        <Quote className="h-2.5 w-2.5 text-muted-foreground" />
        <span>{section.citations.length} citation{section.citations.length === 1 ? '' : 's'}</span>
      </Badge>
    </div>
  );
}
