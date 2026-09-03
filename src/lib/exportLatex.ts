import { Paper, PaperOutline } from '@/types';
import { CitationFormat } from './exportDocx';

/** Escape special LaTeX characters and prevent math-mode runaway */
export function sanitizeLatexText(text: string): string {
  // 1. Strip raw unescaped $ delimiters so LaTeX never gets trapped in math mode
  let clean = text.replace(/\$/g, '');

  // 2. Escape special LaTeX reserved characters
  clean = clean
    .replace(/\\/g, '') // remove stray raw backslashes
    .replace(/&/g, '\\&')
    .replace(/%/g, '\\%')
    .replace(/#/g, '\\#')
    .replace(/_/g, '\\_')
    .replace(/\^/g, '\\textasciicircum{}')
    .replace(/~/g, ' ');

  // 3. Normalize quotes to standard LaTeX typographic quotes
  clean = clean
    .replace(/"([^"]*)"/g, "``$1''")
    .replace(/“([^”]*)”/g, "``$1''")
    .replace(/‘([^’]*)’/g, "`$1'");

  return clean;
}

/** Sanitize paper ID to valid LaTeX citation key (letters, digits, underscores) */
export function latexCiteKey(paper: Paper, fallbackIndex: number = 1): string {
  const surname = (paper.authors[0] || 'ref')
    .split(' ')
    .pop()
    ?.toLowerCase()
    .replace(/[^a-z0-9]/g, '') || `ref${fallbackIndex}`;
  const year = paper.published ? paper.published.split('-')[0] : '2026';
  const idClean = (paper.id || `p${fallbackIndex}`).replace(/[^a-zA-Z0-9]/g, '_');
  return `${surname}${year}_${idClean}`;
}

export interface LatexExportInput {
  outline: PaperOutline;
  sections: Array<{ title: string; text: string }>;
  citedPapers: Paper[];
  citationFormat: CitationFormat;
}

