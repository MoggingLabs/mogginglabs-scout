# M2 — Lead Data Core Schema

Issue: [#12](https://github.com/MoggingLabs/mogginglabs-scout/issues/12) — Add lead/source/import database migrations.
Milestone: M2 — Lead Data Core.
Depends on: M1 App Foundation.

This is the first M2 implementation slice. It defines the database contracts that later M2 slices consume for import parsing, validation, committing rows as leads, manual create/edit, lead table filters, and lead detail views.

## Scope

### In scope

- Committed Supabase SQL only; no live project migration is applied.
- Tenant-scoped lead source, import batch, import row, and lead tables.
- Status enums for lead and import workflows.
- Basic deduplication/index primitives needed by later validation and table views.
- RLS select policies based on current tenant membership.
- `updated_at` triggers using the existing `public.set_updated_at()` helper.
- Hand-authored TypeScript database contracts until generated Supabase types are introduced in a later phase.
- Tests that lock schema/type expectations and the route-planning exclusion.

### Out of scope

- Live Supabase wiring, `supabase db push`, seed data, or project creation.
- CSV parsing UI or parser logic.
- Import validation/deduplication business logic.
- Committing import rows as leads.
- Lead list/detail/manual edit UI.
- Real lead data or screenshots with real prospects.
- Outreach, sending, AI analysis, map intelligence, route planning, or physical visit workflows.

## Tables

### `lead_sources`

Stores where a tenant's leads came from: manual entry, CSV import, or later provider integrations.

Key columns:

- `tenant_id` — required tenant owner.
- `name` — tenant-local display name.
- `kind` — string classification, default `manual` so future provider kinds do not require enum churn.
- `external_reference` — optional external source id/reference.
- `metadata` — non-secret JSON metadata.

Indexes:

- Tenant-local case-insensitive unique name: `lead_sources_tenant_name_key`.
- Tenant/id composite key used by cross-table tenant-consistency constraints.
- Tenant lookup: `lead_sources_tenant_id_idx`.

### `import_batches`

Tracks a single uploaded file/import run before and after validation.

Key columns:

- `tenant_id`
- `source_id`
- `filename`
- `status`: `draft | validating | ready | committed | failed`
- Row counters: `total_rows`, `valid_rows`, `invalid_rows`, `committed_rows`
- `created_by`
- `mapping`
- `error_summary`
- `completed_at`

### `leads`

Stores committed tenant lead records.

Key columns:

- `tenant_id`
- Optional provenance: `source_id`, `import_batch_id`, `source_metadata`
- Core business fields: `company_name`, `domain`, `website_url`, `industry`, `city`, `state_region`, `country`, `phone`, `email`
- `status`: `new | qualified | disqualified | archived`
- `created_by`

Indexes:

- Tenant-local case-insensitive unique domain when domain is present: `leads_tenant_domain_key`.
- Tenant/status lookup for list filters: `leads_tenant_status_idx`.
- Source/import lookup indexes.

### `import_rows`

Stores raw and normalized row-level import state.

Key columns:

- `batch_id`
- `tenant_id`
- `row_number`
- `status`: `pending | valid | invalid | duplicate | committed`
- `raw_data`
- `normalized_data`
- `validation_errors`
- `duplicate_key`
- `lead_id`

Indexes:

- Batch/status lookup: `import_rows_batch_status_idx`.
- Tenant lookup.
- Tenant/duplicate-key lookup when duplicate key exists.

## Security model

Every M2 table enables RLS. This slice adds read policies allowing a user to select rows only when they have a membership in that row's tenant.

The schema also adds tenant/id composite keys and composite foreign-key constraints for cross-table references. That prevents a row in one tenant from pointing to a source, import batch, or committed lead owned by another tenant when later write paths arrive.

Write policies are intentionally not added yet. Later slices that implement import committing and manual edits should add narrow insert/update policies or server-only paths with explicit acceptance criteria.

## Verification

```sh
pnpm test -- src/lib/supabase/__tests__/lead-data-core-schema.test.ts
pnpm test
pnpm typecheck
pnpm lint
pnpm format
pnpm build
node scripts/check-no-route-planning.mjs
```
