import { PaperCollection, PaperOutline } from '@/types';

const COLLECTIONS_KEY = 'paperpilot_collections';
const OUTLINES_KEY = 'paperpilot_outlines';

export function saveCollections(collections: PaperCollection[]): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(COLLECTIONS_KEY, JSON.stringify(collections));
    window.dispatchEvent(new CustomEvent('paperpilot:collections-changed'));
  }
}

export function loadCollections(): PaperCollection[] {
  if (typeof window === 'undefined') {
    return [];
  }
  const raw = localStorage.getItem(COLLECTIONS_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(c => c.id !== 'preseed-webmcp') : [];
  } catch {
    return [];
  }
}

export function saveOutlines(outlines: PaperOutline[]): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(OUTLINES_KEY, JSON.stringify(outlines));
    window.dispatchEvent(new CustomEvent('paperpilot:outlines-changed'));
  }
}

export function loadOutlines(): PaperOutline[] {
  if (typeof window === 'undefined') {
    return [];
  }
  const raw = localStorage.getItem(OUTLINES_KEY);
  if (!raw) {
    return [];
  }
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function logToolCall(name: string, input: unknown, output: unknown, latencyMs: number) {
  if (typeof window === 'undefined') return;
  const logs = JSON.parse(localStorage.getItem('paperpilot_agent_logs') || '[]');
  logs.push({
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    toolName: name,
    input: (input || {}) as Record<string, unknown>,
    output: (output || {}) as Record<string, unknown>,
    latencyMs,
    duration: latencyMs,
    timestamp: new Date().toISOString(),
  });
  localStorage.setItem('paperpilot_agent_logs', JSON.stringify(logs.slice(-50)));
  window.dispatchEvent(new CustomEvent('paperpilot:logs-changed'));
}

export function loadToolLogs() {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem('paperpilot_agent_logs') || '[]');
  } catch {
    return [];
  }
}
