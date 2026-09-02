import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q') || '';
  const maxResults = searchParams.get('max') || '10';
  
  const arxivUrl = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&start=0&max_results=${maxResults}&sortBy=submittedDate&sortOrder=descending`;
  
  const res = await fetch(arxivUrl);
  const xml = await res.text();
  
  return new NextResponse(xml, {
    headers: { 'Content-Type': 'application/xml' },
  });
}