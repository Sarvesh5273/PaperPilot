'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useOutlines } from '@/hooks/useOutline';
import { useCollections } from '@/hooks/useCollections';
import { generateOutlineAction } from '@/actions/writing';
import { SectionCard } from './SectionCard';
import { ExportDialog } from './ExportDialog';
import { FileText, PlusCircle, CheckCircle, Clock } from 'lucide-react';

export function EditorPanel() {
  const outlines = useOutlines();
  const collections = useCollections();
  const activeOutline = outlines[0];
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);

  const activeSection =
    activeOutline?.sections.find((s) => s.id === selectedSectionId) ||
    activeOutline?.sections[0];

  const handleGenerateOutline = async (type: 'literature_review' | 'research_article' | 'thesis_chapter' = 'literature_review') => {
    const colId = collections[0]?.id || 'preseed-webmcp';
    await generateOutlineAction(colId, type);
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
            <span>{activeOutline?.title || 'Paper Outline'}</span>
          </CardTitle>
          <div className="flex items-center gap-1.5">
            <ExportDialog outline={activeOutline} disabled={!activeOutline} />
            {!activeOutline && (
              <Button size="sm" onClick={() => handleGenerateOutline('literature_review')} className="h-7 text-xs bg-blue-600 hover:bg-blue-700">
                <PlusCircle className="w-3.5 h-3.5 mr-1" /> Generate Outline
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-2 pt-0">
          {!activeOutline ? (
            <p className="text-xs text-neutral-500 py-3 text-center">
              No outline generated. Click &ldquo;Generate Outline&rdquo; to build sections from your collection.
            </p>
          ) : (
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
          )}
        </CardContent>
      </Card>

      <div className="flex-1 overflow-y-auto">
        {activeOutline && activeSection ? (
          <SectionCard outline={activeOutline} section={activeSection} nextSectionId={nextSectionId} />
        ) : (
          <Card className="bg-neutral-900 border-neutral-800 p-8 text-center text-xs text-neutral-500">
            Generate an outline to begin collaborative drafting.
          </Card>
        )}
      </div>
    </div>
  );
}
