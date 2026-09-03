'use client';

import { useWebMCP } from 'use-webmcp-tool';
import {
  searchPapersAction,
  extractFindingsAction,
  comparePapersAction,
  findRelatedAction,
  addToCollectionAction,
  getCollectionAction,
} from '@/actions/papers';
import {
  generateOutlineAction,
  draftSectionAction,
  insertCitationAction,
  verifyClaimAction,
  suggestTransitionAction,
} from '@/actions/writing';
import { logToolCall } from '@/lib/storage';

export function useWebMCPTools() {
  // RESEARCH TOOLS (6)
  useWebMCP({
    name: 'search_papers',
    description: 'Search arXiv for academic papers by topic, date range, venue, and citation filters. Returns structured paper metadata including title, authors, abstract, and arXiv ID.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search keywords or natural language topic' },
        date_range: {
          type: 'object',
          properties: {
            from: { type: 'string', format: 'date', description: 'Start date (YYYY-MM-DD)' },
            to: { type: 'string', format: 'date', description: 'End date (YYYY-MM-DD)' }
          }
        },
        venues: { type: 'array', items: { type: 'string' }, description: 'Target conferences or journals' },
        min_citations: { type: 'integer', minimum: 0, description: 'Minimum citation count filter' },
        max_results: { type: 'integer', minimum: 1, maximum: 20, default: 10, description: 'Maximum papers to return' }
      },
      required: ['query']
    },
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    execute: async (input: { query: string; max_results?: number }) => {
      const start = Date.now();
      try {
        const result = await searchPapersAction(input);
        window.dispatchEvent(new CustomEvent('paperpilot:search-results-changed', { detail: result }));
        logToolCall('search_papers', input, result, Date.now() - start);
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Search failed';
        logToolCall('search_papers', input, { error: msg }, Date.now() - start);
        throw new Error(msg);
      }
    }
  });

  useWebMCP({
    name: 'extract_findings',
    description: 'Extract structured findings from a specific paper: research question, methodology, key claims, limitations, and conclusion summary.',
    inputSchema: {
      type: 'object',
      properties: {
        paper_id: { type: 'string', description: 'arXiv ID of the paper to analyze' },
        extraction_depth: { type: 'string', enum: ['brief', 'detailed'], default: 'detailed', description: 'Level of detail for extraction' }
      },
      required: ['paper_id']
    },
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    execute: async (input: { paper_id: string; extraction_depth?: string }) => {
      const start = Date.now();
      try {
        const result = await extractFindingsAction(input.paper_id, input.extraction_depth);
        logToolCall('extract_findings', input, result, Date.now() - start);
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Extraction failed';
        logToolCall('extract_findings', input, { error: msg }, Date.now() - start);
        throw new Error(msg);
      }
    }
  });

  useWebMCP({
    name: 'compare_papers',
    description: 'Generate a structured comparison matrix across multiple papers on specified dimensions (methodology, results, limitations, threat model).',
    inputSchema: {
      type: 'object',
      properties: {
        paper_ids: { type: 'array', items: { type: 'string' }, description: 'List of arXiv IDs to compare' },
        dimensions: { type: 'array', items: { type: 'string' }, description: 'Comparison dimensions' }
      },
      required: ['paper_ids', 'dimensions']
    },
    annotations: { readOnlyHint: true },
    execute: async (input: { paper_ids: string[]; dimensions: string[] }) => {
      const start = Date.now();
      try {
        const result = await comparePapersAction(input.paper_ids, input.dimensions);
        logToolCall('compare_papers', input, result, Date.now() - start);
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Comparison failed';
        logToolCall('compare_papers', input, { error: msg }, Date.now() - start);
        throw new Error(msg);
      }
    }
  });

  useWebMCP({
    name: 'find_related',
    description: 'Discover semantically related papers to a given paper based on citation overlap and keyword similarity.',
    inputSchema: {
      type: 'object',
      properties: {
        paper_id: { type: 'string', description: 'arXiv ID of the source paper' },
        relation_type: { type: 'string', enum: ['citations', 'semantic_neighbors'], default: 'semantic_neighbors' },
        max_results: { type: 'integer', minimum: 1, maximum: 10, default: 5 }
      },
      required: ['paper_id']
    },
    annotations: { readOnlyHint: true },
    execute: async (input: { paper_id: string; relation_type?: string; max_results?: number }) => {
      const start = Date.now();
      try {
        const result = await findRelatedAction(input.paper_id, input.relation_type, input.max_results);
        logToolCall('find_related', input, result, Date.now() - start);
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Related search failed';
        logToolCall('find_related', input, { error: msg }, Date.now() - start);
        throw new Error(msg);
      }
    }
  });

  useWebMCP({
    name: 'add_to_collection',
    description: 'Add a paper to a named collection with user annotation and relevance rating. Creates collection if it does not exist.',
    inputSchema: {
      type: 'object',
      properties: {
        paper_id: { type: 'string', description: 'arXiv ID of the paper to save' },
        collection_name: { type: 'string', description: 'Name of the collection' },
        annotation: { type: 'string', description: 'User-written notes about this paper' },
        relevance_rating: { type: 'integer', minimum: 1, maximum: 5, description: 'Relevance score 1-5' }
      },
      required: ['paper_id', 'collection_name']
    },
    annotations: { readOnlyHint: false },
    execute: async (input: { paper_id: string; collection_name: string; annotation?: string; relevance_rating?: number }) => {
      const start = Date.now();
      try {
        const result = await addToCollectionAction(input.paper_id, input.collection_name, input.annotation || '', input.relevance_rating || 3);
        window.dispatchEvent(new CustomEvent('paperpilot:collections-changed'));
        window.dispatchEvent(new CustomEvent('paperpilot:active-collection-changed', {
          detail: { collectionId: result.collectionId, collectionName: input.collection_name },
        }));
        logToolCall('add_to_collection', input, result, Date.now() - start);
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Add to collection failed';
        logToolCall('add_to_collection', input, { error: msg }, Date.now() - start);
        throw new Error(msg);
      }
    }
  });

  useWebMCP({
    name: 'get_collection',
    description: 'Retrieve a collection by name with all saved papers, annotations, and ratings.',
    inputSchema: {
      type: 'object',
      properties: {
        collection_name: { type: 'string', description: 'Name of the collection to retrieve' }
      },
      required: ['collection_name']
    },
    annotations: { readOnlyHint: true },
    execute: async (input: { collection_name: string }) => {
      const start = Date.now();
      try {
        const result = await getCollectionAction(input.collection_name);
        logToolCall('get_collection', input, result, Date.now() - start);
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Get collection failed';
        logToolCall('get_collection', input, { error: msg }, Date.now() - start);
        throw new Error(msg);
      }
    }
  });

  // WRITING TOOLS (5)
  useWebMCP({
    name: 'generate_outline',
    description: 'Generate a structured paper outline from a collection. Creates sections (Introduction, Literature Review, Methodology, Results, Conclusion) based on paper themes.',
    inputSchema: {
      type: 'object',
      properties: {
        collection_name: { type: 'string', description: 'Collection to base outline on' },
        paper_type: { type: 'string', enum: ['literature_review', 'research_article', 'thesis_chapter'], default: 'literature_review' }
      },
      required: ['collection_name']
    },
    annotations: { readOnlyHint: false },
    execute: async (input: { collection_name: string; paper_type?: 'literature_review' | 'research_article' | 'thesis_chapter' }) => {
      const start = Date.now();
      try {
        const result = await generateOutlineAction(input.collection_name, input.paper_type);
        window.dispatchEvent(new CustomEvent('paperpilot:outlines-changed'));
        logToolCall('generate_outline', input, result, Date.now() - start);
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Outline generation failed';
        logToolCall('generate_outline', input, { error: msg }, Date.now() - start);
        throw new Error(msg);
      }
    }
  });

  useWebMCP({
    name: 'draft_section',
    description: 'Draft a paper section using template-based synthesis from collection papers. Inserts {{paperId}} citation placeholders for human verification.',
    inputSchema: {
      type: 'object',
      properties: {
        section_id: { type: 'string', description: 'ID of the section to draft' },
        collection_name: { type: 'string', description: 'Collection to source from' },
        tone: { type: 'string', enum: ['academic', 'critical', 'synthesis'], default: 'academic' }
      },
      required: ['section_id', 'collection_name']
    },
    annotations: { readOnlyHint: false },
    execute: async (input: { section_id: string; collection_name: string; tone?: 'academic' | 'critical' | 'synthesis' }) => {
      const start = Date.now();
      try {
        const result = await draftSectionAction(input.section_id, input.collection_name, input.tone);
        window.dispatchEvent(new CustomEvent('paperpilot:outlines-changed'));
        logToolCall('draft_section', input, result, Date.now() - start);
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Drafting failed';
        logToolCall('draft_section', input, { error: msg }, Date.now() - start);
        throw new Error(msg);
      }
    }
  });

  useWebMCP({
    name: 'insert_citation',
    description: 'Resolve {{paperId}} placeholders to linked in-text citations and update the bibliography. The student chooses APA or IEEE when exporting.',
    inputSchema: {
      type: 'object',
      properties: {
        section_id: { type: 'string', description: 'Section containing placeholders' },
        collection_name: { type: 'string', description: 'Collection with paper metadata' }
      },
      required: ['section_id', 'collection_name']
    },
    annotations: { readOnlyHint: false },
    execute: async (input: { section_id: string; collection_name: string }) => {
      const start = Date.now();
      try {
        const result = await insertCitationAction(input.section_id, input.collection_name);
        window.dispatchEvent(new CustomEvent('paperpilot:outlines-changed'));
        logToolCall('insert_citation', input, result, Date.now() - start);
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Citation insertion failed';
        logToolCall('insert_citation', input, { error: msg }, Date.now() - start);
        throw new Error(msg);
      }
    }
  });

  useWebMCP({
    name: 'verify_claim',
    description: 'Verify that a claim in a section is supported by the cited paper using keyword alignment scoring.',
    inputSchema: {
      type: 'object',
      properties: {
        section_id: { type: 'string', description: 'Section containing the claim' },
        claim_text: { type: 'string', description: 'The specific claim to verify' },
        paper_id: { type: 'string', description: 'arXiv ID of the cited paper' }
      },
      required: ['section_id', 'claim_text', 'paper_id']
    },
    annotations: { readOnlyHint: true },
    execute: async (input: { section_id: string; claim_text: string; paper_id: string }) => {
      const start = Date.now();
      try {
        const result = await verifyClaimAction(input.section_id, input.claim_text, input.paper_id);
        logToolCall('verify_claim', input, result, Date.now() - start);
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Claim verification failed';
        logToolCall('verify_claim', input, { error: msg }, Date.now() - start);
        throw new Error(msg);
      }
    }
  });

  useWebMCP({
    name: 'suggest_transition',
    description: 'Generate a bridge sentence connecting two consecutive sections for smooth paper flow.',
    inputSchema: {
      type: 'object',
      properties: {
        from_section_id: { type: 'string', description: 'ID of the preceding section' },
        to_section_id: { type: 'string', description: 'ID of the following section' }
      },
      required: ['from_section_id', 'to_section_id']
    },
    annotations: { readOnlyHint: true },
    execute: async (input: { from_section_id: string; to_section_id: string }) => {
      const start = Date.now();
      try {
        const result = await suggestTransitionAction(input.from_section_id, input.to_section_id);
        logToolCall('suggest_transition', input, result, Date.now() - start);
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Transition suggestion failed';
        logToolCall('suggest_transition', input, { error: msg }, Date.now() - start);
        throw new Error(msg);
      }
    }
  });
}
