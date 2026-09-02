import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q') || '';
  const maxResults = searchParams.get('max') || '10';
  
  const arxivUrl = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&start=0&max_results=${maxResults}&sortBy=submittedDate&sortOrder=descending`;
  
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // 8s timeout
    
    const res = await fetch(arxivUrl, { signal: controller.signal });
    clearTimeout(timeout);
    
    if (!res.ok) {
      return NextResponse.json({ error: 'arXiv API error', status: res.status }, { status: 502 });
    }
    
    const xml = await res.text();
    return new NextResponse(xml, {
      headers: { 'Content-Type': 'application/xml' },
    });
  } catch (err) {
    return NextResponse.json({ error: 'arXiv timeout or unreachable' }, { status: 504 });
  }
}