# Vercel Preview Deployment Readiness

This document captures the configuration and the manual steps required to enable
Vercel preview deployments for Scout. It is **preparation only**.

> No deployment is performed from this repository or this milestone. No Vercel
> project is created, no Vercel account is contacted, no billing is changed, and
> no secrets are committed. Going live still requires explicit approval and
> environment setup by a maintainer in the Vercel dashboard.

## What is configured in the repository

`vercel.json` pins the toolchain so a Vercel build matches local and CI builds:

```json
{
  "framework": "nextjs",
  "installCommand": "corepack enable && corepack prepare pnpm@9.15.4 --activate && pnpm install --frozen-lockfile",
  "buildCommand": "pnpm build"
}
```

- `framework: nextjs` lets Vercel apply Next.js build output and, once a project
  is connected, create a preview deployment for each pull request automatically.
- The `installCommand` activates the pinned pnpm version through Corepack and
  installs from the frozen lockfile, matching `.github/workflows/ci.yml`.
- `buildCommand` runs the same `pnpm build` used locally and in CI.

Public pages build without live Supabase variables (see
`docs/architecture.md`), so a preview build succeeds even before environment
variables are configured.

## Environment variables (set in Vercel, never in the repo)

Preview and production environments are configured in the Vercel dashboard, not
in this repository. Use the variable **names** from `.env.example`; never commit
real values. The relevant public variables for the web app are:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Server-only secrets (for example `SUPABASE_SERVICE_ROLE_KEY` and any AI provider
keys) must be added only as encrypted Vercel environment variables scoped to the
appropriate environments. They must never be placed in `vercel.json`, committed
files, or `NEXT_PUBLIC_*` variables.

## Manual steps to enable previews (performed by a maintainer, not here)

1. In the Vercel dashboard, import the GitHub repository as a new project.
2. Confirm the framework preset is detected as Next.js (already pinned by
   `vercel.json`).
3. Add the environment variables above for the Preview environment (and
   Production when applicable), using real values held outside the repo.
4. Open a pull request and confirm Vercel posts a preview URL.

## Local validation before relying on a preview

Run the same checks CI runs to catch build failures before they reach Vercel:

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm format
pnpm build
node scripts/check-no-route-planning.mjs
```
