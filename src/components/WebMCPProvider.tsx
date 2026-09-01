'use client';

import React, { ReactNode, createContext, useContext } from 'react';
import { useAgentLog } from '@/hooks/useAgentLog';
import { ToolCall } from '@/types';

interface WebMCPContextType {
  logs: ToolCall[];
  addLog: (log: ToolCall) => void;
  clearLogs: () => void;
}

const WebMCPContext = createContext<WebMCPContextType | null>(null);

export function useWebMCPContext() {
  const ctx = useContext(WebMCPContext);
  if (!ctx) throw new Error('useWebMCPContext must be used within WebMCPProvider');
  return ctx;
}

export function WebMCPProvider({ children }: { children: ReactNode }) {
  const agentLogState = useAgentLog();

  return (
    <WebMCPContext.Provider value={agentLogState}>
      {children}
    </WebMCPContext.Provider>
  );
}
