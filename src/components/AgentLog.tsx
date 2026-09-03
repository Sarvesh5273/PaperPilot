'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle2, CircleAlert, Clock3, ListChecks, Trash2 } from 'lucide-react';
import { useAgentLog } from '@/hooks/useAgentLog';

const TOOL_LABELS: Record<string, string> = {
  search_papers: 'Search papers',
  extract_findings: 'Extract findings',
  compare_papers: 'Compare papers',
  find_related: 'Find related work',
  add_to_collection: 'Save to collection',
  get_collection: 'Open collection',
  generate_outline: 'Generate outline',
  draft_section: 'Draft section',
  insert_citation: 'Insert citations',
  verify_claim: 'Check claim support',
  suggest_transition: 'Suggest transition',
};

export function AgentLog() {
  const { logs, clearLogs } = useAgentLog();
  const completed = logs.filter((log) => !log.error).length;

  const getOutputSummary = (log: (typeof logs)[number]) => {
    if (log.error) return log.error;
    const output = (log.output || {}) as Record<string, unknown>;
    if (log.toolName === 'search_papers') return `${output.resultCount ?? (output.papers as unknown[] | undefined)?.length ?? 0} papers found`;
    if (log.toolName === 'add_to_collection') return `Saved · ${output.collectionSize ?? 0} papers in collection`;
    if (log.toolName === 'get_collection') return `Collection opened · ${(output.papers as unknown[] | undefined)?.length ?? 0} papers`;
    if (log.toolName === 'extract_findings') return 'Findings extracted from the paper';
    if (log.toolName === 'compare_papers') return 'Comparison prepared';
    if (log.toolName === 'find_related') return `${(output.relatedPapers as unknown[] | undefined)?.length ?? 0} related papers found`;
    if (log.toolName === 'generate_outline') return 'Outline created';
    if (log.toolName === 'draft_section') return 'Source draft created';
    if (log.toolName === 'insert_citation') return 'Citation linked to the section';
    if (log.toolName === 'verify_claim') return output.verified ? 'Claim has supporting evidence' : 'Claim needs manual review';
    if (log.toolName === 'suggest_transition') return 'Transition suggestion prepared';
    return 'Completed';
  };

  return (
    <Card className="h-full min-h-0 bg-neutral-900 border-neutral-800 gap-0">
      <CardHeader className="shrink-0 border-b border-neutral-800 p-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="text-sm font-semibold text-neutral-200 flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-emerald-400" /> Research activity
            </CardTitle>
            <p className="mt-1 text-[10px] text-neutral-500">A readable history of what the research assistant completed.</p>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="border-neutral-700 text-[10px] text-neutral-300">{completed}/{logs.length} done</Badge>
            {logs.length > 0 && (
              <Button aria-label="Clear activity" size="icon" variant="ghost" onClick={clearLogs} className="h-7 w-7 text-neutral-500 hover:text-neutral-200">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="min-h-0 flex-1 p-2">
        <ScrollArea className="h-full pr-1">
          {logs.length === 0 ? (
            <div className="flex h-full min-h-44 flex-col items-center justify-center px-5 text-center">
              <Clock3 className="mb-2 h-5 w-5 text-neutral-600" />
              <p className="text-xs text-neutral-400">No research activity yet.</p>
              <p className="mt-1 text-[11px] leading-relaxed text-neutral-600">Calls made by ChatGPT or from PaperPilot will appear here.</p>
            </div>
          ) : (
            <ol className="space-y-2">
              {logs.map((log) => (
                <li key={log.id} className="rounded-lg border border-neutral-800 bg-neutral-950 p-2.5">
                  <div className="flex items-start gap-2">
                    {log.error ? <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-400" /> : <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-medium text-neutral-200">{TOOL_LABELS[log.toolName] || log.toolName}</span>
                        <span className="shrink-0 text-[10px] text-neutral-600">{log.duration > 0 ? `${log.duration}ms` : 'complete'}</span>
                      </div>
                      <p className={`mt-1 text-[11px] leading-relaxed ${log.error ? 'text-rose-300' : 'text-neutral-400'}`}>{getOutputSummary(log)}</p>
                      <details className="mt-2 text-[10px] text-neutral-500">
                        <summary className="cursor-pointer hover:text-neutral-300">Technical details</summary>
                        <pre className="mt-1 overflow-x-auto rounded bg-neutral-900 p-1.5 text-[9px] whitespace-pre-wrap break-words">{JSON.stringify({ input: log.input, output: log.output ?? { error: log.error } }, null, 2)}</pre>
                      </details>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
