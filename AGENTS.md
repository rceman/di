## Read first
Start with `STRUCTURE.md` to understand where code lives and what to change.

## Maintenance rule
Always update `STRUCTURE.md` when you add, move, or remove files. Keep it current.

## Purpose
This repository is a Vite + React + TypeScript SPA for processing two file types:
- Lieliska DK: .xlsx upload, table preview, swap logic for columns (Svitrkods and Summa), highlighting, export back to .xlsx while preserving other sheets.
- Davanu serviss: PDF upload, client-side table parsing from PDF, preview, export to .xlsx.

This document defines how an agent (Codex) must work in this repo: architecture boundaries, conventions, and safe workflows.

## Priorities (in order)
1) Speed and clarity: optimize for fast iteration and clear handoffs.
2) Architectural correctness: do not accumulate all logic in one file. Keep UI, parsing, transforms, and export separated.
3) Safety and data fidelity: never change the meaning of exported data silently.
4) Validation: always run the fastest available checks after changes.
5) Formatting: keep formatting consistent for files you touch, but do not run repo-wide sweeps.

## Token budget rule
- If a single file exceeds ~3,000 tokens (o200k_base), move the newest logic into a focused module.
- Use `node scripts/token_count.mjs <file>` to estimate tokens.
- After editing a file, always check its token count. If it is over the threshold, refactor and re-check.

## Non-negotiable rules
- No em dashes in any text output or user-facing strings.
- Code comments must be in English only. No Russian comments.
- Prefer minimal, surgical diffs. No unrelated refactors, repo-wide formatting sweeps, or dependency churn.
- Keep domain logic pure and testable. UI components should mostly orchestrate state and render.
- Do not silently change file formats or exported data semantics. Preserve user data.

## Tech stack
- Vite + React + TypeScript (SPA)
- Tailwind CSS
- shadcn/ui-style components (Button, Card, Input) and `cn()` helper (clsx + tailwind-merge)
- ExcelJS for .xlsx read/write
- pdfjs-dist for PDF parsing in the browser

## High-level architecture
Two routes:
- `/lieliska_dk`
- `/davanu_serviss`

Shared shape across both pages:
1) Upload
2) Parse into an internal TableModel
3) Preview (with row/column metadata)
4) Transform (job)
5) Export (.xlsx)

Keep the parsing and transform steps reusable across pages.

### Recommended module boundaries
- `src/pages/*`:
    - Route-level UI, state orchestration, error boundaries, actions.
- `src/components/ui/*`:
    - shadcn-style primitives (Button, Card, Input, etc).
- `src/components/*`:
    - App-specific reusable UI (FileDropzone, TablePreview, JobToolbar, etc).
- `src/lib/excel/*`:
    - Excel parsing, normalization, export.
- `src/lib/pdf/*`:
    - PDF parsing, text extraction, table reconstruction.
- `src/lib/job/*`:
    - Run Job logic for each page.
- `src/lib/table/*`:
    - TableModel types, transforms, validation, highlighting rules.
- `src/lib/utils/*`:
    - Small utilities only (cn, guards, formatting). No domain logic here.

If the current repo differs, follow existing structure, but enforce the same separation of concerns.

### Practical refactor rule (to stay productive)
If you touch a file and it is becoming a grab bag:
- Move the new logic into a focused module (for example `src/lib/pdf/*` or `src/lib/excel/*`).
- Keep `src/App.tsx` as a thin router shell and page orchestrator, not the home for parsing algorithms.

## Data model conventions
Use a single internal representation for both Excel and PDF tables:

- TableModel:
    - `headers: string[]`
    - `rows: (string | number | null)[][]`
    - `meta?: { source: "excel" | "pdf"; sheetName?: string; pageRange?: ... }`
    - `highlights?: { cell?: Record<CellKey, HighlightTag>; col?: ...; row?: ... }`

Guidelines:
- Keep parsing tolerant: trim whitespace, normalize non-breaking spaces, keep original strings if unsure.
- Never guess numeric formats aggressively. Parse numbers only if the rule is clear and reversible.

## UI conventions
- Use small components with explicit props.
- Keep async work cancellable:
    - Use AbortController where possible, or guard stale promises with a requestId.
- Large tables:
    - Preview should render a limited slice (for example first 50-200 rows) or use virtualization if already present.
- Always show:
    - File name
    - Basic stats (rows, cols, pages for PDF)
    - Clear errors with actionable hints

