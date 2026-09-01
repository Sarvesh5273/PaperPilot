'use client';

import { useState, useCallback } from 'react';
import { ToolCall } from '@/types';

export function useAgentLog() {
  const [logs, setLogs] = useState<ToolCall[]>([]);

  const addLog = useCallback((log: ToolCall) => {
    setLogs(prev => [log, ...prev].slice(0, 100));
  }, []);

  const clearLogs = useCallback(() => setLogs([]), []);

  return { logs, addLog, clearLogs };
}
