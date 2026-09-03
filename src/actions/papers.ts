import { Paper, ExtractedFindings, PaperCollection, CollectionPaper } from '@/types';
import { searchArxiv, fetchPaperAbstract, fetchPaperById } from '@/lib/arxiv';
import { loadCollections, saveCollections } from '@/lib/storage';
import { getFullText, splitSentences, tokenize } from '@/lib/fulltext';

const NOT_STATED = 'Not explicitly stated';

export async function searchPapersAction(
  queryOrInput: string | { query: string; max_results?: number },
  maxResults = 10
): Promise<{ papers: Paper[]; query: string; resultCount: number }> {
  const query = typeof queryOrInput === 'string' ? queryOrInput : queryOrInput?.query || '';
  const limit = typeof queryOrInput === 'object' && queryOrInput?.max_results ? queryOrInput.max_results : maxResults;

  if (!query || !query.trim()) {
    throw new Error('Search query cannot be empty.');
  }
  try {
    const papers = await searchArxiv(query.trim(), limit);
    return { papers, query: query.trim(), resultCount: papers.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to search arXiv for "${query}": ${message}`);
  }
}

/** Analyze full text when available (falls back to abstract) with sentence-level heuristics. */
function analyzePaperText(fullText: string | null, abstract: string): Omit<ExtractedFindings, 'paperId'> {
  const sentences = splitSentences(fullText || abstract);
  const find = (re: RegExp, cap = 320) => sentences.find(s => re.test(s))?.slice(0, cap) || NOT_STATED;
  const findAll = (re: RegExp, cap: number, limit: number) =>
    sentences.filter(s => re.test(s)).slice(0, limit).map(s => s.slice(0, cap));

  return {
    researchQuestion: find(/\b(we (ask|investigate|study|examine|explore|address)|this paper (asks|investigates|studies|examines)|research question|we consider the)\b/i),
    methodology: find(/\b(we (propose|introduce|present|develop|design|implement|build|conduct|evaluate)|our (approach|method|system|framework|design|prototype)|we use|we adapt|we extend)\b/i),
    keyClaims: (() => {
      const claims = findAll(/\b(results? (show|indicate|demonstrate|suggest|reveal)|we (show|demonstrate|find|observe|report|prove)|our (results|findings|evaluation|experiments) (show|indicate|demonstrate)|improve|outperform|reduce[sd]?|increase[sd]?)\b/i, 260, 3);
      return claims.length > 0 ? claims : [NOT_STATED];
    })(),
    limitations: (() => {
      const lims = findAll(/\b(limitation|future work|does not|do not|cannot|unable|fails to|threats? to validity|remain[sd]? (unclear|open)|restricted to|only (consider|support|evaluate))\b/i, 260, 2);
      return lims.length > 0 ? lims : [NOT_STATED];
    })(),
    conclusionSummary: (() => {
      const tail = sentences.slice(-5).join(' ');
      return tail ? tail.slice(0, 420) : NOT_STATED;
    })(),
  };
}

export async function extractFindingsAction(paperId: string, _depth?: string): Promise<ExtractedFindings> {
  if (!paperId || !paperId.trim()) {
    throw new Error('Paper ID cannot be empty.');
  }

  const normalizedId = paperId.trim();

  // Return cached findings if present
  const collections = loadCollections();
  for (const collection of collections) {
    const found = collection.papers.find(p => p.id === normalizedId);
    if (found?.extractedFindings) {
      return found.extractedFindings;
    }
  }

  let abstract = '';
  try {
    abstract = await fetchPaperAbstract(normalizedId);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to fetch paper ${normalizedId} from arXiv: ${message}`);
  }

  // Ground extraction in FULL TEXT when available (falls back to abstract)
  let fullText: string | null = null;
  try {
    fullText = await getFullText(normalizedId);
  } catch {
    fullText = null;
  }

  const findings: ExtractedFindings = {
    paperId: normalizedId,
    ...analyzePaperText(fullText, abstract || ''),
  };

  let collectionUpdated = false;
  for (const col of collections) {
    const p = col.papers.find(paper => paper.id === normalizedId);
    if (p) {
      p.extractedFindings = findings;
      collectionUpdated = true;
    }
  }
  if (collectionUpdated) {
    saveCollections(collections);
  }

  return findings;
}

