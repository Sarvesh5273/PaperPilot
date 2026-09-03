'use client';

import React, { useState, useEffect } from 'react';
import { WebMCPStatus } from '@/components/WebMCPStatus';
import { ResearchPanel } from '@/components/ResearchPanel';
import { EditorPanel } from '@/components/EditorPanel';
import { AgentLog } from '@/components/AgentLog';
import { BookOpen, FileText, Cpu } from 'lucide-react';
import { useCollections } from '@/hooks/useCollections';
import { useAgentLog } from '@/hooks/useAgentLog';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'research' | 'studio' | 'activity'>('studio');
  const collections = useCollections();
  const { logs } = useAgentLog();

  const totalPapers = collections.reduce((sum, c) => sum + c.papers.length, 0);

  // Auto-switch to research if search results arrive
  useEffect(() => {
    const handleSearch = () => {
      if (window.innerWidth < 1280) {
        setActiveTab('research');
      }
    };
    const handleOutline = () => {
      if (window.innerWidth < 1280) {
        setActiveTab('studio');
      }
    };
    window.addEventListener('paperpilot:search-results-changed', handleSearch);
    window.addEventListener('paperpilot:outlines-changed', handleOutline);
    return () => {
      window.removeEventListener('paperpilot:search-results-changed', handleSearch);
      window.removeEventListener('paperpilot:outlines-changed', handleOutline);
    };
  }, []);

  return (
    <div className="h-screen flex flex-col bg-ambient-canvas text-foreground overflow-hidden">
      <WebMCPStatus />

      {/* Responsive Panel Switcher for Narrow / Split-Screen Displays (< 1280px) */}
      <div className="xl:hidden px-3 pt-2.5 shrink-0 z-10">
        <div className="grid grid-cols-3 bg-card/90 backdrop-blur-md border border-border/80 rounded-xl p-1 gap-1 shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveTab('research')}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'research'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/40'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="truncate">Research</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('studio')}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'studio'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/40'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="truncate">Studio</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('activity')}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'activity'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/40'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span className="truncate">Activity</span>
          </button>
        </div>
      </div>

      {/* Main Grid: On xl+ screens (>= 1280px), show all 3 columns simultaneously.
          On narrower screens (< 1280px), show the currently active tab at full width. */}
      <main className="flex-1 grid grid-cols-12 gap-3 p-3 overflow-hidden min-h-0">
        <section
          className={`h-full overflow-hidden flex flex-col min-h-0 ${
            activeTab === 'research' ? 'col-span-12' : 'hidden'
          } xl:col-span-3 xl:flex`}
        >
          <ResearchPanel />
        </section>
        <section
          className={`h-full overflow-hidden flex flex-col min-h-0 ${
            activeTab === 'studio' ? 'col-span-12' : 'hidden'
          } xl:col-span-6 xl:flex`}
        >
          <EditorPanel />
        </section>
        <section
          className={`h-full overflow-hidden flex flex-col min-h-0 ${
            activeTab === 'activity' ? 'col-span-12' : 'hidden'
          } xl:col-span-3 xl:flex`}
        >
          <AgentLog />
        </section>
      </main>
    </div>
  );
}
