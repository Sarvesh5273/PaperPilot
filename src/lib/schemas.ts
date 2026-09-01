import { z } from 'zod';

export { z };

export const SearchPapersSchema = z.object({
  query: z.string().min(1).max(200),
  date_range: z.object({
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }).optional(),
  max_results: z.number().int().min(1).max(20).default(10),
});

export const ExtractFindingsSchema = z.object({
  paper_id: z.string().min(1),
  extraction_depth: z.enum(['summary', 'detailed', 'full']).default('detailed'),
});

export const ComparePapersSchema = z.object({
  paper_ids: z.array(z.string()).min(2).max(5),
  dimensions: z.array(z.enum(['methodology', 'threat_model', 'dataset', 'results', 'limitations', 'citation_impact'])).default(['methodology', 'results', 'limitations']),
});

export const FindRelatedSchema = z.object({
  paper_id: z.string().min(1),
  relation_type: z.enum(['cited_by', 'references', 'semantic_neighbors']).default('semantic_neighbors'),
  max_results: z.number().int().min(1).max(10).default(5),
});

export const AddToCollectionSchema = z.object({
  paper_id: z.string().min(1),
  collection_name: z.string().min(1).default('Default'),
  user_annotation: z.string().max(1000).optional(),
  relevance_rating: z.number().int().min(1).max(5).optional(),
});

export const GenerateOutlineSchema = z.object({
  collection_id: z.string().min(1),
  paper_type: z.enum(['research_article', 'literature_review', 'thesis_chapter']).default('literature_review'),
});

export const DraftSectionSchema = z.object({
  outline_id: z.string().min(1),
  section_id: z.string().min(1),
  tone: z.enum(['academic', 'critical', 'synthesis']).default('academic'),
});

export const InsertCitationSchema = z.object({
  outline_id: z.string().min(1),
  section_id: z.string().min(1),
  paper_id: z.string().min(1),
  placeholder: z.string().min(1),
});

export const VerifyClaimSchema = z.object({
  outline_id: z.string().min(1),
  section_id: z.string().min(1),
  claim_text: z.string().min(10).max(500),
  paper_id: z.string().min(1),
});

export const SuggestTransitionSchema = z.object({
  outline_id: z.string().min(1),
  from_section_id: z.string().min(1),
  to_section_id: z.string().min(1),
});
