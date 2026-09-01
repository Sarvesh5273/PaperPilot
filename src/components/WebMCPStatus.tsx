'use client';

import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Sparkles, AlertCircle } from 'lucide-react';

export function WebMCPStatus() {
  const [hasWebMCP, setHasWebMCP] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isAvailable = !!(window as unknown as { modelContext?: unknown }).modelContext || !!(typeof document !== 'undefined' && (document as unknown as { modelContext?: unknown }).modelContext);
      setHasWebMCP(isAvailable);
    }
  }, []);

  return (
    <header className="h-14 border-b border-neutral-800 bg-neutral-900/60 px-4 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-bold tracking-tight text-neutral-100 flex items-center gap-2">
          <span className="text-blue-500">PaperPilot</span>
          <span className="text-xs font-normal text-neutral-400">Agent-Native Research Workspace</span>
        </h1>
      </div>
      <div className="flex items-center gap-2">
        {hasWebMCP ? (
          <Badge variant="outline" className="bg-emerald-950/40 text-emerald-400 border-emerald-800 flex items-center gap-1.5 py-1 px-2.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            🤖 Agent Tools Ready (WebMCP Active)
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-amber-950/30 text-amber-300 border-amber-800/80 flex items-center gap-1.5 py-1 px-2.5">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
            ⚠️ WebMCP Not Available — Open in Chrome 149+ with flag or ChatGPT Browser
          </Badge>
        )}
      </div>
    </header>
  );
}
