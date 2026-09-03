import { PaperOutline, PaperSection, CollectionPaper } from '@/types';
import { loadCollections, loadOutlines, saveOutlines } from '@/lib/storage';
import { formatAPACitation, formatInTextCitation } from '@/lib/citations';
import { generateDraftWithGemini } from '@/lib/gemini';

const NOT_STATED = 'Not explicitly stated';

const OUTLINE_TEMPLATES: Record<'literature_review' | 'research_article' | 'thesis_chapter', string[]> = {
  literature_review: ['Introduction', 'Related Work', 'Thematic Analysis', 'Critical Discussion', 'Conclusion'],
  research_article: ['Abstract', 'Introduction', 'Background', 'Methodology', 'Results', 'Discussion', 'Conclusion'],
  thesis_chapter: ['Abstract', 'Introduction', 'Literature Review', 'Theoretical Framework', 'Methodology', 'Findings', 'Discussion'],
};

function sectionGuidanceFor(title: string): string {
  const t = title.toLowerCase();
  if (t.includes('abstract')) return 'Write a single 150–200 word paragraph: purpose of the paper, approach, principal findings, and significance. No citations.';
  if (t.includes('intro')) return 'Introduce the topic, motivate the problem, and preview the paper structure. 200–300 words.';
  if (t.includes('method')) return 'Describe and, where sources differ, compare the methodologies, systems, or frameworks used. 200–300 words.';
  if (t.includes('result') || t.includes('finding')) return 'Present the principal quantitative and qualitative findings, preserving specific numbers and metrics from the sources. 200–300 words.';
  if (t.includes('background') || t.includes('related') || t.includes('literature')) return 'Situate the sources within the existing research landscape, grouping by theme or approach. 200–300 words.';
  if (t.includes('discussion') || t.includes('critical') || t.includes('thematic')) return 'Interpret and critically synthesize across sources: agreements, tensions, and implications. 200–300 words.';
  if (t.includes('framework') || t.includes('theoretical')) return 'Explain the conceptual or theoretical frameworks the sources rely on and how they relate. 200–300 words.';
  if (t.includes('conclusion') || t.includes('summary')) return 'Summarize the key takeaways and suggest concrete future research directions. 150–250 words.';
  return 'Write a coherent academic overview grounded in the sources. 200–300 words.';
}

