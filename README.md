# MoggingLabs Scout

B2B prospecting intelligence and CRM platform for MoggingLabs.

Scout is designed to help MoggingLabs identify USA home-improvement businesses, organize prospect data, analyze digital opportunities, generate approval-gated outreach drafts, and track sales activity.

## Status

Planning and setup phase. Product implementation has not started yet.

## Core principles

- USA home-improvement B2B focus.
- Desktop-first CRM and prospecting workflow.
- Approval required before outbound sending.
- Source tracking and compliance controls are first-class.
- No route planning or physical visit workflow.
- Public repository contains only synthetic data and non-secret configuration.

## Safety

Do not commit real lead data, contact lists, API keys, environment files, screenshots containing real prospects, or private credentials.

## Local development

Phase 5 adds the app foundation only. Supabase and Vercel are not wired to live projects yet.

Use Node `20.19.2` and pnpm `9.15.4`:

```sh
nvm use
corepack enable
corepack prepare pnpm@9.15.4 --activate
pnpm install
pnpm dev
```

Copy placeholder values from `.env.example` only when local runtime checks need them. Do not commit `.env` files or real credentials.

Validation:

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm format
pnpm build
node scripts/check-no-route-planning.mjs
```

## Documentation

- `docs/architecture.md` — application layout and boundaries.
- `docs/design-system.md` — Geist typography, theme tokens, and base UI
  components.
- `docs/deployment-preview.md` — Vercel preview readiness (configuration and
  manual steps only; no deployment is performed).
