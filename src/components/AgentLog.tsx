'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Terminal, Trash2 } from 'lucide-react';
import { useAgentLog } from '@/hooks/useAgentLog';

export function AgentLog() {
  const { logs, clearLogs } = useAgentLog();

  return (
    <div className="flex flex-col h-full space-y-4">
      <Card className="bg-neutral-900 border-neutral-800">
        <CardHeader className="p-4 pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-sm font-medium text-neutral-200 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span>WebMCP Agent Audit Log</span>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs border-neutral-700 text-neutral-400">
                {logs.length} calls
              </Badge>
              {logs.length > 0 && (
                <Button size="icon" variant="ghost" onClick={clearLogs} className="h-6 w-6 text-neutral-400 hover:text-neutral-200">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      <ScrollArea className="flex-1 rounded-md border border-neutral-800 bg-neutral-900/50 p-2">
        {logs.length === 0 ? (
          <div className="text-center p-6 text-xs text-neutral-500">
            No tool calls logged yet. Tools invoked by the WebMCP agent will appear here in real-time.
          </div>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => (
              <div key={log.id} className="p-2.5 bg-neutral-950 border border-neutral-800 rounded text-xs space-y-1.5 font-mono">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="font-bold text-emerald-400">{log.toolName}</span>
                  <span className="text-neutral-500">{log.duration}ms</span>
                </div>
                <div className="text-[10px] text-neutral-400 bg-neutral-900/80 p-1.5 rounded overflow-x-auto">
                  <span className="text-neutral-500">in: </span>
                  {JSON.stringify(log.input)}
                </div>
                {log.error ? (
                  <div className="text-[10px] text-rose-400 bg-rose-950/30 p-1.5 rounded">
                    {log.error}
                  </div>
                ) : (
                  <div className="text-[10px] text-neutral-400 bg-neutral-900/80 p-1.5 rounded overflow-x-auto">
                    <span className="text-neutral-500">out: </span>
                    {JSON.stringify(log.output)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
