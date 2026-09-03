'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useOutlines } from '@/hooks/useOutline';
import { useCollections } from '@/hooks/useCollections';
import { generateOutlineAction } from '@/actions/writing';
import { SectionCard } from './SectionCard';
import { ExportDialog } from './ExportDialog';
import { FileText, PlusCircle, CheckCircle, Clock, Library, ArrowRight, Loader2 } from 'lucide-react';

export function EditorPanel() {
  const outlines = useOutlines();
  const collections = useCollections();
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeCollectionId || !collections.some((collection) => collection.id === activeCollectionId)) {
      setActiveCollectionId(collections[0]?.id || null);
    }
  }, [activeCollectionId, collections]);

  useEffect(() => {
    const handleActiveCollection = (event: Event) => {
      const detail = (event as CustomEvent<{ collectionId?: string }>).detail;
      if (detail?.collectionId) {
        setActiveCollectionId(detail.collectionId);
        setSelectedSectionId(null);
      }
    };
    window.addEventListener('paperpilot:active-collection-changed', handleActiveCollection);
    return () => window.removeEventListener('paperpilot:active-collection-changed', handleActiveCollection);
  }, []);

  const activeCollection = collections.find((collection) => collection.id === activeCollectionId) || collections[0];
  const activeOutline = activeCollection
    ? outlines.find((outline) => outline.collectionId === activeCollection.id)
    : outlines[0];
  const activeSection =
    activeOutline?.sections.find((s) => s.id === selectedSectionId) ||
    activeOutline?.sections[0];
  const hasSourcePapers = Boolean(activeCollection?.papers.length);

  const handleGenerateOutline = async (type: 'literature_review' | 'research_article' | 'thesis_chapter' = 'literature_review') => {
    const colId = activeCollection?.id;
    if (!colId) return;
    setGenerating(true);
    setGenerationError(null);
    try {
      const outline = await generateOutlineAction(colId, type);
      setSelectedSectionId(outline.sections[0]?.id || null);
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : 'Could not generate the outline.');
    } finally {
      setGenerating(false);
    }
  };

  const getStatusIcon = (status: string) => {
    if (status === 'approved') return <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0" />;
    if (status === 'editing') return <Clock className="w-3 h-3 text-amber-400 shrink-0" />;
    return <span className="w-2 h-2 rounded-full bg-neutral-600 shrink-0" />;
  };

  const activeIndex = activeOutline?.sections.findIndex((s) => s.id === activeSection?.id) ?? -1;
  const nextSectionId = activeIndex >= 0 && activeOutline && activeIndex < activeOutline.sections.length - 1
    ? activeOutline.sections[activeIndex + 1].id
    : undefined;

  return (
    <div className="flex flex-col h-full space-y-3 overflow-hidden">
      <Card className="bg-neutral-900 border-neutral-800 shrink-0">
        <CardHeader className="p-3 pb-2 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-blue-400" />
            <span>{activeOutline?.title || `${activeCollection?.name || 'Paper'} workspace`}</span>
          </CardTitle>
          <div className="flex items-center gap-1.5">
            <ExportDialog outline={activeOutline} disabled={!activeOutline} />
            {!activeOutline && (
              <Button size="sm" onClick={() => handleGenerateOutline('literature_review')} disabled={generating || !hasSourcePapers} className="h-7 text-xs bg-blue-600 hover:bg-blue-700">
                {generating ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <PlusCircle className="w-3.5 h-3.5 mr-1" />}
                {generating ? 'Building...' : hasSourcePapers ? 'Generate Outline' : 'Add papers first'}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-2 pt-0">
          {!activeOutline ? (
            <div className="py-4 px-3 space-y-3">
              <div className="flex items-start gap-2.5">
                <Library className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-neutral-200">Turn this collection into a working paper</p>
                  <p className="text-[11px] text-neutral-500 mt-1">Save sources, create an outline, then write and revise each section in one place.</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[10px] text-neutral-500">
                <div><span className="text-blue-400 font-mono">1</span> Save papers</div>
                <div><span className="text-blue-400 font-mono">2</span> Build outline</div>
                <div><span className="text-blue-400 font-mono">3</span> Draft sections</div>
              </div>
              {generationError && <p className="text-[11px] text-rose-400">{generationError}</p>}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px] text-neutral-500">
                <span>{activeCollection?.name || 'Current collection'} · {activeCollection?.papers.length || 0} source papers</span>
                <span>{activeOutline.sections.filter(s => s.status === 'approved').length}/{activeOutline.sections.length} sections approved</span>
              </div>
              <ul className="flex flex-wrap gap-1.5">
              {activeOutline.sections.map((sec, idx) => {
                const isSelected = sec.id === activeSection?.id;
                return (
                  <li key={sec.id}>
                    <button
                      onClick={() => setSelectedSectionId(sec.id)}
                      className={`text-xs px-2.5 py-1 rounded flex items-center gap-1.5 border transition-none ${
                        isSelected
                          ? 'bg-neutral-800 border-neutral-600 text-white font-medium'
                          : 'bg-neutral-950 border-neutral-800/80 text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      {getStatusIcon(sec.status)}
                      <span>{idx + 1}. {sec.title}</span>
                    </button>
                  </li>
                );
              })}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex-1 overflow-y-auto">
        {activeOutline && !hasSourcePapers ? (
          <Card className="bg-neutral-900 border-neutral-800 p-8 text-center text-xs text-neutral-500">
            <div className="flex flex-col items-center gap-2">
              <Library className="w-5 h-5 text-amber-400" />
              <p className="text-neutral-300">Your outline is waiting for source papers.</p>
              <p>Add papers from the Research tab, then return here to draft grounded sections.</p>
            </div>
          </Card>
        ) : activeOutline && activeSection ? (
          <SectionCard outline={activeOutline} section={activeSection} nextSectionId={nextSectionId} />
        ) : (
          <Card className="bg-neutral-900 border-neutral-800 p-8 text-center text-xs text-neutral-500">
            <div className="flex flex-col items-center gap-2">
              <ArrowRight className="w-4 h-4 text-blue-400" />
              <span>Generate an outline above to begin collaborative drafting.</span>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
