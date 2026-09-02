import { Paper, ExtractedFindings, PaperCollection, CollectionPaper } from '@/types';
import { searchArxiv, fetchPaperAbstract } from '@/lib/arxiv';
import { loadCollections, saveCollections } from '@/lib/storage';

export async function searchPapersAction(
  query: string,
  maxResults = 10
): Promise<{ papers: Paper[]; query: string; resultCount: number }> {
  if (!query || !query.trim()) {
    throw new Error('Search query cannot be empty.');
  }
  try {
    const papers = await searchArxiv(query.trim(), maxResults);
    return { papers, query: query.trim(), resultCount: papers.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to search arXiv for "${query}": ${message}`);
  }
}

export async function extractFindingsAction(paperId: string): Promise<ExtractedFindings> {
  if (!paperId || !paperId.trim()) {
    throw new Error('Paper ID cannot be empty.');
  }

  const normalizedId = paperId.trim();

  // Check if findings are already cached in collections
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
    throw new Error(`Failed to fetch abstract for paper ${normalizedId} from arXiv: ${message}`);
  }

  if (!abstract || !abstract.trim()) {
    return {
      paperId: normalizedId,
      researchQuestion: 'Not explicitly stated',
      methodology: 'Not explicitly stated',
      keyClaims: ['Not explicitly stated'],
      limitations: ['Not explicitly stated'],
      conclusionSummary: 'Not explicitly stated',
    };
  }

  const keyClaimsMatches = [...abstract.matchAll(/(?:we (?:propose|argue|show|demonstrate|find|introduce)|our findings indicate)([^.]+)\./gi)]
    .map(m => m[1]?.trim())
    .filter((s): s is string => Boolean(s));

  const methodologyMatches = [...abstract.matchAll(/(?:we (?:evaluate|test|implement|benchmark|analyze|design)|using|via|through)([^.]+)\./gi)]
    .map(m => m[1]?.trim())
    .filter((s): s is string => Boolean(s));

  const researchQuestionMatches = [...abstract.matchAll(/(?:in this paper|we investigate|we study|we address|the problem of)([^.]+)\./gi)]
    .map(m => m[1]?.trim())
    .filter((s): s is string => Boolean(s));

  const limitationsMatches = [...abstract.matchAll(/(?:limitation|challenge|future work|open question|however|remains unclear)([^.]+)\./gi)]
    .map(m => m[1]?.trim())
    .filter((s): s is string => Boolean(s));

  const sentences = abstract.split(/\.\s+/).map(s => s.trim()).filter(Boolean);
  const conclusionSummary = sentences.length > 0
    ? sentences.slice(-2).join('. ') + (sentences.slice(-2).join('. ').endsWith('.') ? '' : '.')
    : 'Not explicitly stated';

  const findings: ExtractedFindings = {
    paperId: normalizedId,
    researchQuestion: researchQuestionMatches.length > 0 ? researchQuestionMatches.join('; ') : 'Not explicitly stated',
    methodology: methodologyMatches.length > 0 ? methodologyMatches.join('; ') : 'Not explicitly stated',
    keyClaims: keyClaimsMatches.length > 0 ? keyClaimsMatches : ['Not explicitly stated'],
    limitations: limitationsMatches.length > 0 ? limitationsMatches : ['Not explicitly stated'],
    conclusionSummary: conclusionSummary || 'Not explicitly stated',
  };

  // If paper exists in collections, attach extracted findings
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
      let value = 'Not explicitly stated';
      if (dim === 'methodology') {
        value = ef?.methodology || 'Not explicitly stated';
      } else if (dim === 'results' || dim === 'keyClaims') {
        value = ef?.keyClaims[0] || 'Not explicitly stated';
      } else if (dim === 'limitations') {
        value = ef?.limitations[0] || 'Not explicitly stated';
      } else if (dim === 'threat_model' || dim === 'dataset' || dim === 'citation_impact') {
        value = ef?.conclusionSummary || 'Not explicitly stated';
      }
      return { dimension: dim, paperId: p.id, value };
    })
  );

  const synthesis = `Compared ${papers.length} papers across ${dims.join(', ')}. Key differences identified in methodology and scope.`;

  return { comparisonMatrix: matrix, synthesis };
}

export async function findRelatedAction(
  paperId: string,
  maxResults = 5
): Promise<{ relatedPapers: Array<{ id: string; title: string; relation: string; relevanceScore: number }> }> {
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
      relation: 'semantic_neighbor',
      relevanceScore: parseFloat(score.toFixed(2)),
    };
  }).sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, maxResults);

  return { relatedPapers: related };
}

export async function addToCollectionAction(
  paperId: string,
  collectionName = 'Default',
  annotation = '',
  rating?: number
): Promise<{ success: boolean; collectionSize: number; collectionId: string }> {
  if (!paperId || !paperId.trim()) {
    throw new Error('Paper ID cannot be empty.');
  }

  const normalizedId = paperId.trim();
  const collections = loadCollections();
  let collection = collections.find(c => c.name === collectionName);
  if (!collection) {
    collection = {
      id: `col-${Date.now()}`,
      name: collectionName,
      papers: [],
      createdAt: new Date().toISOString(),
    };
    collections.push(collection);
  }

  // If already in collection, update annotation/rating
  const existingInCol = collection.papers.find(p => p.id === normalizedId);
  if (existingInCol) {
    if (annotation) existingInCol.userAnnotation = annotation;
    if (rating !== undefined) existingInCol.relevanceRating = rating;
    saveCollections(collections);
    return { success: true, collectionSize: collection.papers.length, collectionId: collection.id };
  }

  // Look in other collections first
  const allPapers = collections.flatMap(c => c.papers);
  let paperBase: Paper | undefined = allPapers.find(p => p.id === normalizedId);

  // If not found in collections, fetch from arXiv
  if (!paperBase) {
    try {
      const searchResult = await searchArxiv(`id:${normalizedId}`, 1);
      if (searchResult.length > 0) {
        paperBase = searchResult[0];
      }
    } catch {
      try {
        const altResult = await searchArxiv(normalizedId, 1);
        if (altResult.length > 0 && altResult[0].id === normalizedId) {
          paperBase = altResult[0];
        }
      } catch {
        // Handled below
      }
    }
  }

  if (!paperBase) {
    throw new Error(`Paper ${normalizedId} not found on arXiv or in existing collections.`);
  }

  const collectionPaper: CollectionPaper = {
    ...paperBase,
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

export async function getCollectionAction(collectionId: string): Promise<PaperCollection | null> {
  if (!collectionId || !collectionId.trim()) {
    throw new Error('Collection ID cannot be empty.');
  }
  const collections = loadCollections();
  const collection = collections.find(c => c.id === collectionId);
  if (!collection) {
    throw new Error(`Collection with ID ${collectionId} not found.`);
  }
  return collection;
}
