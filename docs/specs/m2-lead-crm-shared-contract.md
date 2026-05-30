# M2 - Lead CRM Shared Contract

Issues: #17, #18, #19.
Milestone: M2 - Lead Data Core.
Depends on: `docs/specs/m2-lead-data-core-schema.md`.

This slice adds the small shared lead-domain contract consumed by manual lead
create/edit, lead table/filter views, and lead detail/drawer work. It does not
add routes, UI, migrations, live Supabase reads or writes, or production config.

## Shared Contract

`src/lib/leads/contract.ts` owns the shared lead aliases, status constants, CRM
field ids, default values, and pure row-mapping helpers.

The canonical CRM field ids are:

- `company_name`
- `domain`
- `website_url`
- `industry`
- `city`
- `state_region`
- `country`
- `phone`
- `email`

These ids must stay aligned with the `leads` table fields and the import core
field ids in `src/lib/imports/csv.ts`.

## Lane Ownership

#17 manual lead create/edit owns mutations, forms, and the write-path decision.
If authenticated Supabase writes are used, #17 owns the narrow insert/update RLS
policy migration or an approved server-only write path. It does not own the lead
list page.

#18 lead table/filters owns the lead list page, table, filters, and read query
helpers. It does not own create/edit forms or drawer internals.

#19 lead detail/drawer owns detail and drawer components and any detail route. It
does not own lead list page integration during parallel work.

## Merge Order

1. Merge this shared contract slice.
2. Build #17, #18, and #19 from this contract or a rebased `main`.
3. Merge #18 table/filters before list-page drawer integration.
4. Merge #19 detail/drawer components or route independently.
5. Merge #17 write/form work once its write-path decision is implemented.
6. Use a small integration PR for table actions that need create/edit links or
   drawer wiring.

## Boundaries

- Do not move import validation helpers in this slice.
- Do not edit `src/lib/supabase/types.ts` unless the database schema changes.
- Do not add routes, pages, components, SQL migrations, deployments, or live
  Supabase reads/writes in this slice.
