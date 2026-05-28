# Architecture

Phase 6 extends the application foundation with tenant, profile, and membership contracts while keeping live provider accounts unwired.

## Chosen versions

- Node `>=20.11` with `.nvmrc` set to `20.19.2`
- pnpm `9.15.4` through Corepack
- Next.js `16.2.6` App Router
- React `19.2.6`
- TypeScript `6.0.3`
- Tailwind CSS `3.4.19`
- Supabase SSR client package `0.10.3`
- Vitest `4.1.7`

## Application layout

```text
src/
  app/
    (app)/dashboard/     Authenticated dashboard shell placeholder
    (app)/no-access/     Authenticated empty-membership state
    (app)/providers.tsx  Client boundary for app context and no-membership routing
    (auth)/login/        Login placeholder
    globals.css          Tailwind base styles and CSS tokens
    layout.tsx           Root layout with Geist fonts
    page.tsx             Public landing placeholder
  components/
    app-context-provider.tsx  Client context for non-PII tenant/profile state
    ui/                    Base UI primitives (button, card, input, label, badge)
  lib/
    __tests__/           Unit tests for utilities and env parsing
    account/              Profile, membership, and AppContext helpers
    supabase/            Browser/server client helpers and generated type target
    types/               Tenant, profile, and membership contracts
    env.ts               Deferred environment validation
    utils.ts             Shared cn() helper
  proxy.ts               Supabase session refresh proxy using the Next 16 proxy convention
```

## Account model and AppContext

The account foundation is defined by `profiles`, `tenants`, and `memberships`.
The authored SQL lives in `supabase/migrations/` and remains inert until a later
live-wiring phase applies it to a project.

Server components resolve account state through `getAppContext()`, a cached
discriminated union with `ready`, `no-membership`, `unauthenticated`, and
`supabase-missing` branches. The `ready` branch includes the active tenant,
membership, and role. The full contract is documented in
`docs/specs/phase-6-tenant-profile-membership.md`. Client components receive
only a minimal serializable subset through `useAppContext()`: role, tenant
id/name, profile id, and display name.

Membership selection is deterministic until tenant switching exists: active
tenant first, then role priority (`owner`, `admin`, `member`, `viewer`), then
most recent membership update, then tenant id.

## Lead data core

M2 starts with committed but unapplied SQL for lead data ownership and CSV import
state. `supabase/migrations/0004_lead_data_core.sql` adds tenant-scoped
`lead_sources`, `import_batches`, `import_rows`, and `leads` tables plus status
enums, indexes, RLS select policies, and `updated_at` triggers. The matching
hand-authored TypeScript contracts live in `src/lib/supabase/types.ts` until a
later live-wiring phase generates types from an applied Supabase project.

The schema keeps lead ownership under `tenant_id`, links imports to their source
and committed leads, and records only reviewable structure. It does not apply a
migration, create a live Supabase project, or commit real lead data.

## Boundaries

- Public pages must build without live Supabase variables.
- `src/proxy.ts` is intentional for the Next 16 middleware-as-proxy convention.
- Supabase helpers validate required public Supabase variables only when used.
- `supabase/migrations/` stores reviewable SQL only; no migration runs during build or test.
- Provider SDKs, payments, browser automation, and live deployments remain unwired. The base UI foundation is documented in `docs/design-system.md`; CLI-generated component installs are still out of scope.
- Territory or map-oriented product surfaces must stay limited to prospecting context and exclude physical visit workflows.