function sectionCategory(title: string): string {
  const t = title.toLowerCase();
  if (t.includes('abstract')) return 'abstract';
  if (t.includes('method')) return 'methods';
  if (t.includes('result') || t.includes('finding')) return 'results';
  if (t.includes('conclusion') || t.includes('summary')) return 'conclusion';
  if (t.includes('discussion') || t.includes('critical')) return 'discussion';
  if (t.includes('background') || t.includes('related') || t.includes('literature') || t.includes('framework') || t.includes('thematic')) return 'background';
  return 'intro';
}

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
    title: `${collection.name} — ${paperType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}`,
    sections,
    collectionId: collection.id,
    createdAt: new Date().toISOString(),
  };

  const existingOutlines = loadOutlines();
  saveOutlines([outline, ...existingOutlines]);
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

  const outlineById = outlines.find(o => o.id === arg1);
  if (outlineById) {
    outline = outlineById;
    section = outline.sections.find(s => s.id === arg2);
  }

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
  const papers: CollectionPaper[] = collection?.papers.slice(0, 4) || [];
  const guidance = sectionGuidanceFor(section.title);
  const category = sectionCategory(section.title);

  let draft = '';

  try {
    draft = await generateDraftWithGemini({
      sectionTitle: section.title,
      tone,
      sectionGuidance: guidance,
      papers: papers.map(p => ({
        id: p.id,
        title: p.title,
        authors: p.authors,
        published: p.published,
        abstract: p.abstract,
        findings: p.extractedFindings,
      })),
    });
  } catch (err) {
    console.warn('[Gemini unavailable, using template fallback]:', err);

    const usable = (value: string | undefined, fallback: string) => {
      const normalized = value?.trim();
      return normalized && normalized !== NOT_STATED ? normalized.replace(/\s+/g, ' ') : fallback;
    };
    const clean = (text: string) => {
      const t = text.trim().replace(/\s+/g, ' ');
      return t.length > 1 && t[1] && t[1] === t[1].toLowerCase() ? t[0].toLowerCase() + t.slice(1) : t;
    };
    const pick = (p: CollectionPaper, field: 'claim' | 'method' | 'limit' | 'conclusion') => {
      const ef = p.extractedFindings;
      const raw =
        field === 'claim' ? ef?.keyClaims.find(c => c !== NOT_STATED) :
        field === 'method' ? ef?.methodology :
        field === 'limit' ? ef?.limitations.find(c => c !== NOT_STATED) :
        ef?.conclusionSummary;
      return clean(usable(raw, clean(usable(p.abstract, `the paper examines ${p.title.toLowerCase()}`))));
    };

    if (papers.length === 0) {
      draft = `This ${section.title.toLowerCase()} section introduces the concepts that guide the paper. Add papers to the collection to ground this overview in specific evidence.`;
    } else if (category === 'abstract') {
      const parts = papers.map(p => pick(p, 'conclusion'));
      draft = `This paper synthesizes ${papers.length} recent stud${papers.length === 1 ? 'y' : 'ies'} on the collection topic. ${parts.map((s, i) => `${papers[i].title.split(':')[0]} ${s}`).join(' ')} Together, these works establish the current state of the area and motivate the analysis presented in this paper.`;
    } else if (category === 'methods') {
      const methods = papers.map(p => `Prior work such as ${p.title.split(':')[0]} ${pick(p, 'method')}`);
      draft = `The selected sources adopt a range of methodological approaches. ${methods.join('; ')}. Comparing these designs reveals trade-offs between rigor, scalability, and practical deployability.`;
    } else if (category === 'results') {
      const results = papers.map(p => pick(p, 'claim'));
      draft = `Across the selected literature, several findings stand out. ${results.map((s, i) => `${papers[i].title.split(':')[0]} reports that ${s}`).join(' ')} These results, taken together, indicate measurable progress on the problems examined.`;
    } else if (category === 'conclusion') {
      const limits = papers.map(p => pick(p, 'limit')).filter(s => !s.startsWith('the paper examines'));
      draft = `In summary, the reviewed literature demonstrates substantive advances while leaving open questions for future work. ${limits.length > 0 ? `Notably, ${limits[0]}` : 'Further replication and broader evaluation remain important next steps'}. Addressing these gaps will strengthen the evidence base for subsequent research.`;
    } else {
      const evidence = papers.map(p => pick(p, 'claim'));
      const opening = `This section examines ${section.title.toLowerCase()} in light of ${papers.length} selected source${papers.length === 1 ? '' : 's'}.`;
      if (tone === 'critical') {
        const limit = papers[0] ? pick(papers[0], 'limit') : 'the evidence remains limited in scope';
        draft = `${opening} ${evidence.map((s, i) => `${papers[i].title.split(':')[0]} shows that ${s}`).join(' ')} However, ${limit}, and this limitation should temper any strong conclusions.`;
      } else if (tone === 'synthesis') {
        draft = `${opening} ${evidence.map((s, i) => `${papers[i].title.split(':')[0]} shows that ${s}`).join(' ')} Read together, these findings frame ${section.title.toLowerCase()} as an area shaped by converging but distinct lines of evidence.`;
      } else {
        draft = `${opening} ${evidence.map((s, i) => `${papers[i].title.split(':')[0]} shows that ${s}`).join(' ')} These findings provide the foundation for the analysis that follows.`;
      }
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

  if (arg3 && arg4) {
    outline = outlines.find(o => o.id === arg1);
    section = outline?.sections.find(s => s.id === arg2);
  } else {
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

  const wrappedPlaceholder = placeholder ? `(${placeholder})` : undefined;
  if (wrappedPlaceholder && section.humanEdit.includes(wrappedPlaceholder)) {
    section.humanEdit = section.humanEdit.replaceAll(wrappedPlaceholder, inText);
  } else if (placeholder && section.humanEdit.includes(placeholder)) {
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
  const { verifyClaimAction: verifyWithFullText } = await import('@/actions/papers');
  return verifyWithFullText(arg1, arg2, arg3, arg4);
}

export async function suggestTransitionAction(
  arg1: string,
  arg2: string,
  arg3?: string
): Promise<{ transitionText: string }> {
  let fromSectionId = arg1;
  let toSectionId = arg2;

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

export async function reviseSectionAction(
  arg1: string,
  arg2: string,
  arg3?: string
): Promise<{ sectionId: string; textLength: number }> {
  const outlines = loadOutlines();
  let outline: PaperOutline | undefined;
  let section: PaperSection | undefined;
  const newText = (arg3 || arg2 || '').trim();

  if (arg3) {
    outline = outlines.find(o => o.id === arg1);
    section = outline?.sections.find(s => s.id === arg2);
  }
  if (!section) {
    for (const o of outlines) {
      const found = o.sections.find(s => s.id === arg1);
      if (found) { outline = o; section = found; break; }
    }
  }
  if (!outline || !section) throw new Error(`Section "${arg1}" not found in any outline.`);
  if (!newText) throw new Error('new_text cannot be empty.');

  section.humanEdit = newText;
  if (section.status === 'draft') section.status = 'editing';
  saveOutlines(outlines);

  window.dispatchEvent(new CustomEvent('paperpilot:outlines-changed'));
  return { sectionId: section.id, textLength: newText.length };
}