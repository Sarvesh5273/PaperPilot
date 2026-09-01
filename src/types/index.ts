export interface Paper {
  id: string;
  title: string;
  authors: string[];
  abstract: string;
  published: string;
  pdfUrl: string;
  venue: string;
}

export interface ExtractedFindings {
  paperId: string;
  researchQuestion: string;
  methodology: string;
  keyClaims: string[];
  limitations: string[];
  conclusionSummary: string;
}

export interface CollectionPaper extends Paper {
  userAnnotation: string;
  relevanceRating: number;
  extractedFindings?: ExtractedFindings;
  addedAt: string;
}

export interface PaperCollection {
  id: string;
  name: string;
  papers: CollectionPaper[];
  createdAt: string;
}

export interface PaperSection {
  id: string;
  title: string;
  agentDraft: string;
  humanEdit: string;
  status: 'draft' | 'editing' | 'approved';
  citations: Array<{ paperId: string; placeholder: string; formatted: string }>;
  order: number;
}

export interface PaperOutline {
  id: string;
  title: string;
  sections: PaperSection[];
  collectionId: string;
  createdAt: string;
}

export interface ToolCall {
  id: string;
  toolName: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  timestamp: string;
  duration: number;
}
