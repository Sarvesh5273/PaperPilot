export function formatAPACitation(paper: { title: string; authors: string[]; published: string; id: string }): string {
  const authors = paper.authors.map(a => {
    const parts = a.trim().split(' ');
    const last = parts[parts.length - 1];
    const initials = parts.slice(0, -1).map(n => n ? n[0] + '.' : '').filter(Boolean).join(' ');
    return initials ? `${last}, ${initials}` : last;
  }).join(', ');
  const year = paper.published.split('-')[0] || new Date().getFullYear().toString();
  return `${authors} (${year}). ${paper.title}. arXiv preprint arXiv:${paper.id}. https://doi.org/10.48550/arXiv.${paper.id}`;
}

export function formatIEEECitation(
  paper: { title: string; authors: string[]; published: string; id: string },
  referenceNumber?: number
): string {
  const authors = paper.authors.map(a => {
    const parts = a.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'Unknown';
    const last = parts.pop();
    const initials = parts.map(n => `${n[0]}.`).join(' ');
    return initials ? `${initials} ${last}` : last;
  }).join(', ');
  const year = paper.published.split('-')[0] || new Date().getFullYear().toString();
  const prefix = referenceNumber ? `[${referenceNumber}] ` : '';
  return `${prefix}${authors}, "${paper.title}," arXiv preprint arXiv:${paper.id}, ${year}. https://doi.org/10.48550/arXiv.${paper.id}`;
}

export function formatIEEEInTextCitation(referenceNumber: number): string {
  return `[${referenceNumber}]`;
}

export function formatInTextCitation(authors: string[], year: string): string {
  if (authors.length === 0) return `(Unknown, ${year})`;
  if (authors.length === 1) return `(${authors[0].trim().split(' ').pop()}, ${year})`;
  if (authors.length === 2) return `(${authors[0].trim().split(' ').pop()} & ${authors[1].trim().split(' ').pop()}, ${year})`;
  return `(${authors[0].trim().split(' ').pop()} et al., ${year})`;
}
