import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 30;

const SOURCES = [
  (id: string) => `https://arxiv.org/html/${id}v1`,
  (id: string) => `https://arxiv.org/html/${id}`,
  (id: string) => `https://ar5iv.labs.arxiv.org/html/${id}`,
];

function htmlToText(html: string): string {
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<(nav|header|footer|aside)[\s\S]*?<\/\1>/gi, ' ');
  const article = text.match(/<article[\s\S]*?<\/article>/i);
  if (article) text = article[0];
  return text
    .replace(/<\/(p|div|section|h1|h2|h3|h4|li|tr)>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('arxivId') || '';
  if (!/^[\d.]+$/.test(id)) {
    return NextResponse.json({ error: 'Invalid arXiv ID' }, { status: 400 });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);
  try {
    for (const build of SOURCES) {
      try {
        const res = await fetch(build(id), {
          signal: controller.signal,
          headers: { 'User-Agent': 'PaperPilot/1.0 (academic research tool)' },
        });
        if (!res.ok) continue;
        const text = htmlToText(await res.text());
        if (text.length > 1500) {
          return NextResponse.json({ id, text: text.slice(0, 60000), source: build(id) });
        }
      } catch {
        // try next mirror
      }
    }
    return NextResponse.json({ error: 'Full text not available for this paper' }, { status: 404 });
  } finally {
    clearTimeout(timer);
  }
}