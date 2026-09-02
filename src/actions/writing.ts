import { PaperOutline, PaperSection, CollectionPaper } from '@/types';
import { loadCollections, loadOutlines, saveOutlines } from '@/lib/storage';
import { formatAPACitation, formatInTextCitation } from '@/lib/citations';

const OUTLINE_TEMPLATES: Record<'literature_review' | 'research_article' | 'thesis_chapter', string[]> = {
  literature_review: ['Introduction', 'Related Work', 'Thematic Analysis', 'Critical Discussion', 'Conclusion'],
  research_article: ['Introduction', 'Background', 'Methodology', 'Results', 'Discussion', 'Conclusion'],
  thesis_chapter: ['Introduction', 'Literature Review', 'Theoretical Framework', 'Methodology', 'Findings', 'Discussion'],
};

export async function generateOutlineAction(
  collectionIdOrName: string,
  paperType: 'research_article' | 'literature_review' | 'thesis_chapter' = 'literature_review'
): Promise<PaperOutline> {
  if (!collectionIdOrName || !collectionIdOrName.trim()) {
    throw new Error('Collection identifier cannot be empty.');
  }

  const collections = loadCollections();
  const collection = collections.find(
    c => c.id === collectionIdOrName || c.name.toLowerCase() === collectionIdOrName.toLowerCase()
  );
  if (!collection) {
    throw new Error(`Collection "${collectionIdOrName}" not found.`);
  }

  const templateSections = OUTLINE_TEMPLATES[paperType] || OUTLINE_TEMPLATES.literature_review;
  const sections: PaperSection[] = templateSections.map((title, i) => ({
    id: `sec-${Date.now()}-${i}`,
    title,
    agentDraft: '',
    humanEdit: '',
    status: 'draft',
    citations: [],
    order: i,
  }));

  const outline: PaperOutline = {
    id: `outline-${Date.now()}`,
    title: `${collection.name} — ${paperType.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}`,
    sections,
    collectionId: collection.id,
    createdAt: new Date().toISOString(),
  };

  const existingOutlines = loadOutlines();
  saveOutlines([...existingOutlines, outline]);
  return outline;
}

