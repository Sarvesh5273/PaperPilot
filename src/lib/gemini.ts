const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  error?: { message: string };
}

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
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key not configured');
  }

  const paperContext = papers.map((p, i) => `
Paper ${i + 1}:
Title: ${p.title}
Authors: ${p.authors.join(', ')}
Published: ${p.published}
Abstract: ${p.abstract}
`).join('\n');

  const prompt = `You are an academic writing assistant. Write a single paragraph for the "${sectionTitle}" section of a literature review.

Tone: ${tone} (academic = neutral scholarly voice, critical = analytical/evaluative, synthesis = connecting ideas across papers).

Use the following papers as your only sources. Synthesize their findings into coherent prose. Do NOT simply list each paper separately. Integrate them.

${paperContext}

Requirements:
- 150-250 words
- Use in-text citations in this exact format: ({{paperId}})
- Example: "Recent work has explored trust boundaries ({{2608.24017}})."
- Vary sentence structure. Do NOT start every sentence with an author name.
- Write like a human researcher, not a template.
- Focus on the section topic: ${sectionTitle}

Output ONLY the paragraph text. No headings, no bullet points, no markdown formatting.`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 512,
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data: GeminiResponse = await response.json();

  if (data.error) {
    throw new Error(data.error.message);
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

  if (!text) {
    throw new Error('Gemini returned empty response');
  }

  return text;
}
