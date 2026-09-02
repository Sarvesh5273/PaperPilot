import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q') || '';
  const idList = searchParams.get('id_list') || '';
  const maxResults = searchParams.get('max') || '10';
  
  let arxivUrl: string;
  if (idList) {
    arxivUrl = `https://export.arxiv.org/api/query?id_list=${encodeURIComponent(idList)}&max_results=${maxResults}`;
  } else if (query.startsWith('id:')) {
    const rawId = query.slice(3).trim();
    arxivUrl = `https://export.arxiv.org/api/query?id_list=${encodeURIComponent(rawId)}&max_results=${maxResults}`;
  } else {
    arxivUrl = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&start=0&max_results=${maxResults}&sortBy=submittedDate&sortOrder=descending`;
  }
  
  const res = await fetch(arxivUrl);
  const xml = await res.text();
  
  return new NextResponse(xml, {
    headers: { 'Content-Type': 'application/xml' },
  });
}