export async function draftSectionAction(
  arg1: string,
  arg2: string,
  arg3?: 'academic' | 'critical' | 'synthesis'
): Promise<{ draft: string; citationsUsed: string[] }> {
  if (!arg1 || !arg1.trim()) throw new Error('Section or Outline ID cannot be empty.');
  if (!arg2 || !arg2.trim()) throw new Error('Section ID or Collection name cannot be empty.');

  const outlines = loadOutlines();
  let outline: PaperOutline | undefined;
  let section: PaperSection | undefined;

  // Check if arg1 is outlineId and arg2 is sectionId
  const outlineById = outlines.find(o => o.id === arg1);
  if (outlineById) {
    outline = outlineById;
    section = outline.sections.find(s => s.id === arg2);
  }

  // If not found, check if arg1 is sectionId directly across outlines
  if (!section) {
    for (const o of outlines) {
      const foundSec = o.sections.find(s => s.id === arg1);
      if (foundSec) {
        outline = o;
        section = foundSec;
        break;
      }
    }
  }

  if (!outline || !section) {
    throw new Error(`Section "${arg1}" or "${arg2}" not found in any outline.`);
  }

  const tone: 'academic' | 'critical' | 'synthesis' =
    arg3 || (['academic', 'critical', 'synthesis'].includes(arg2) ? (arg2 as 'academic' | 'critical' | 'synthesis') : 'academic');

  const collections = loadCollections();
  const collection = collections.find(c => c.id === outline?.collectionId || c.name.toLowerCase() === arg2.toLowerCase()) || collections[0];
  const papers: CollectionPaper[] = collection?.papers.slice(0, 3) || [];

  const usable = (value: string | undefined, fallback: string) => {
    const normalized = value?.trim();
    return normalized && normalized !== 'Not explicitly stated' ? normalized.replace(/\s+/g, ' ') : fallback;
  };
  const authorName = (paper: CollectionPaper) => paper.authors[0]?.trim().split(/\s+/).pop() || 'The authors';
  const year = (paper: CollectionPaper) => paper.published.split('-')[0] || 'n.d.';
  const evidence = (paper: CollectionPaper) => usable(
    paper.extractedFindings?.keyClaims.find(claim => claim !== 'Not explicitly stated'),
    usable(paper.extractedFindings?.conclusionSummary, `the study addresses ${section.title.toLowerCase()}`)
  );

  let draft: string;
  if (papers.length === 0) {
    draft = `This section introduces ${section.title.toLowerCase()} and establishes the concepts that guide the discussion. Add papers to the collection to ground this overview in specific evidence.`;
  } else {
    const sourceSentences = papers.map(p =>
      `${authorName(p)} (${year(p)}) reports that ${evidence(p)} ({{${p.id}}}).`
    );
    const opening = `This section considers ${section.title.toLowerCase()} through ${papers.length} selected source${papers.length === 1 ? '' : 's'}.`;
    if (tone === 'critical') {
      const limitation = usable(papers[0].extractedFindings?.limitations?.[0], 'its scope remains bounded by the available evidence');
      draft = `${opening} ${sourceSentences.join(' ')} However, ${limitation}; this limitation should be considered when interpreting the findings.`;
    } else if (tone === 'synthesis') {
      draft = `${opening} ${sourceSentences.join(' ')} Taken together, these findings frame ${section.title.toLowerCase()} as an area shaped by complementary evidence rather than a single definitive account.`;
    } else {
      draft = `${opening} ${sourceSentences.join(' ')} These findings provide a basis for the analysis that follows.`;
    }
  }

  section.agentDraft = draft;
  if (!section.humanEdit) {
    section.humanEdit = draft;
  }
  saveOutlines(outlines);

  return {
    draft,
    citationsUsed: papers.map(p => p.id),
  };
}

export async function insertCitationAction(
  arg1: string,
  arg2?: string,
  arg3?: string,
  arg4?: string
): Promise<{ formattedCitation: string; inText: string }> {
  const outlines = loadOutlines();
  let outline: PaperOutline | undefined;
  let section: PaperSection | undefined;

  // Case A: 4 args: (outlineId, sectionId, paperId, placeholder)
  if (arg3 && arg4) {
    outline = outlines.find(o => o.id === arg1);
    section = outline?.sections.find(s => s.id === arg2);
  } else {
    // Case B: 2 args: (sectionId, collectionName)
    for (const o of outlines) {
      const foundSec = o.sections.find(s => s.id === arg1);
      if (foundSec) {
        outline = o;
        section = foundSec;
        break;
      }
    }
  }

  if (!outline || !section) {
    throw new Error(`Section "${arg1}" not found in any outline.`);
  }

  const collections = loadCollections();
  const allPapers = collections.flatMap(c => c.papers);

  let paperId = arg3;
  let placeholder = arg4;

  // If paperId not specified in args, extract from placeholders in section text
  if (!paperId) {
    const text = section.humanEdit || section.agentDraft || '';
    const match = text.match(/\{\{([^}]+)\}\}/);
    if (match) {
      paperId = match[1];
      placeholder = match[0];
    } else if (allPapers.length > 0) {
      paperId = allPapers[0].id;
      placeholder = `{{${paperId}}}`;
    }
  }

  if (!paperId) {
    throw new Error('No paper ID found to insert citation.');
  }

  const paper = allPapers.find(p => p.id === paperId);
  if (!paper) {
    throw new Error(`Paper ${paperId} not found in any collection.`);
  }

  const inText = formatInTextCitation(paper.authors, paper.published.split('-')[0]);
  const formatted = formatAPACitation(paper);

  if (placeholder && section.humanEdit.includes(placeholder)) {
    section.humanEdit = section.humanEdit.replaceAll(placeholder, inText);
  } else {
    section.humanEdit = section.humanEdit ? `${section.humanEdit} ${inText}` : inText;
  }

  if (!section.citations.some(c => c.paperId === paperId)) {
    section.citations.push({ paperId, placeholder: placeholder || `{{${paperId}}}`, formatted });
  }

  saveOutlines(outlines);
  return { formattedCitation: formatted, inText };
}

