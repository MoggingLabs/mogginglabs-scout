# M2 — Import Validation and Deduplication

Issue: [#15](https://github.com/MoggingLabs/mogginglabs-scout/issues/15) — Implement import validation and deduplication.
Milestone: M2 — Lead Data Core.
Depends on: [#12](https://github.com/MoggingLabs/mogginglabs-scout/issues/12), [#13](https://github.com/MoggingLabs/mogginglabs-scout/issues/13), and [#14](https://github.com/MoggingLabs/mogginglabs-scout/issues/14).

This slice turns parsed and mapped CSV preview rows into deterministic validation results. It still does not upload files, persist import batches/rows, commit leads, or query live Supabase; those remain later M2 slices.

## Scope

### In scope

- Local, dependency-free import row validation helpers for parsed CSV rows and resolved column mappings.
- Normalized row output aligned with the committed `leads`/`import_rows` data contracts.
- Required-field validation for `company_name`.
- Format validation for domain, website URL, email, and phone when present.
- Domain derivation from `domain` first, then `website_url` when a domain column is absent or blank.
- Default country normalization to `US` when no country value is provided, matching the schema default.
- Deterministic duplicate keys for row-level and existing-lead deduplication.
- Duplicate detection within the current import preview.
- Duplicate detection against caller-supplied existing lead candidates, without database access.
- Row-level statuses: `valid`, `invalid`, or `duplicate`.
- Summary counts for total, valid, invalid, and duplicate rows.
- Wizard copy updated to mark validation/deduplication as the current implemented foundation while commit controls remain disabled.
- Unit coverage for validation, normalization, and duplicate behavior.

### Out of scope

- Uploading/storing files.
- Creating or updating `import_batches` or `import_rows`.
- Inserting or updating `leads`.
- Live Supabase reads/writes or applying migrations.
- Manual lead create/edit, lead table/list/detail UI.
- Outreach, sending, AI analysis, map intelligence, route planning, or provider integrations.

## Validation rules

- `company_name` is required after trimming/collapsing whitespace.
- `domain` is normalized to lowercase host without protocol, `www.`, path, query, hash, or port.
- If `domain` is absent but `website_url` contains a host, the normalized domain is derived from `website_url`.
- `website_url` accepts `http://`, `https://`, or bare host-style input; bare hosts are normalized to `https://...`.
- Invalid domain/website/email/phone values produce row-level errors but do not prevent other fields from normalizing.
- Email is lowercased and must have one `@`, a non-empty local part, and a dotted domain.
- Phone is normalized to digits plus an optional leading `+`; it must contain at least seven digits when present.
- Country is uppercased and defaults to `US` when blank.

## Deduplication rules

Duplicate keys use the strongest available identifier:

1. `domain:<normalized-domain>`
2. `email:<normalized-email>`
3. `phone:<normalized-phone>`
4. `company:<normalized-company>|<city>|<country>`

Rows sharing a duplicate key in the same import are marked `duplicate` unless they already have validation errors, in which case they remain `invalid` with both validation and duplicate evidence attached.

Rows matching a caller-supplied existing lead candidate are marked `duplicate` with `duplicateScope: existing`. Existing-lead matching uses the same duplicate-key strategy and does not require live database access in this slice.

## Acceptance criteria

- Validation consumes parsed rows plus a resolved mapping and returns row-level normalized data, errors, duplicate evidence, duplicate keys, and summary counts.
- Required company validation fails empty/missing company rows.
- Domain can be derived from website URL and is used as the primary duplicate key.
- Email, website, domain, and phone format errors are typed and row-scoped.
- Duplicate rows within the preview are detected deterministically.
- Duplicate rows against supplied existing lead candidates are detected without database access.
- Invalid duplicate rows remain invalid while retaining duplicate evidence for later review UI.
- No file persistence, Supabase writes, live queries, or lead commits are added.
- Verification commands pass:

```sh
pnpm test -- src/lib/imports/__tests__/validation.test.ts src/lib/imports/__tests__/csv.test.ts src/lib/imports/__tests__/wizard.test.ts
pnpm test
pnpm typecheck
pnpm lint
pnpm format
pnpm build
node scripts/check-no-route-planning.mjs
```

## Implementation notes

- Keep validation helpers in `src/lib/imports/` so later import-row persistence and commit slices can reuse them.
- Keep existing lead candidates as an explicit function input; this slice must not open a database dependency.
- Prefer typed error codes over freeform strings so later UI and persistence can store/replay validation results.
- Do not add real lead samples to the repo; tests must use synthetic data only.

## Follow-on commit contract

Issue #16 adds a commit helper that consumes `LeadImportValidatedRow[]` from this validation output. The helper does not re-run validation or deduplication; it maps only rows with `status: valid` into `leads` insert payloads and carries skipped invalid/duplicate row evidence forward for callers.

Invalid rows and rows with `status: duplicate` are not inserted as lead records by the commit helper. Normalized lead fields are copied from `normalizedData`, optional absent fields become `null`, and `country` follows the validation/schema default of `US` when no normalized country is present.
