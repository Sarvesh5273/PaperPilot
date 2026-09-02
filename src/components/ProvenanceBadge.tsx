'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { PaperSection } from '@/types';

interface ProvenanceBadgeProps {
  section: PaperSection;
}

export function ProvenanceBadge({ section }: ProvenanceBadgeProps) {
  const agentWords = section.agentDraft ? section.agentDraft.trim().split(/\s+/).filter(Boolean).length : 0;
  const humanWords = section.humanEdit ? section.humanEdit.trim().split(/\s+/).filter(Boolean).length : 0;
  const total = Math.max(humanWords, agentWords, 1);

  let agentPct = 0;
  let humanPct = 0;

  if (humanWords === 0 && agentWords > 0) {
    agentPct = 100;
    humanPct = 0;
  } else if (agentWords === 0 && humanWords > 0) {
    agentPct = 0;
    humanPct = 100;
  } else if (humanWords > 0 && agentWords > 0) {
    // If human edit is present, estimate ratio
    const ratio = Math.min(1, agentWords / total);
    agentPct = Math.round(ratio * 40); // agent contributed draft base
    humanPct = 100 - agentPct;
  }

  const verifiedCount = section.citations.length;

  let colorClasses = 'bg-emerald-950/40 text-emerald-300 border-emerald-800/80';
  if (agentPct === 100) {
    colorClasses = 'bg-rose-950/40 text-rose-300 border-rose-800/80';
  } else if (agentPct > 60) {
    colorClasses = 'bg-amber-950/40 text-amber-300 border-amber-800/80';
  }

  return (
    <div className="flex items-center gap-1.5">
      <Badge variant="outline" className={`text-[10px] px-2 py-0.5 ${colorClasses}`}>
        🤖 {agentPct}% Agent | ✍️ {humanPct}% Human | ✅ {verifiedCount} Verified
      </Badge>
    </div>
  );
}