export async function comparePapersAction(
  paperIds: string[],
  dimensions: string[]
): Promise<{ comparisonMatrix: Array<{ dimension: string; paperId: string; value: string }>; synthesis: string }> {
  if (!paperIds || paperIds.length < 2) {
    throw new Error('Comparison requires at least 2 papers.');
  }

  const collections = loadCollections();
  const allPapers = collections.flatMap(c => c.papers);
  const papers: CollectionPaper[] = [];

  for (const id of paperIds) {
    const found = allPapers.find(p => p.id === id);
    if (!found) {
      throw new Error(`Paper ${id} not found in any collection for comparison.`);
    }
    papers.push(found);
  }

  const dims = dimensions && dimensions.length > 0 ? dimensions : ['methodology', 'results', 'limitations'];

  const matrix = dims.flatMap(dim =>
    papers.map(p => {
      const ef = p.extractedFindings;
      let value = NOT_STATED;
      if (dim === 'methodology') {
        value = ef?.methodology || NOT_STATED;
      } else if (dim === 'results' || dim === 'keyClaims') {
        value = ef?.keyClaims.find(c => c !== NOT_STATED) || NOT_STATED;
      } else if (dim === 'limitations') {
        value = ef?.limitations.find(c => c !== NOT_STATED) || NOT_STATED;
      } else if (dim === 'threat_model' || dim === 'dataset' || dim === 'citation_impact') {
        value = ef?.conclusionSummary || NOT_STATED;
      } else {
        value = ef?.keyClaims.find(c => c !== NOT_STATED) || ef?.conclusionSummary || NOT_STATED;
      }
      return { dimension: dim, paperId: p.id, value };
    })
  );

  const synthesis = `Compared ${papers.length} papers across ${dims.join(', ')}. Key differences identified in methodology and scope.`;

  return { comparisonMatrix: matrix, synthesis };
}

export async function findRelatedAction(
  paperId: string,
  relationType: string | number = 'semantic_neighbors',
  maxResults = 5
): Promise<{ relatedPapers: Array<{ id: string; title: string; relation: string; relevanceScore: number }> }> {
  const limit = typeof relationType === 'number' ? relationType : maxResults;
  const rel = typeof relationType === 'string' ? relationType : 'semantic_neighbors';

  const collections = loadCollections();
  const allPapers = collections.flatMap(c => c.papers);
  const source = allPapers.find(p => p.id === paperId);

  if (!source) {
    throw new Error(`Paper ${paperId} not found in any collection.`);
  }

  const otherPapers = allPapers.filter(p => p.id !== paperId);
  const related = otherPapers.map(p => {
    const sourceWords = new Set(source.title.toLowerCase().split(/\W+/).filter(w => w.length > 3));
    const targetWords = p.title.toLowerCase().split(/\W+/).filter(w => w.length > 3);
    const overlap = targetWords.filter(w => sourceWords.has(w)).length;
    const score = Math.min(1, Math.max(0.3, overlap / Math.max(1, sourceWords.size)));
    return {
      id: p.id,
      title: p.title,
      relation: rel,
      relevanceScore: parseFloat(score.toFixed(2)),
    };
  }).sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, limit);

  return { relatedPapers: related };
}

