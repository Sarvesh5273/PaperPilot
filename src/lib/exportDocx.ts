import {
  AlignmentType,
  convertInchesToTwip,
  Document,
  Footer,
  Header,
  Packer,
  PageNumber,
  Paragraph,
  SectionType,
  TextRun,
} from 'docx';
import { Paper, PaperOutline } from '@/types';
import {
  formatAPACitation,
  formatIEEECitation,
  formatIEEEInTextCitation,
  formatInTextCitation,
} from './citations';

export type CitationFormat = 'apa' | 'ieee';

export interface DocxExportInput {
  outline: PaperOutline;
  sections: Array<{ title: string; text: string }>;
  citedPapers: Paper[];
  citationFormat: CitationFormat;
}

const TNR = 'Times New Roman';
const HALF = (pt: number) => pt * 2; // docx font sizes are in half-points

/** Resolve {{paperId}} placeholders and author-year citations to the target style. */
export function resolveSectionText(text: string, citedPapers: Paper[], citationFormat: CitationFormat): string {
  let out = text;
  if (citationFormat === 'ieee') {
    citedPapers.forEach((paper, i) => {
      const n = formatIEEEInTextCitation(i + 1);
      const placeholder = `{{${paper.id}}}`;
      const authorYear = formatInTextCitation(paper.authors, paper.published.split('-')[0]);
      out = out.split(`(${placeholder})`).join(n);
      out = out.split(placeholder).join(n);
      out = out.split(`(${authorYear})`).join(n);
      out = out.split(authorYear).join(n);
    });
    // Replace any remaining {{id}} with numbered citation
    out = out.replace(/\{\{([^}]+)\}\}/g, (_match, id: string) => {
      const idx = citedPapers.findIndex(p => p.id === id || p.title.toLowerCase().includes(id.toLowerCase()));
      return idx >= 0 ? formatIEEEInTextCitation(idx + 1) : '[1]';
    });
    // Clean up nested or double brackets like (([1])) or ([1]) -> [1]
    out = out.replace(/\(\[([0-9,\s]+)\]\)/g, '[$1]');
    out = out.replace(/\(\(\[([0-9,\s]+)\]\)\)/g, '[$1]');
    out = out.replace(/\(\(([^\(\)]+)\)\)/g, '($1)');
    return out;
  }

  // APA format:
  citedPapers.forEach((paper) => {
    const placeholder = `{{${paper.id}}}`;
    const authorYear = formatInTextCitation(paper.authors, paper.published.split('-')[0]);
    out = out.split(`(${placeholder})`).join(authorYear);
    out = out.split(placeholder).join(authorYear);
  });
  out = out.replace(/\{\{([^}]+)\}\}/g, (_match, id: string) => {
    const paper = citedPapers.find(p => p.id === id || p.title.toLowerCase().includes(id.toLowerCase()));
    return paper ? formatInTextCitation(paper.authors, paper.published.split('-')[0]) : '';
  });
  // Clean up double parentheses and repetitive "et al."
  out = out.replace(/\(\(([^\(\)]+)\)\)/g, '($1)');
  out = out.replace(/et al\.,?\s+et al\./gi, 'et al.');
  return out;
}

function textParagraphs(text: string, opts: {
  size: number; justified?: boolean; firstLineIndent?: boolean; doubleSpaced?: boolean; after?: number;
}): Paragraph[] {
  return text
    .split(/\n{2,}/)
    .map(p => p.replace(/\n+/g, ' ').trim())
    .filter(Boolean)
    .map(body => new Paragraph({
      children: [new TextRun({ text: body, font: TNR, size: HALF(opts.size) })],
      alignment: opts.justified ? AlignmentType.JUSTIFIED : AlignmentType.LEFT,
      indent: opts.firstLineIndent ? { firstLine: convertInchesToTwip(0.5) } : undefined,
      spacing: {
        after: opts.after ?? (opts.doubleSpaced ? 0 : 120),
        line: opts.doubleSpaced ? 480 : 276, // 480 = double-spaced
        lineRule: 'auto',
      },
    }));
}

function pageNumberFooter(): Footer {
  return new Footer({
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ children: [PageNumber.CURRENT], font: TNR, size: HALF(10) })],
    })],
  });
}

function pageNumberHeader(): Header {
  return new Header({
    children: [new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [new TextRun({ children: [PageNumber.CURRENT], font: TNR, size: HALF(12) })],
    })],
  });
}

