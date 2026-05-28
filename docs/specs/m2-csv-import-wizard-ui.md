# M2 — CSV Import Wizard UI

Issue: [#13](https://github.com/MoggingLabs/mogginglabs-scout/issues/13) — Build CSV import wizard UI.
Milestone: M2 — Lead Data Core.
Depends on: [#12](https://github.com/MoggingLabs/mogginglabs-scout/issues/12) — Lead/source/import database migrations.

This slice adds the visual and navigation shell for the CSV import flow. It intentionally does not parse, upload, validate, or commit data; those behaviors are later M2 slices.

## Scope

### In scope

- `/imports` authenticated app route.
- Wizard step metadata for upload, mapping, validation, commit, and review.
- CSV-only file constraints displayed in UI.
- Disabled upload/continue controls until parser/storage behavior is approved and implemented.
- Dashboard link into the import wizard.
- Unit coverage for wizard metadata.

### Out of scope

- File persistence, validation, deduplication, or lead commits.
- Local CSV parser and mapping metadata are now implemented in `src/lib/imports/csv.ts` for #14.
- Live Supabase storage, live imports, or real lead files.
- Any outbound sending, AI analysis, map intelligence, route planning, or physical visit workflow.

## UI contract

The wizard is a route shell under the dark app theme. It exposes the intended user flow without enabling side effects:

1. Upload CSV
2. Map columns
3. Validate rows
4. Commit leads
5. Review results

The file input is disabled and constrained to `.csv,text/csv`; copy states the current 10 MB display limit and warns that no data is uploaded or persisted in this milestone.

## Verification

```sh
pnpm test -- src/lib/imports/__tests__/wizard.test.ts
pnpm test
pnpm typecheck
pnpm lint
pnpm format
pnpm build
node scripts/check-no-route-planning.mjs
```
