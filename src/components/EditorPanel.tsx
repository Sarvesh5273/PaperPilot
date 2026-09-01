'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useOutlines } from '@/hooks/useOutline';
import { useCollections } from '@/hooks/useCollections';
import { FileText } from 'lucide-react';

export function EditorPanel() {
  const outlines = useOutlines();
  const collections = useCollections();
  const activeOutline = outlines[0];

  return (
    <div className="flex flex-col h-full space-y-4">
      <Card className="bg-neutral-900 border-neutral-800">
        <CardHeader className="p-4 pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-sm font-medium text-neutral-200 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-400" />
              <span>{activeOutline?.title || 'Paper Drafting Workspace'}</span>
            </CardTitle>
            <Badge variant="outline" className="text-xs border-neutral-700">
              {activeOutline?.sections.length || 0} Sections
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          {!activeOutline ? (
            <div className="text-xs text-neutral-400 py-6 text-center">
              No active outline. Use the WebMCP agent or research tools to generate an outline from your collection ({collections[0]?.papers.length || 0} papers available).
            </div>
          ) : (
            <div className="space-y-3">
              {activeOutline.sections.map((section) => (
                <div key={section.id} className="p-3 bg-neutral-950 border border-neutral-800 rounded text-xs space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-neutral-200">{section.title}</span>
                    <Badge variant="secondary" className="text-[10px] uppercase">
                      {section.status}
                    </Badge>
                  </div>
                  <p className="text-neutral-400 text-[11px] line-clamp-2">
                    {section.humanEdit || section.agentDraft || 'No draft generated yet.'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
