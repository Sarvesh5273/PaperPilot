import { ExtractedFindings } from '@/types';

export interface DraftSource {
  id: string;
  title: string;
  authors: string[];
  published: string;
  abstract: string;
  findings?: ExtractedFindings;
}

export interface DraftInput {
  sectionTitle: string;
  tone?: string;
  papers: DraftSource[];
  sectionGuidance?: string;
}

export async function generateDraftWithGemini(input: DraftInput): Promise<string> {
  const res = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Gemini request failed (${res.status})`);
  }
  if (!data.draft) {
    throw new Error('Gemini returned an empty draft');
  }
  return data.draft;
}