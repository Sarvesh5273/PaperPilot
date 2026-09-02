'use client';

import { useState, useEffect, useCallback } from 'react';
import { ToolCall } from '@/types';
import { loadToolLogs } from '@/lib/storage';

export function useAgentLog() {
  const [logs, setLogs] = useState<ToolCall[]>([]);

  const refreshLogs = useCallback(() => {
    const loaded = loadToolLogs() as ToolCall[];
    setLogs([...loaded].reverse());
  }, []);

  useEffect(() => {
    refreshLogs();
    window.addEventListener('paperpilot:logs-changed', refreshLogs);
    return () => window.removeEventListener('paperpilot:logs-changed', refreshLogs);
  }, [refreshLogs]);

  const addLog = useCallback((log: ToolCall) => {
    setLogs(prev => [log, ...prev].slice(0, 100));
  }, []);

  const clearLogs = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('paperpilot_agent_logs');
      window.dispatchEvent(new CustomEvent('paperpilot:logs-changed'));
    }
    setLogs([]);
  }, []);

  return { logs, addLog, clearLogs };
}