export async function verifyClaimAction(
  arg1: string,
  arg2: string,
  arg3: string,
  arg4?: string
): Promise<{ verified: boolean; confidence: 'high' | 'medium' | 'low'; evidence: string }> {
  let sectionId = arg1;
  let claimText = arg2;
  let paperId = arg3;

  // If 4 args: (outlineId, sectionId, claimText, paperId)
  if (arg4) {
    sectionId = arg2;
    claimText = arg3;
    paperId = arg4;
  }

  if (!claimText || !claimText.trim()) throw new Error('Claim text cannot be empty.');
  if (!paperId || !paperId.trim()) throw new Error('Paper ID cannot be empty.');

  const collections = loadCollections();
  const allPapers = collections.flatMap(c => c.papers);
  const paper = allPapers.find(p => p.id === paperId);

  if (!paper) {
    throw new Error(`Paper ${paperId} not found in any collection for claim verification.`);
  }

  if (!paper.extractedFindings) {
    return {
      verified: false,
      confidence: 'low',
      evidence: `No extracted findings available for paper ${paperId}. Please extract findings first.`,
    };
  }

  const claimWords = claimText.toLowerCase().split(/\W+/).filter(w => w.length > 3);
  if (claimWords.length === 0) {
    return {
      verified: false,
      confidence: 'low',
      evidence: 'Claim text does not contain sufficient distinctive keywords for verification.',
    };
  }

  const findingsCorpus = [
    ...paper.extractedFindings.keyClaims,
    paper.extractedFindings.methodology,
    paper.extractedFindings.researchQuestion,
    paper.abstract,
  ].join(' ').toLowerCase();

  const matchingWords = claimWords.filter(w => findingsCorpus.includes(w));
  const ratio = matchingWords.length / claimWords.length;

  let confidence: 'high' | 'medium' | 'low' = 'low';
  if (ratio > 0.6) {
    confidence = 'high';
  } else if (ratio > 0.3) {
    confidence = 'medium';
  }

  return {
    verified: confidence !== 'low',
    confidence,
    evidence: confidence === 'high'
      ? `Strong keyword alignment (${Math.round(ratio * 100)}% match: "${matchingWords.slice(0, 4).join(', ')}") with paper findings in ${paper.title}.`
      : confidence === 'medium'
      ? `Moderate keyword alignment (${Math.round(ratio * 100)}%) with paper findings. Partial evidence confirmed.`
      : `Limited keyword alignment (${Math.round(ratio * 100)}%). Manual inspection against ${paper.title} is recommended.`,
  };
}

export async function suggestTransitionAction(
  arg1: string,
  arg2: string,
  arg3?: string
): Promise<{ transitionText: string }> {
  let fromSectionId = arg1;
  let toSectionId = arg2;

  // If 3 args: (outlineId, fromSectionId, toSectionId)
  if (arg3) {
    fromSectionId = arg2;
    toSectionId = arg3;
  }

  const outlines = loadOutlines();
  let fromSection: PaperSection | undefined;
  let toSection: PaperSection | undefined;

  for (const o of outlines) {
    const s1 = o.sections.find(s => s.id === fromSectionId);
    const s2 = o.sections.find(s => s.id === toSectionId);
    if (s1) fromSection = s1;
    if (s2) toSection = s2;
    if (fromSection && toSection) break;
  }

  if (!fromSection || !toSection) {
    throw new Error(`Section "${fromSectionId}" or "${toSectionId}" not found in outlines.`);
  }

  const fromTitle = fromSection.title.toLowerCase();
  const toTitle = toSection.title.toLowerCase();
  const transitionText = `Building on the discussion of ${fromTitle}, we now turn our attention to ${toTitle}. This progression connects foundational observations with subsequent analytical developments.`;

  return { transitionText };
}