export async function addToCollectionAction(
  paperId: string,
  collectionName = 'WebMCP Security',
  annotation = '',
  rating?: number
): Promise<{ success: boolean; collectionSize: number; collectionId: string }> {
  if (!paperId || !paperId.trim()) {
    throw new Error('Paper ID cannot be empty.');
  }

  const normalizedId = paperId.trim();
  const collections = loadCollections();
  let collection = collections.find(c => c.name.toLowerCase() === collectionName.toLowerCase() || c.id === collectionName);
  if (!collection) {
    collection = {
      id: `col-${Date.now()}`,
      name: collectionName,
      papers: [],
      createdAt: new Date().toISOString(),
    };
    collections.unshift(collection);
  }

  const existingInCol = collection.papers.find(p => p.id === normalizedId);
  if (existingInCol) {
    if (annotation) existingInCol.userAnnotation = annotation;
    if (rating !== undefined) existingInCol.relevanceRating = rating;
    saveCollections(collections);
    return { success: true, collectionSize: collection.papers.length, collectionId: collection.id };
  }

  const allPapers = collections.flatMap(c => c.papers);
  let paper: Paper | null | undefined = allPapers.find(p => p.id === normalizedId);

  if (!paper) {
    paper = await fetchPaperById(normalizedId);
  }

  if (!paper) {
    throw new Error(`Paper ${normalizedId} not found on arXiv`);
  }

  const collectionPaper: CollectionPaper = {
    ...paper,
    userAnnotation: annotation,
    relevanceRating: rating !== undefined ? Math.min(5, Math.max(1, rating)) : 4,
    addedAt: new Date().toISOString(),
  };

  collection.papers.push(collectionPaper);
  saveCollections(collections);

  return {
    success: true,
    collectionSize: collection.papers.length,
    collectionId: collection.id,
  };
}

export async function getCollectionAction(collectionIdOrName: string): Promise<PaperCollection | null> {
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
  return collection;
}

/** Sentence-level claim verification against the paper's full text. */
export async function verifyClaimAction(
  arg1: string,
  arg2: string,
  arg3: string,
  arg4?: string
): Promise<{ verified: boolean; confidence: 'high' | 'medium' | 'low'; evidence: string }> {
  let claimText = arg2;
  let paperId = arg3;

  if (arg4) {
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

  // Verify against FULL TEXT (falls back to abstract + extracted findings)
  let corpus: string;
  try {
    corpus = await getFullText(paper.id);
  } catch {
    corpus = [
      paper.abstract,
      ...(paper.extractedFindings?.keyClaims || []),
      paper.extractedFindings?.methodology || '',
      paper.extractedFindings?.conclusionSummary || '',
    ].join(' ');
  }

  const claimTokens = tokenize(claimText);
  if (claimTokens.size === 0) {
    return { verified: false, confidence: 'low', evidence: 'Claim does not contain enough distinctive content words to verify.' };
  }

  const sentences = splitSentences(corpus);
  let bestScore = 0;
  let bestSentence = '';
  const evidenceHits: string[] = [];

  for (const sentence of sentences) {
    const st = tokenize(sentence);
    if (st.size === 0) continue;
    let overlap = 0;
    claimTokens.forEach(t => { if (st.has(t)) overlap++; });
    const score = overlap / claimTokens.size;
    if (score > bestScore) {
      bestScore = score;
      bestSentence = sentence;
    }
    if (score >= 0.45 && evidenceHits.length < 2 && !evidenceHits.includes(sentence)) {
      evidenceHits.push(sentence);
    }
  }

  const pct = Math.round(bestScore * 100);
  let confidence: 'high' | 'medium' | 'low' = 'low';
  if (bestScore >= 0.55) confidence = 'high';
  else if (bestScore >= 0.3) confidence = 'medium';

  const quote = bestSentence ? `Closest source text (${pct}% word overlap): “${bestSentence.slice(0, 280)}${bestSentence.length > 280 ? '…' : ''}”` : 'No matching sentence found.';

  return {
    verified: confidence !== 'low',
    confidence,
    evidence: confidence === 'high'
      ? `Supported by ${paper.title}. ${quote}`
      : confidence === 'medium'
      ? `Partially supported (${pct}% overlap). ${quote}`
      : `Weak support (${pct}% overlap) — inspect ${paper.title} manually. ${quote}`,
  };
}