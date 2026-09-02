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

  let draft = '';
  if (tone === 'academic') {
    if (papers.length === 0) {
      draft = `This section examines key theoretical arguments and empirical evidence relevant to ${section.title.toLowerCase()}. Further literature will be synthesized as papers are added to the collection.`;
    } else {
      draft = papers.map(p => {
        const author = p.authors[0]?.trim().split(' ').pop() || 'Author';
        const year = p.published.split('-')[0] || 'n.d.';
        const claim = p.extractedFindings?.keyClaims[0] && p.extractedFindings.keyClaims[0] !== 'Not explicitly stated'
          ? p.extractedFindings.keyClaims[0]
          : 'notable empirical advancements';
        return `${author} (${year}) argues that ${claim} ({{${p.id}}}).`;
      }).join(' ');
    }
  } else if (tone === 'critical') {
    if (papers.length >= 2) {
      const p1 = papers[0];
      const p2 = papers[1];
      const a1 = p1.authors[0]?.trim().split(' ').pop() || 'Author';
      const y1 = p1.published.split('-')[0] || 'n.d.';
      const c1 = p1.extractedFindings?.keyClaims[0] || 'the primary operational approach';
      const a2 = p2.authors[0]?.trim().split(' ').pop() || 'Author';
      const y2 = p2.published.split('-')[0] || 'n.d.';
      const c2 = p2.extractedFindings?.keyClaims[0] || 'an alternative paradigm';
      draft = `While ${a1} (${y1}) suggests that ${c1} ({{${p1.id}}}), ${a2} (${y2}) counters that ${c2} ({{${p2.id}}}).`;
    } else if (papers.length === 1) {
      const p1 = papers[0];
      const a1 = p1.authors[0]?.trim().split(' ').pop() || 'Author';
      const y1 = p1.published.split('-')[0] || 'n.d.';
      const c1 = p1.extractedFindings?.keyClaims[0] || 'the primary empirical finding';
      draft = `Critical evaluation of ${a1} (${y1}) reveals that ${c1} ({{${p1.id}}}), though broader comparative validation is required.`;
    } else {
      draft = `Critical analysis of current methodologies in ${section.title.toLowerCase()} indicates key trade-offs between theoretical completeness and practical deployability.`;
    }
  } else {
    if (papers.length > 0) {
      const contributions = papers.map(p => {
        const author = p.authors[0]?.trim().split(' ').pop() || 'Author';
        const year = p.published.split('-')[0] || 'n.d.';
        const claim = p.extractedFindings?.keyClaims[0] || 'methodological contributions';
        return `${author} (${year}) contributes ${claim} ({{${p.id}}})`;
      }).join(', ');
      draft = `The literature regarding ${section.title.toLowerCase()} reveals converging perspectives: ${contributions}. Together, these contributions inform a coherent conceptual framework.`;
    } else {
      draft = `Synthesizing current investigations into ${section.title.toLowerCase()} provides an integrated view across foundational principles and experimental results.`;
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