/** IEEE conference style: full-width title block, then two-column body, numbered refs. */
function buildIEEE({ outline, sections, citedPapers }: DocxExportInput): Document {
  const margin = convertInchesToTwip(0.75);
  const body: Paragraph[] = [];

  for (const sec of sections) {
    body.push(new Paragraph({
      children: [new TextRun({ text: sec.title.toUpperCase(), bold: true, font: TNR, size: HALF(10), smallCaps: true })],
      spacing: { before: 240, after: 120 },
    }));
    body.push(...textParagraphs(resolveSectionText(sec.text, citedPapers, 'ieee'), { size: 10, justified: true }));
  }

  body.push(new Paragraph({
    children: [new TextRun({ text: 'References', bold: true, font: TNR, size: HALF(10), smallCaps: true })],
    spacing: { before: 240, after: 120 },
  }));
  citedPapers.forEach((paper, i) => {
    body.push(new Paragraph({
      children: [new TextRun({ text: formatIEEECitation(paper, i + 1), font: TNR, size: HALF(10) })],
      indent: { left: convertInchesToTwip(0.25), hanging: convertInchesToTwip(0.25) },
      spacing: { after: 60 },
    }));
  });

  return new Document({
    creator: 'PaperPilot',
    title: outline.title,
    styles: { default: { document: { run: { font: TNR, size: HALF(10) } } } },
    sections: [
      {
        properties: { page: { margin: { top: margin, bottom: margin, left: margin, right: margin } } },
        footers: { default: pageNumberFooter() },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 240 },
            children: [new TextRun({ text: outline.title, bold: true, font: TNR, size: HALF(24) })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({
              text: 'Draft prepared in PaperPilot — apply your venue’s official template before submission.',
              italics: true, font: TNR, size: HALF(9),
            })],
          }),
        ],
      },
      {
        properties: {
          page: { margin: { top: margin, bottom: margin, left: margin, right: margin } },
          type: SectionType.CONTINUOUS,
          column: { count: 2, space: convertInchesToTwip(0.25) },
        },
        footers: { default: pageNumberFooter() },
        children: body,
      },
    ],
  });
}

/** APA 7 student style: title page, double-spaced indented body, hanging-indent refs. */
function buildAPA({ outline, sections, citedPapers }: DocxExportInput): Document {
  const margin = convertInchesToTwip(1);
  const centered = (text: string, opts?: { bold?: boolean; before?: number; after?: number }) =>
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: opts?.before ?? 0, after: opts?.after ?? 240 },
      children: [new TextRun({ text, bold: opts?.bold ?? false, font: TNR, size: HALF(12) })],
    });

  const body: Paragraph[] = [centered(outline.title, { bold: true, before: 240, after: 480 })];
  for (const sec of sections) {
    body.push(centered(sec.title, { bold: true, before: 240, after: 0 }));
    body.push(...textParagraphs(resolveSectionText(sec.text, citedPapers, 'apa'), {
      size: 12, firstLineIndent: true, doubleSpaced: true,
    }));
  }

  body.push(centered('References', { bold: true, before: 480, after: 0 }));
  for (const paper of citedPapers) {
    body.push(new Paragraph({
      children: [new TextRun({ text: formatAPACitation(paper), font: TNR, size: HALF(12) })],
      indent: { left: convertInchesToTwip(0.5), hanging: convertInchesToTwip(0.5) },
      spacing: { line: 480, lineRule: 'auto' },
    }));
  }

  return new Document({
    creator: 'PaperPilot',
    title: outline.title,
    styles: { default: { document: { run: { font: TNR, size: HALF(12) } } } },
    sections: [
      {
        properties: { page: { margin: { top: margin, bottom: margin, left: margin, right: margin } } },
        headers: { default: pageNumberHeader() },
        children: [
          centered('', { after: 1440 }), // push title into upper half of page
          centered(outline.title, { bold: true, after: 480 }),
          centered('Your Name'),
          centered('Department, University'),
          centered('Course Code: Course Name'),
          centered('Instructor Name'),
          centered(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })),
        ],
      },
      {
        properties: {
          page: { margin: { top: margin, bottom: margin, left: margin, right: margin } },
          type: SectionType.NEXT_PAGE,
        },
        headers: { default: pageNumberHeader() },
        children: body,
      },
    ],
  });
}

/** Build a .docx Blob in the browser. */
export async function buildDocxBlob(input: DocxExportInput): Promise<Blob> {
  const doc = input.citationFormat === 'ieee' ? buildIEEE(input) : buildAPA(input);
  return Packer.toBlob(doc);
}