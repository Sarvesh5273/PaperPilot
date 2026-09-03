'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle2, CircleAlert, Clock3, ListChecks, Trash2, Cpu, ChevronRight } from 'lucide-react';
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
    <Card className="h-full min-h-0 bg-card/85 backdrop-blur-md border border-border/80 rounded-2xl shadow-xs flex flex-col overflow-hidden">
      <CardHeader className="shrink-0 border-b border-border/70 p-3.5 bg-muted/30">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="font-editorial text-sm font-bold text-foreground flex items-center gap-2">
              <Cpu className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <span>Research Activity</span>
            </CardTitle>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Audit log of agent actions and tool executions.</p>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge
              variant="outline"
              className="border-amber-500/30 bg-amber-500/10 text-[10px] font-mono font-semibold text-amber-800 dark:text-amber-300"
            >
              {completed}/{logs.length} done
            </Badge>
            {logs.length > 0 && (
              <Button
                aria-label="Clear activity"
                size="icon"
                variant="ghost"
                onClick={clearLogs}
                className="h-6.5 w-6.5 text-muted-foreground hover:text-rose-500 rounded-md"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="min-h-0 flex-1 p-3">
        <ScrollArea className="h-full pr-1.5">
          {logs.length === 0 ? (
            <div className="flex h-full min-h-48 flex-col items-center justify-center px-4 text-center">
              <div className="h-10 w-10 rounded-full bg-muted/60 flex items-center justify-center mb-2 text-muted-foreground">
                <Clock3 className="h-5 w-5" />
              </div>
              <p className="text-xs font-semibold text-foreground">No co-pilot activity yet</p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground max-w-[200px]">
                Agent actions initiated by WebMCP or workspace tools will stream here in real time.
              </p>
            </div>
          ) : (
            <ol className="space-y-2.5">
              {logs.map((log) => (
                <li
                  key={log.id}
                  className="rounded-xl border border-border/80 bg-background/80 p-3 shadow-2xs space-y-1 transition-all"
                >
                  <div className="flex items-start gap-2.5">
                    {log.error ? (
                      <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-500" />
                    ) : (
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-foreground">
                          {TOOL_LABELS[log.toolName] || log.toolName}
                        </span>
                        <span className="shrink-0 text-[10px] font-mono text-muted-foreground">
                          {log.duration > 0 ? `${log.duration}ms` : 'ok'}
                        </span>
                      </div>
                      <p
                        className={`mt-1 text-xs leading-relaxed ${
                          log.error ? 'text-rose-500 font-medium' : 'text-muted-foreground'
                        }`}
                      >
                        {getOutputSummary(log)}
                      </p>
                      <details className="mt-2 text-[10px] text-muted-foreground group">
                        <summary className="cursor-pointer hover:text-foreground font-medium flex items-center gap-1 select-none">
                          <ChevronRight className="w-3 h-3 transition-transform group-open:rotate-90 text-amber-600" />
                          <span>Payload data</span>
                        </summary>
                        <pre className="mt-1.5 overflow-x-auto rounded-lg bg-muted/40 border border-border/50 p-2 text-[10px] font-mono leading-tight whitespace-pre-wrap break-words text-foreground/80">
                          {JSON.stringify({ input: log.input, output: log.output ?? { error: log.error } }, null, 2)}
                        </pre>
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
