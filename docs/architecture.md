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
    ui/                    Empty shadcn-compatible component target
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

## Boundaries

- Public pages must build without live Supabase variables.
- `src/proxy.ts` is intentional for the Next 16 middleware-as-proxy convention.
- Supabase helpers validate required public Supabase variables only when used.
- `supabase/migrations/` stores reviewable SQL only; no migration runs during build or test.
- Provider SDKs, payments, browser automation, generated UI components, and live deployments are outside Phase 6.
- Territory or map-oriented product surfaces must stay limited to prospecting context and exclude physical visit workflows.
