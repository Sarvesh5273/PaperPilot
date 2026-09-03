const CACHE_PREFIX = 'paperpilot:fulltext:';
const TTL = 24 * 60 * 60 * 1000;

/** Fetch full paper text (HTML version) with 24h local cache. Throws if unavailable. */
export async function getFullText(arxivId: string): Promise<string> {
  const key = CACHE_PREFIX + arxivId;
  try {
    const cached = JSON.parse(localStorage.getItem(key) || 'null');
    if (cached && Date.now() - cached.ts < TTL && cached.text?.length > 1500) return cached.text;
  } catch { /* ignore */ }

  const res = await fetch(`/api/fulltext?arxivId=${encodeURIComponent(arxivId)}`);
  if (!res.ok) throw new Error('Full text unavailable');
  const data = await res.json();
  localStorage.setItem(key, JSON.stringify({ ts: Date.now(), text: data.text }));
  return data.text;
}

export function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
    .map(s => s.trim())
    .filter(s => s.length > 20 && s.length < 500);
}

export function tokenize(text: string): Set<string> {
  return new Set(
    text.toLowerCase().split(/\W+/).filter(w => w.length > 3 && !STOPWORDS.has(w))
  );
}

const STOPWORDS = new Set([
  'this', 'that', 'with', 'from', 'which', 'their', 'there', 'these', 'those',
  'about', 'into', 'through', 'between', 'paper', 'study', 'studies', 'using',
  'used', 'use', 'based', 'however', 'therefore', 'although', 'while', 'where',
  'when', 'what', 'have', 'has', 'been', 'were', 'are', 'and', 'for', 'the',
]);