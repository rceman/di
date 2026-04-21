## Project structure map

Read this file first when working in the repo. It is the source of truth for where code lives.

### Root
- `src/App.tsx`: App shell, routes, page tabs, page switching.
- `src/app-meta.d.ts`: Build-time global type declarations for app version and commit date.
- `src/pages/LieliskaPage.tsx`: Lieliska DK page UI and state orchestration.
- `src/pages/DavanuPage.tsx`: Davanu serviss page UI and state orchestration.
- `src/pages/XmlPage.tsx`: XLSX to XML page UI and state orchestration.
### CI/CD
- `.github/workflows/deploy.yml`: GitHub Pages deploy on push to main.

### Domain logic
- `src/lib/excel/lieliska.ts`: Excel parsing, Lieliska transform logic, and XLSX export.
- `src/lib/excel/davanu.ts`: Davanu Excel parsing and combined Excel+PDF export.
- `src/lib/job/lieliska.ts`: Lieliska Run Job logic wrapper.
- `src/lib/job/davanu.ts`: Davanu Run Job logic template.
- `src/lib/job/davanu_view.ts`: Davanu preview table derivations.
- `src/lib/job/davanu_columns.ts`: Davanu PDF column index detection by header name.
- `src/lib/job/davanu_clone.ts`: Davanu snapshot cloning helpers for reruns.
- `src/lib/pdf/davanu.ts`: PDF parsing, Davanu table reconstruction, and XLSX export.
- `src/lib/pdf/davanu_parser.ts`: PDF table parsing helpers for Davanu.
- `src/lib/pdf/davanu_header.ts`: Pure header detection for Davanu PDF lines.
- `src/lib/pdf/worker.ts`: pdfjs-dist worker setup for the browser.
- `src/lib/xml/quarterly.ts`: Public exports for quarterly XLSX to XML logic.
- `src/lib/xml/quarterly_parse.ts`: Quarterly XLSX parsing and row/meta mapping.
- `src/lib/xml/quarterly_render.ts`: Quarterly XML rendering and download helper.
- `src/lib/xml/quarterly_types.ts`: Shared XML feature types.

### UI primitives
- `src/components/ui/*`: shadcn-style primitives (Button, Card, Input).
- `src/components/TablePreview.tsx`: Shared table preview renderer.
- `src/components/DavanuSummaries.tsx`: Davanu upload summaries.
- `src/components/DavanuMatchTables.tsx`: Davanu unmatched and approximate tables.
- `src/lib/utils.ts`: `cn()` helper.

### Assets and scripts
- `scripts/token_count.mjs`: Token counter (o200k_base) for file size checks.
- `scripts/token_report.mjs`: Token report for all src files.
- `scripts/check_live_version.mjs`: Fetches the live GitHub Pages app and verifies the deployed asset version against the expected commit SHA.
- `data/akts.pdf`: Sample PDF.
- `public/404.html`: GitHub Pages SPA fallback redirect for direct route links.

### Tests
- `tests/davanu_columns.test.js`: Unit tests for Davanu PDF column detection.
- `tests/davanu_job.test.js`: Unit tests for Davanu run job matching logic.
- `tests/davanu_parser.test.js`: Unit tests for PDF header detection edge cases.
- `tests/lieliska_job.test.js`: Unit tests for Lieliska run job matching and duplicate handling.
- `tests/lieliska_job_real_workbook.test.js`: Regression tests for Lieliska against real workbook layouts and edge cases.
- `tests/xml_quarterly.test.js`: Unit tests for quarterly XLSX to XML mapping and rendering.

### Notes
- Do not place parsing/transform logic in `src/App.tsx`.
- Keep UI pages focused on orchestration and rendering.