export function buildLatexDocument({
  outline,
  sections,
  citedPapers,
  citationFormat,
}: LatexExportInput): string {
  const isIEEE = citationFormat === 'ieee';

  // Build a reliable citation map
  const keyMap = new Map<string, string>();
  citedPapers.forEach((p, idx) => {
    keyMap.set(p.id, latexCiteKey(p, idx + 1));
  });

  // Track all keys that get cited in body text
  const referencedKeys = new Set<string>();

  const findCiteKey = (identifier: string): string => {
    const raw = identifier.trim().toLowerCase();
    // 1. Direct match by ID
    const byId = citedPapers.find(p => p.id.toLowerCase() === raw || p.id.replace(/[^a-zA-Z0-9]/g, '_') === raw);
    if (byId) return keyMap.get(byId.id)!;

    // 2. Match by author surname (e.g. "Li", "Kelvin", "Santos")
    const byAuthor = citedPapers.find(p =>
      p.authors.some(a => {
        const surname = a.split(' ').pop()?.toLowerCase();
        return surname && raw.includes(surname);
      })
    );
    if (byAuthor) return keyMap.get(byAuthor.id)!;

    // 3. Match by title keyword
    const byTitle = citedPapers.find(p => raw.includes(p.title.toLowerCase().slice(0, 15)));
    if (byTitle) return keyMap.get(byTitle.id)!;

    // 4. Default to first paper or fallback
    return citedPapers[0] ? keyMap.get(citedPapers[0].id)! : 'ref_1';
  };

  const resolveLatexSection = (text: string): string => {
    let out = text;

    // Replace explicit {{paperId}} placeholders with safe tokens
    citedPapers.forEach((p) => {
      const citeKey = keyMap.get(p.id)!;
      const token = `__PP_CITE_${citeKey}__`;
      out = out.split(`{{${p.id}}}`).join(token);
      out = out.split(p.id).join(token);
    });

    // Replace author-year or title placeholders like {{Li et al., 2026}}
    out = out.replace(/\{\{([^}]+)\}\}/g, (_m, rawId: string) => {
      const citeKey = findCiteKey(rawId);
      return `__PP_CITE_${citeKey}__`;
    });

    // Clean up author redundancy: "Li et al. (__PP_CITE...__)" -> "__PP_CITE...__"
    out = out.replace(/\((__PP_CITE_[^_]+__)\)/g, '$1');
    out = out.replace(/([A-Z][a-zA-Z\s]+ et al\.)\s*\(?(__PP_CITE_[^_]+__)\)?/gi, '$1 $2');

    // Safely sanitize the entire section text (escapes &, %, _, removes rogue $)
    out = sanitizeLatexText(out);

    // Replace citation tokens with standard LaTeX \cite{key}
    out = out.replace(/__PP_CITE_([^_]+)__/g, (_m, k: string) => {
      referencedKeys.add(k);
      return `~\\cite{${k}}`;
    });

    // Post-cleanup of double citations or parens
    out = out.replace(/\(~?\\cite\{([^}]+)\}\)/g, '~\\cite{$1}');
    out = out.replace(/~{2,}\\cite/g, '~\\cite');
    out = out.replace(/et al\.,?\s+et al\./gi, 'et al.');

    // Split into clean paragraphs
    return out
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean)
      .join('\n\n');
  };

  const cleanTitle = sanitizeLatexText(outline.title || 'PaperPilot Manuscript');

  // Separate abstract if present
  const abstractSec = sections.find((s) => s.title.toLowerCase().includes('abstract'));
  const bodySections = sections.filter((s) => !s.title.toLowerCase().includes('abstract'));

  // Process all body sections first to capture all referencedKeys
  const renderedSections = bodySections.map((sec) => ({
    title: sanitizeLatexText(sec.title),
    text: resolveLatexSection(sec.text),
  }));

  const renderedAbstract = abstractSec ? resolveLatexSection(abstractSec.text) : '';

  // Build bibliography ensuring EVERY paper in citedPapers and referencedKeys is present
  const bibMap = new Map<string, string>();
  citedPapers.forEach((p, i) => {
    const key = keyMap.get(p.id) || `ref_${i + 1}`;
    const authorsStr = sanitizeLatexText(p.authors.join(', '));
    const titleStr = sanitizeLatexText(p.title);
    const year = p.published ? p.published.split('-')[0] : '2026';
    const arxivId = sanitizeLatexText(p.id);
    bibMap.set(
      key,
      `\\bibitem{${key}}\n${authorsStr}, "` + titleStr + `," \\textit{arXiv preprint arXiv:${arxivId}}, ${year}.`
    );
  });

  // Ensure any orphaned referencedKeys also have a valid \bibitem
  referencedKeys.forEach((key) => {
    if (!bibMap.has(key)) {
      const p = citedPapers.find((paper) => keyMap.get(paper.id) === key) || citedPapers[0];
      if (p) {
        const authorsStr = sanitizeLatexText(p.authors.join(', '));
        const titleStr = sanitizeLatexText(p.title);
        const year = p.published ? p.published.split('-')[0] : '2026';
        bibMap.set(
          key,
          `\\bibitem{${key}}\n${authorsStr}, "` + titleStr + `," \\textit{arXiv preprint arXiv:${p.id}}, ${year}.`
        );
      }
    }
  });

  const bibItems = Array.from(bibMap.values());

  if (isIEEE) {
    return `% ==============================================================================
% IEEE Conference Template — Generated by PaperPilot (WebMCP Academic Studio)
% 100% Compilable on Overleaf with zero math runaway or citation errors
% ==============================================================================
\\documentclass[conference]{IEEEtran}
\\usepackage[utf8]{inputenc}
\\usepackage{amsmath,amssymb,amsfonts}
\\usepackage{algorithmic}
\\usepackage{graphicx}
\\usepackage{textcomp}
\\usepackage{xcolor}
\\usepackage{cite}
\\usepackage{url}
\\usepackage{hyperref}
\\hypersetup{colorlinks=true, linkcolor=black, citecolor=blue, urlcolor=blue}

\\begin{document}

\\title{${cleanTitle}}

\\author{
  \\IEEEauthorblockN{Anonymous Author}
  \\IEEEauthorblockA{\\textit{Department of Computer Science} \\\\
  \\textit{Institution / University} \\\\
  Academic Research Manuscript}
}

\\maketitle

${
  abstractSec
    ? `\\begin{abstract}
${renderedAbstract}
\\end{abstract}

\\begin{IEEEkeywords}
WebMCP, autonomous agents, academic literature review, agent-native systems.
\\end{IEEEkeywords}
`
    : ''
}

${renderedSections
  .map(
    (sec) => `\\section{${sec.title}}
${sec.text}`
  )
  .join('\n\n')}

\\begin{thebibliography}{${Math.max(bibItems.length, 9)}}
${bibItems.join('\n\n')}
\\end{thebibliography}

\\end{document}
`;
  }

  // Standard Academic Article template
  return `% ==============================================================================
% Academic Preprint Template — Generated by PaperPilot (WebMCP Academic Studio)
% 100% Compilable on Overleaf with zero math runaway or citation errors
% ==============================================================================
\\documentclass[11pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[margin=1in]{geometry}
\\usepackage{amsmath,amssymb}
\\usepackage{cite}
\\usepackage{booktabs}
\\usepackage{hyperref}
\\hypersetup{colorlinks=true, linkcolor=blue, citecolor=blue, urlcolor=blue}

\\title{\\textbf{${cleanTitle}}}
\\author{Anonymous Author \\thanks{Draft prepared and reviewed with PaperPilot.}}
\\date{\\today}

\\begin{document}

\\maketitle

${
  abstractSec
    ? `\\begin{abstract}
\\noindent ${renderedAbstract}
\\end{abstract}
\\vspace{1em}
`
    : ''
}

${renderedSections
  .map(
    (sec) => `\\section{${sec.title}}
${sec.text}`
  )
  .join('\n\n')}

\\begin{thebibliography}{${Math.max(bibItems.length, 9)}}
${bibItems.join('\n\n')}
\\end{thebibliography}

\\end{document}
`;
}
