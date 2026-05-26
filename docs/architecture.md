# Architecture

Phase 5 establishes the application foundation without wiring live provider accounts.

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
    (auth)/login/        Login placeholder
    globals.css          Tailwind base styles and CSS tokens
    layout.tsx           Root layout with Geist fonts
    page.tsx             Public landing placeholder
  components/ui/         Empty shadcn-compatible component target
  lib/
    __tests__/           Unit tests for utilities and env parsing
    supabase/            Browser/server client helpers and generated type target
    types/               Tenant, profile, and membership contracts
    env.ts               Deferred environment validation
    utils.ts             Shared cn() helper
  proxy.ts               Supabase session refresh proxy using the Next 16 proxy convention
```

## Boundaries

- Public pages must build without live Supabase variables.
- `src/proxy.ts` is intentional for the Next 16 middleware-as-proxy convention.
- Supabase helpers validate required public Supabase variables only when used.
- Provider SDKs, payments, browser automation, generated UI components, and live deployments are outside Phase 5.
- Territory or map-oriented product surfaces must stay limited to prospecting context and exclude physical visit workflows.
