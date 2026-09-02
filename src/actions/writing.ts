import { PaperOutline, PaperSection, CollectionPaper } from '@/types';
import { loadCollections, loadOutlines, saveOutlines } from '@/lib/storage';
import { formatAPACitation, formatInTextCitation } from '@/lib/citations';

const OUTLINE_TEMPLATES: Record<'literature_review' | 'research_article' | 'thesis_chapter', string[]> = {
  literature_review: ['Introduction', 'Related Work', 'Thematic Analysis', 'Critical Discussion', 'Conclusion'],
  research_article: ['Introduction', 'Background', 'Methodology', 'Results', 'Discussion', 'Conclusion'],
  thesis_chapter: ['Introduction', 'Literature Review', 'Theoretical Framework', 'Methodology', 'Findings', 'Discussion'],
};

export async function generateOutlineAction(
  collectionId: string,
  paperType: 'research_article' | 'literature_review' | 'thesis_chapter' = 'literature_review'
): Promise<PaperOutline> {
  if (!collectionId || !collectionId.trim()) {
    throw new Error('Collection ID cannot be empty.');
  }

  const collections = loadCollections();
  const collection = collections.find(c => c.id === collectionId);
  if (!collection) {
    throw new Error(`Collection with ID ${collectionId} not found.`);
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
    collectionId,
    createdAt: new Date().toISOString(),
  };

  const existingOutlines = loadOutlines();
  saveOutlines([...existingOutlines, outline]);
  return outline;
}

export async function draftSectionAction(
  outlineId: string,
  sectionId: string,
  tone: 'academic' | 'critical' | 'synthesis' = 'academic'
): Promise<{ draft: string; citationsUsed: string[] }> {
  if (!outlineId || !outlineId.trim()) {
    throw new Error('Outline ID cannot be empty.');
  }
  if (!sectionId || !sectionId.trim()) {
    throw new Error('Section ID cannot be empty.');
  }

  const outlines = loadOutlines();
  const outline = outlines.find(o => o.id === outlineId);
  if (!outline) {
    throw new Error(`Outline with ID ${outlineId} not found.`);
  }

  const section = outline.sections.find(s => s.id === sectionId);
  if (!section) {
    throw new Error(`Section ${sectionId} not found in outline ${outlineId}.`);
  }

  const collections = loadCollections();
  const collection = collections.find(c => c.id === outline.collectionId);
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
    // synthesis tone
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
  outlineId: string,
  sectionId: string,
  paperId: string,
  placeholder: string
): Promise<{ formattedCitation: string; inText: string }> {
  if (!outlineId || !outlineId.trim()) {
    throw new Error('Outline ID cannot be empty.');
  }
  if (!sectionId || !sectionId.trim()) {
    throw new Error('Section ID cannot be empty.');
  }
  if (!paperId || !paperId.trim()) {
    throw new Error('Paper ID cannot be empty.');
  }

  const outlines = loadOutlines();
  const outline = outlines.find(o => o.id === outlineId);
  if (!outline) {
    throw new Error(`Outline with ID ${outlineId} not found.`);
  }

  const section = outline.sections.find(s => s.id === sectionId);
  if (!section) {
    throw new Error(`Section ${sectionId} not found in outline ${outlineId}.`);
  }

  const collections = loadCollections();
  const collection = collections.find(c => c.id === outline.collectionId);
  const paper = collection?.papers.find(p => p.id === paperId) || collections.flatMap(c => c.papers).find(p => p.id === paperId);

  if (!paper) {
    throw new Error(`Paper ${paperId} not found in any collection for citation.`);
  }

  const inText = formatInTextCitation(paper.authors, paper.published.split('-')[0]);
  const formatted = formatAPACitation(paper);

  if (placeholder && section.humanEdit.includes(placeholder)) {
    section.humanEdit = section.humanEdit.replaceAll(placeholder, inText);
  } else {
    section.humanEdit = section.humanEdit ? `${section.humanEdit} ${inText}` : inText;
  }

  const existingCitation = section.citations.find(c => c.paperId === paperId);
  if (!existingCitation) {
    section.citations.push({ paperId, placeholder: placeholder || `{{${paperId}}}`, formatted });
  }

  saveOutlines(outlines);
  return { formattedCitation: formatted, inText };
}

export async function verifyClaimAction(
  outlineId: string,
  sectionId: string,
  claimText: string,
  paperId: string
): Promise<{ verified: boolean; confidence: 'high' | 'medium' | 'low'; evidence: string }> {
  if (!outlineId || !outlineId.trim()) {
    throw new Error('Outline ID cannot be empty.');
  }
  if (!sectionId || !sectionId.trim()) {
    throw new Error('Section ID cannot be empty.');
  }
  if (!claimText || !claimText.trim()) {
    throw new Error('Claim text cannot be empty.');
  }
  if (!paperId || !paperId.trim()) {
    throw new Error('Paper ID cannot be empty.');
  }

  const outlines = loadOutlines();
  const outline = outlines.find(o => o.id === outlineId);
  if (!outline) {
    throw new Error(`Outline with ID ${outlineId} not found.`);
  }

  const collections = loadCollections();
  const collection = collections.find(c => c.id === outline.collectionId);
  const paper = collection?.papers.find(p => p.id === paperId) || collections.flatMap(c => c.papers).find(p => p.id === paperId);

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
  outlineId: string,
  fromSectionId: string,
  toSectionId: string
): Promise<{ transitionText: string }> {
  if (!outlineId || !outlineId.trim()) {
    throw new Error('Outline ID cannot be empty.');
  }
  if (!fromSectionId || !fromSectionId.trim()) {
    throw new Error('Preceding section ID cannot be empty.');
  }
  if (!toSectionId || !toSectionId.trim()) {
    throw new Error('Succeeding section ID cannot be empty.');
  }

  const outlines = loadOutlines();
  const outline = outlines.find(o => o.id === outlineId);
  if (!outline) {
    throw new Error(`Outline with ID ${outlineId} not found.`);
  }

  const fromSection = outline.sections.find(s => s.id === fromSectionId);
  const toSection = outline.sections.find(s => s.id === toSectionId);

  if (!fromSection || !toSection) {
    throw new Error(`Section ${!fromSection ? fromSectionId : toSectionId} not found in outline ${outlineId}.`);
  }

  const fromTitle = fromSection.title.toLowerCase();
  const toTitle = toSection.title.toLowerCase();

  const transitionText = `Building on the discussion of ${fromTitle}, we now turn our attention to ${toTitle}. This progression connects foundational observations with subsequent analytical developments.`;

  return { transitionText };
}
