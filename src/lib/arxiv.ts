import { Paper } from '@/types';

export async function searchArxiv(query: string, maxResults = 10): Promise<Paper[]> {
  const url = `/api/arxiv?q=${encodeURIComponent(query)}&max=${maxResults}`;
  const res = await fetch(url);
  const xml = await res.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');
  const entries = doc.querySelectorAll('entry');
  return Array.from(entries).map(entry => {
    const rawId = entry.querySelector('id')?.textContent?.split('/').pop() || '';
    const id = rawId.replace(/v\d+$/, '');
    return {
      id,
      title: entry.querySelector('title')?.textContent?.trim().replace(/\s+/g, ' ') || '',
      authors: Array.from(entry.querySelectorAll('author name')).map(a => a.textContent?.trim() || ''),
      abstract: entry.querySelector('summary')?.textContent?.trim().replace(/\s+/g, ' ') || '',
      published: entry.querySelector('published')?.textContent?.split('T')[0] || '',
      pdfUrl: `https://arxiv.org/pdf/${id}.pdf`,
      venue: 'arXiv',
    };
  });
}

export async function fetchPaperAbstract(paperId: string): Promise<string> {
  const url = `/api/arxiv?q=id:${encodeURIComponent(paperId)}&max=1`;
  const res = await fetch(url);
  const xml = await res.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');
  return doc.querySelector('summary')?.textContent?.trim().replace(/\s+/g, ' ') || '';
}