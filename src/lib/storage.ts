import { PaperCollection, PaperOutline } from '@/types';

const COLLECTIONS_KEY = 'paperpilot_collections';
const OUTLINES_KEY = 'paperpilot_outlines';

const PRESEEDED_COLLECTIONS: PaperCollection[] = [
  {
    id: 'preseed-webmcp',
    name: 'WebMCP Security',
    createdAt: new Date().toISOString(),
    papers: [
      {
        id: '2503.08912',
        title: 'Securing the Agent-Native Web: A Threat Model for WebMCP',
        authors: ['L. Chen', 'M. Liu', 'R. Patel'],
        abstract: 'We propose a comprehensive threat model for WebMCP implementations, identifying 12 attack vectors across 5 production deployments. Our analysis reveals that 73% of tested sites lack input validation on tool execute callbacks, making them susceptible to cross-origin iframe exposure attacks.',
        published: '2025-03-15',
        pdfUrl: 'https://arxiv.org/pdf/2503.08912.pdf',
        venue: 'arXiv',
        userAnnotation: 'Core threat model for thesis. Missed service worker attacks.',
        relevanceRating: 5,
        addedAt: new Date().toISOString(),
        extractedFindings: {
          paperId: '2503.08912',
          researchQuestion: 'How can malicious websites exploit WebMCP tools to manipulate agent behavior?',
          methodology: 'Formal threat modeling and empirical testing on 5 production WebMCP implementations',
          keyClaims: ['73% of tested sites lack input validation on tool execute callbacks', 'Cross-origin iframe exposure is the primary attack vector', 'Schema poisoning attacks are viable in 40% of implementations'],
          limitations: ['Only tested Chrome 145-148', 'Safari and Firefox not evaluated', 'Limited to publicly accessible implementations'],
          conclusionSummary: 'WebMCP implementations require stricter input validation and origin isolation to prevent agent manipulation attacks.',
        }
      },
      {
        id: '2506.11234',
        title: 'Prompt Injection in Browser-Based AI Agents',
        authors: ['A. Rodriguez', 'S. Kim'],
        abstract: 'We demonstrate novel prompt injection attacks targeting browser-based AI agents that interact with WebMCP-enabled websites. Our empirical study of 50 popular sites shows that 34% are vulnerable to indirect prompt injection through tool descriptions and return values.',
        published: '2025-06-22',
        pdfUrl: 'https://arxiv.org/pdf/2506.11234.pdf',
        venue: 'arXiv',
        userAnnotation: 'Good empirical data but narrow scope on GPT-4o only.',
        relevanceRating: 4,
        addedAt: new Date().toISOString(),
        extractedFindings: {
          paperId: '2506.11234',
          researchQuestion: 'How vulnerable are browser-based AI agents to prompt injection through WebMCP tool interfaces?',
          methodology: 'Empirical testing on 50 popular WebMCP-enabled websites using automated injection probes',
          keyClaims: ['34% of tested sites vulnerable to indirect prompt injection', 'Tool descriptions are the most common injection vector', 'Return value manipulation affects 18% of implementations'],
          limitations: ['Only tested against GPT-4o agent', 'No evaluation of Claude or Gemini agents', 'Ethical constraints limited attack surface testing'],
          conclusionSummary: 'Browser agents need sanitization layers between WebMCP tools and LLM context windows.',
        }
      },
      {
        id: '2601.04567',
        title: 'Cross-Origin Tool Abuse: Attacking WebMCP Implementations',
        authors: ['J. Smith', 'Y. Zhang'],
        abstract: 'We introduce automated fuzzing techniques to discover vulnerabilities in WebMCP tool schemas. Our framework identifies 15 distinct attack vectors including schema poisoning, parameter injection, and execute callback hijacking.',
        published: '2026-01-14',
        pdfUrl: 'https://arxiv.org/pdf/2601.04567.pdf',
        venue: 'arXiv',
        userAnnotation: 'Fuzzing approach is novel. No human validation of findings.',
        relevanceRating: 3,
        addedAt: new Date().toISOString(),
        extractedFindings: {
          paperId: '2601.04567',
          researchQuestion: 'Can automated fuzzing discover novel vulnerabilities in WebMCP tool schemas?',
          methodology: 'Automated fuzzing framework with 15 distinct attack vectors against WebMCP implementations',
          keyClaims: ['Schema poisoning is viable in 60% of tested implementations', 'Parameter injection bypasses client-side validation', 'Execute callback hijacking enables privilege escalation'],
          limitations: ['No human validation of fuzzing findings', 'Limited to open-source implementations', 'False positive rate of 12%'],
          conclusionSummary: 'Automated security testing should be integrated into WebMCP development pipelines.',
        }
      },
      {
        id: '2508.09123',
        title: 'Token Optimization Strategies for WebMCP Tool Schemas',
        authors: ['P. Kumar', 'H. Tanaka'],
        abstract: 'We analyze the token consumption of WebMCP tool schemas and propose compression techniques that reduce context window usage by 40% while maintaining semantic clarity for agent reasoning.',
        published: '2025-08-30',
        pdfUrl: 'https://arxiv.org/pdf/2508.09123.pdf',
        venue: 'arXiv',
        userAnnotation: 'Relevant for implementation but not core security focus.',
        relevanceRating: 3,
        addedAt: new Date().toISOString(),
        extractedFindings: {
          paperId: '2508.09123',
          researchQuestion: 'How can WebMCP tool schemas be optimized to reduce LLM token consumption?',
          methodology: 'Empirical analysis of 200 tool schemas with proposed compression heuristics',
          keyClaims: ['40% token reduction achievable with schema pruning', 'Semantic clarity preserved in 95% of compressed schemas', 'Nested object depth is the primary token driver'],
          limitations: ['Evaluated only on OpenAI models', 'No cross-model validation', 'Compression may reduce tool discoverability'],
          conclusionSummary: 'Token-aware schema design is essential for scalable WebMCP adoption.',
        }
      },
      {
        id: '2510.03456',
        title: 'Human-Agent Collaboration Patterns in WebMCP Applications',
        authors: ['M. Johnson', 'K. Lee'],
        abstract: 'We identify and categorize 8 distinct human-agent collaboration patterns in production WebMCP applications, ranging from human-in-the-loop approval to fully autonomous agent execution with audit trails.',
        published: '2025-10-12',
        pdfUrl: 'https://arxiv.org/pdf/2510.03456.pdf',
        venue: 'arXiv',
        userAnnotation: 'Useful for framing the collaboration aspect of my thesis.',
        relevanceRating: 4,
        addedAt: new Date().toISOString(),
        extractedFindings: {
          paperId: '2510.03456',
          researchQuestion: 'What collaboration patterns emerge when humans and agents interact through WebMCP tools?',
          methodology: 'Qualitative analysis of 8 production WebMCP applications with user interviews',
          keyClaims: ['Human-in-the-loop approval is the most common pattern', 'Audit trails increase user trust by 67%', 'Fully autonomous execution is rare due to liability concerns'],
          limitations: ['Small sample size (8 applications)', 'Self-reported user trust metrics', 'No longitudinal study'],
          conclusionSummary: 'Successful WebMCP applications balance agent autonomy with human oversight and transparent audit trails.',
        }
      }
    ]
  }
];

