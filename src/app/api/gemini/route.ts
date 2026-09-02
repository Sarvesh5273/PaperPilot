import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

interface PaperContext {
  title: string;
  authors: string[];
  abstract: string;
  published: string;
  id: string;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  error?: { message: string };
}

export async function POST(request: NextRequest) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 503 });
  }

  try {
    const body = await request.json() as {
      sectionTitle?: string;
      tone?: string;
      papers?: PaperContext[];
    };
    const sectionTitle = body.sectionTitle?.trim();
    const tone = body.tone?.trim() || 'academic';
    const papers = Array.isArray(body.papers) ? body.papers : [];

    if (!sectionTitle) {
      return NextResponse.json({ error: 'Section title is required' }, { status: 400 });
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
      return NextResponse.json({ error: `Gemini API error: ${response.status}` }, { status: 502 });
    }

    const data: GeminiResponse = await response.json();
    if (data.error) {
      return NextResponse.json({ error: data.error.message }, { status: 502 });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) {
      return NextResponse.json({ error: 'Gemini returned empty response' }, { status: 502 });
    }

    return NextResponse.json({ text });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gemini request failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