## Excel: Lieliska DK page rules
### Required behavior
- Upload .xlsx
- Preview first sheet table
- Apply a job that swaps the last two columns (Svitrkods and Summa) based on the -3 column rule
- Highlight affected columns/cells in preview
- Export to .xlsx:
    - Preserve all other sheets exactly as read
    - Overwrite only the first sheet with the transformed table output
    - Keep workbook metadata where feasible

### Implementation guidance (ExcelJS)
- Read:
    - `const buf = await file.arrayBuffer()`
    - `await workbook.xlsx.load(buf)`
- Preserve sheets:
    - Do not drop worksheets.
    - Only mutate target sheet (first sheet by default) unless the UI allows selecting a sheet.
- Table extraction:
    - Prefer a deterministic range:
        - If a header row is known, detect it and then read until an empty sentinel row threshold.
    - Normalize headers by trimming and collapsing whitespace.

### Swap logic
Codex must implement swap logic as a pure function, for example:
- `transformLieliskaTable(model: TableModel): TransformResult`
- Result includes:
    - `model: TableModel` (new)
    - `highlights`
    - `warnings[]` (missing headers, ambiguous columns, etc)

Rules must be implemented exactly as specified in the repo (do not invent semantics). If the rule is unclear in code, locate the source of truth in:
- existing script, or
- README/spec in repo, or
- the existing UI labels and tests.

### Export rules
- Avoid changing cell types unexpectedly.
- If styles are not supported end-to-end, be explicit in UI messaging (but do not add new messaging without a product decision).
- Ensure the exported file name is stable and predictable.

## PDF: Davanu serviss page rules
### Required behavior
- Upload PDF
- Parse table client-side using pdfjs-dist
- Preview reconstructed table
- Export to .xlsx

### pdfjs-dist worker setup
Prefer a single worker setup module, for example:
- `src/lib/pdf/worker.ts` that configures `GlobalWorkerOptions.workerSrc`

Keep it Vite-friendly (using `?url` import if present in the repo).

### Table reconstruction strategy
Preferred approach:
- Extract text items per page.
- Cluster into rows by Y coordinate with a tolerance.
- Sort items by X coordinate inside each row.
- Derive columns using either:
    - fixed column boundaries (if known), or
    - dynamic boundaries based on header row spacing.

Keep reconstruction deterministic. If ambiguity occurs, produce warnings and keep original strings.

### Export
- Create a new workbook with a single sheet unless the product explicitly needs multi-sheet exports.
- Use consistent headers and preserve ordering.

## Error handling and UX
- No silent failures.
- Always show an error banner/inline message with:
    - what failed (parse, transform, export)
    - likely cause (encrypted PDF, scanned image PDF, unsupported XLSX structure)
    - next step (try another file, ensure selectable text, etc)

## Testing expectations
Prefer unit tests for pure functions:
- `src/lib/table/*` transforms
- header detection and swap logic
- PDF row clustering utilities

If a test runner already exists, use it.
If no tests exist, do not introduce a new framework unless the task explicitly demands it.

## Performance expectations
- Avoid blocking the UI thread on large PDFs or XLSX:
    - chunk processing where feasible
    - show progress for long operations
- Avoid unnecessary copies of large arrays.
- Prefer memoization for derived preview data.

## How to work in this repo (agent workflow)
1) Read `package.json` for canonical scripts.
2) Locate route entry points (`/lieliska_dk`, `/davanu_serviss`).
3) Identify the TableModel and the transformation source of truth.
4) Implement changes in the correct layer:
    - Domain logic: `src/lib/*`
    - UI orchestration: `src/pages/*`
5) Keep diffs minimal.
6) Run the repo scripts (as available):
    - `npm run build` (TypeScript + Vite build)
    - `npm run dev` (manual smoke check, if needed)
7) For large files, prefer targeted reads:
    - Use `rg` and open only relevant sections.
    - Check token count before loading the whole file.
8) Always run `npm run build` after each task without asking.

## Validation shortcuts (fast)
- SPA: `npm run build`

## Formatting guidance
This repo does not currently define a formatter or lint script. Keep formatting consistent with surrounding code for the files you touch. Do not introduce a new formatter unless a task explicitly asks for it.

## Search tips (fast navigation)
- Lieliska:
    - search: "Lieliska", "Svitrkods", "Summa", "xlsx", "ExcelJS"
- Davanu:
    - search: "Davanu", "pdfjs", "getTextContent", "workerSrc", "PDF"
- Shared:
    - search: "TableModel", "Preview", "export", "highlight"
