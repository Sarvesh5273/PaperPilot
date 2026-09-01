# PaperPilot — Agent-Native Research Workspace

PaperPilot transforms academic research and literature review writing into a synchronized human-agent collaboration. Built for The WebMCP Challenge 2026.

## What It Does

- **Research Phase:** Search arXiv, extract findings via regex heuristics, compare papers across dimensions, discover related work — all via structured WebMCP tools.
- **Writing Phase:** Generate structured outlines, draft sections with citation placeholders, verify claims against sources, and suggest transitions — with the human retaining creative control.
- **Provenance Tracking:** Live ratio of agent vs. human contribution with verified citation indicators.

## Architecture

- **One Implementation, Two Callers:** Pure async actions in `src/actions/` called identically by React UI and WebMCP tools.
- **WebMCP Tool Registration:** 11 tools registered via `useWebMCP` hook with Zod validation.
- **Instant Reactive Sync:** DOM CustomEvents (`paperpilot:collections-changed`, `paperpilot:outlines-changed`) update React state in real-time.
- **Zero Backend:** Direct arXiv API fetch with browser-native `DOMParser` + `localStorage` persistence.
- **Demo Resilience:** Pre-seeded with 10 cached academic papers for offline/demo reliability.

## WebMCP Tool Catalog (11 Tools)

1. `search_papers` (read-only, untrusted content) — Search arXiv for papers
2. `extract_findings` (read-only, untrusted content) — Extract research question, claims, methodology, limitations
3. `compare_papers` (read-only) — Structured matrix comparing 2-5 papers
4. `find_related` (read-only) — Find semantic neighbors within collection
5. `add_to_collection` (mutation) — Save paper with annotation and rating
6. `get_collection` (read-only) — Retrieve collection by ID
7. `generate_outline` (mutation) — Generate outline for literature review, research article, or thesis chapter
8. `draft_section` (mutation) — Draft section using collection papers and citation placeholders
9. `insert_citation` (mutation) — Insert formatted APA citation into draft
10. `verify_claim` (read-only) — Verify claim against source findings via keyword matching
11. `suggest_transition` (read-only) — Suggest bridge sentence between sections

## Testing

1. Open in Google Chrome 149+ with `chrome://flags/#enable-webmcp-testing` enabled, OR
2. Open in the ChatGPT Desktop app in-app browser.
3. Observe tool calls and instant UI synchronization.

## License

MIT
