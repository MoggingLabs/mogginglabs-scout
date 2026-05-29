# M2 — CSV Parsing and Column Mapping

Issue: [#14](https://github.com/MoggingLabs/mogginglabs-scout/issues/14) — Implement CSV parsing and column mapping.
Milestone: M2 — Lead Data Core.
Depends on: [#12](https://github.com/MoggingLabs/mogginglabs-scout/issues/12) and [#13](https://github.com/MoggingLabs/mogginglabs-scout/issues/13).

This slice turns the import wizard from a static shell into a safe local parsing and mapping foundation. It still does not persist files, validate/deduplicate rows, or commit leads; those remain later M2 issues.

## Scope

### In scope

- Deterministic CSV text parser for local/import-preview use.
- Header detection and row normalization into `Record<header, value>` objects.
- Quoted fields, escaped quotes, CRLF/LF line endings, blank trailing rows, and comma-separated values.
- Parser errors for malformed quoted fields, short/extra rows, duplicate headers, or empty/headerless input.
- Canonical Scout lead import fields aligned with the lead schema.
- Header normalization and automatic column-mapping suggestions for common source headers.
- Mapping helpers that separate mapped columns, ignored columns, ambiguous auto-mappings, missing required fields, ambiguous required fields, and readiness.
- Duplicate-header preview preservation via `valuesByHeader`, `cells`, and `extraValues` so later validation UI can show source data even when errors exist.
- Alias-collision invariant coverage so future fields cannot silently override existing mappings.
- Parser architecture keeps record-finalization semantics centralized across LF, CRLF, lone-CR, and final flush paths.
- Import wizard UI copy updated to show parsing/mapping as the active next behavior while keeping persistence disabled.
- Unit coverage for parser and mapping behavior.

### Out of scope

- Uploading/storing files.
- Inserting `import_batches`, `import_rows`, or `leads`.
- Full row validation, duplicate detection, commit, or review summary behavior.
- Live Supabase writes or live lead data.
- AI analysis, map intelligence, route planning, outreach sending, or provider integrations.

## Acceptance criteria

- CSV parser returns headers, row count, and normalized rows without silently dropping malformed input.
- Parser supports quoted commas/newlines and escaped quotes, normalizing CRLF/lone-CR inside quoted fields to `\n`.
- Blank trailing rows are ignored, but rows with partial values are retained and reported as short rows when they have fewer columns than the header.
- Empty/headerless CSV input returns a typed parser error.
- Duplicate headers and extra columns are surfaced as typed errors without losing preview data.
- Column mapping suggests canonical lead fields for common headers such as company, website, domain, city, phone, and email.
- Ambiguous auto-mappings are first-class output and block readiness until confirmed in a later UI slice.
- Missing required mappings and ambiguous required mappings are separate summary states so later UI can show accurate remediation copy.
- Alias normalization is collision-tested so future field aliases cannot silently override another field.
- Field aliases are declarative objects with specificity scores, keeping future tie-break behavior in field definitions rather than parser control flow.
- Required mapping readiness is explicit: `company_name` must be mapped before later validation/commit work can proceed.
- UI remains no-side-effect: controls may describe parsing/mapping, but file persistence/commit stays disabled until later approved issues.
- Verification commands pass:

```sh
pnpm test -- src/lib/imports/__tests__/csv.test.ts src/lib/imports/__tests__/wizard.test.ts
pnpm test
pnpm typecheck
pnpm lint
pnpm format
pnpm build
node scripts/check-no-route-planning.mjs
```

## Implementation notes

- Keep parser logic dependency-free unless a strong reason appears; deterministic local code is enough for this slice.
- Avoid relying on browser `File` APIs in core parser helpers so tests can run in Node/Vitest.
- Keep canonical field definitions in `src/lib/imports/` so later validation and commit slices can reuse them.
- Do not add real sample lead files to the repo.
