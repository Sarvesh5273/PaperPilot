export async function generateDraftWithGemini(
  sectionTitle: string,
  tone: string,
  papers: Array<{
    title: string;
    authors: string[];
    abstract: string;
    published: string;
    id: string;
  }>
): Promise<string> {
  const response = await fetch(
    '/api/gemini',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sectionTitle,
        tone,
        papers,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(error?.error || `Gemini API error: ${response.status}`);
  }

  const data = await response.json() as { text?: string };
  const text = data.text?.trim();

  if (!text) {
    throw new Error('Gemini returned empty response');
  }

  return text;
}
