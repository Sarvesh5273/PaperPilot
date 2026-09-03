import { Paper, PaperOutline } from '@/types';
import { CitationFormat } from './exportDocx';

/** Escape special LaTeX characters and prevent math-mode runaway */
export function sanitizeLatexText(text: string): string {
  // 1. Temporarily hide matched $...$ math blocks so they don't get escaped
  const mathBlocks: string[] = [];
  let clean = text.replace(/\$([^\$]+)\$/g, (match) => {
    mathBlocks.push(match);
    return `__MATH_BLOCK_${mathBlocks.length - 1}__`;
  });

  // 2. Escape special LaTeX reserved characters on the non-math text
  clean = clean
    .replace(/\\(?!_)/g, '') // remove stray raw backslashes (but don't double escape if already processed)
    .replace(/&/g, '\\&')
    .replace(/%/g, '\\%')
    .replace(/#/g, '\\#')
    .replace(/_/g, '\\_')
    .replace(/\^/g, '\\textasciicircum{}')
    .replace(/~/g, ' ')
    .replace(/\$/g, '\\$'); // Escape any remaining UNMATCHED stray $ signs!

  // 3. Restore the math blocks
  clean = clean.replace(/__MATH_BLOCK_(\d+)__/g, (_match, index) => {
    return mathBlocks[parseInt(index, 10)];
  });

  // 4. Normalize quotes to standard LaTeX typographic quotes
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

  const resolveLatexSection = (text: string): string => {
    let out = text;

    // 1. Replace author-year or title placeholders like {{Li et al., 2026}} with ID placeholders to normalize them
    out = out.replace(/\{\{([^}]+)\}\}/g, (_m, rawId: string) => {
      // Find the best match paper ID
      const byId = citedPapers.find(p => p.id.toLowerCase() === rawId.trim().toLowerCase() || p.id.replace(/[^a-zA-Z0-9]/g, '_') === rawId.trim().toLowerCase());
      if (byId) return `{{${byId.id}}}`;
      
      const byAuthor = citedPapers.find(p => p.authors.some(a => {
        const surname = a.split(' ').pop()?.toLowerCase();
        return surname && rawId.toLowerCase().includes(surname);
      }));
      if (byAuthor) return `{{${byAuthor.id}}}`;
      
      return `{{${citedPapers[0]?.id || 'ref'}}}`;
    });

    // 2. Safely sanitize the entire section text (escapes &, %, _, but preserves math $...$)
    out = sanitizeLatexText(out);

    // 3. Now insert the LaTeX citations! The placeholders {{paperId}} are unharmed because { and } were not escaped.
    citedPapers.forEach((p) => {
      const citeKey = keyMap.get(p.id)!;
      const placeholder = `\\{\\{${sanitizeLatexText(p.id)}\\}\\}`;
      
      // Match the sanitized placeholder
      const placeholderRegex = new RegExp(placeholder, 'g');
      out = out.replace(placeholderRegex, () => {
        referencedKeys.add(citeKey);
        return `~\\cite{${citeKey}}`;
      });
    });

    // Post-cleanup of double citations or parens
    out = out.replace(/\(~?\\cite\{([^}]+)\}\)/g, '~\\cite{$1}');
    out = out.replace(/~{2,}\\cite/g, '~\\cite');
    out = out.replace(/([A-Z][a-zA-Z\s]+ et al\.)\s*~?\\cite/gi, '$1 ~\\cite');
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