export function saveCollections(collections: PaperCollection[]): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(COLLECTIONS_KEY, JSON.stringify(collections));
    window.dispatchEvent(new CustomEvent('paperpilot:collections-changed'));
  }
}

export function loadCollections(): PaperCollection[] {
  if (typeof window === 'undefined') {
    return PRESEEDED_COLLECTIONS;
  }
  const raw = localStorage.getItem(COLLECTIONS_KEY);
  if (!raw) {
    saveCollections(PRESEEDED_COLLECTIONS);
    return PRESEEDED_COLLECTIONS;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return PRESEEDED_COLLECTIONS;
  }
}

export function saveOutlines(outlines: PaperOutline[]): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(OUTLINES_KEY, JSON.stringify(outlines));
    window.dispatchEvent(new CustomEvent('paperpilot:outlines-changed'));
  }
}

export function loadOutlines(): PaperOutline[] {
  if (typeof window === 'undefined') {
    return [];
  }
  const raw = localStorage.getItem(OUTLINES_KEY);
  if (!raw) {
    return [];
  }
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function logToolCall(name: string, input: unknown, output: unknown, latencyMs: number) {
  if (typeof window === 'undefined') return;
  const logs = JSON.parse(localStorage.getItem('paperpilot_agent_logs') || '[]');
  logs.push({
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    toolName: name,
    input: (input || {}) as Record<string, unknown>,
    output: (output || {}) as Record<string, unknown>,
    latencyMs,
    duration: latencyMs,
    timestamp: new Date().toISOString(),
  });
  localStorage.setItem('paperpilot_agent_logs', JSON.stringify(logs.slice(-50)));
  window.dispatchEvent(new CustomEvent('paperpilot:logs-changed'));
}

export function loadToolLogs() {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem('paperpilot_agent_logs') || '[]');
  } catch {
    return [];
  }
}
