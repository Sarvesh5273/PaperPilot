import { NextRequest, NextResponse } from 'next/server';

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

export async function POST(req: NextRequest) {
  try {
    const { sectionTitle, tone, papers, sectionGuidance } = await req.json();
    if (!sectionTitle || !Array.isArray(papers) || papers.length === 0) {
      return NextResponse.json({ error: 'sectionTitle and papers are required' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not configured' }, { status: 500 });
    }

    const context = papers.map((p: any, i: number) =>
      `[Source ${i + 1}] ${p.title} (${(p.authors?.[0] || 'Unknown').split(' ').pop()} et al., ${(p.published || '').split('-')[0] || 'n.d.'})\n` +
      (p.findings ? `Extracted findings: ${p.findings}\n` : '') +
      `Abstract: ${p.abstract || 'Not available'}`
    ).join('\n\n---\n\n');

    const prompt = `You are an academic writing assistant helping a student draft one section of a paper.

Section to write: "${sectionTitle}"
${sectionGuidance ? `Requirements for this section: ${sectionGuidance}\n` : ''}Tone: ${tone || 'academic'}

Source papers with extracted findings:
${context}

Rules:
- Write 150–300 words of polished academic prose.
- Ground every substantive claim in the sources. Do not invent results, numbers, or citations.
- Cite sources inline exactly in this format: ({{paperId}}) — e.g. ({{2401.12345}})
- Do not use markdown headings or bullet lists; continuous prose only.
- Do not write a section title; only the body text.`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 1024 },
        }),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: `Gemini API error ${res.status}: ${errText.slice(0, 200)}` }, { status: 502 });
    }

    const data = await res.json();
    const draft = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!draft) {
      return NextResponse.json({ error: 'Gemini returned an empty draft' }, { status: 502 });
    }

    return NextResponse.json({ draft });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Gemini request failed' },
      { status: 500 }
    );
  }
}