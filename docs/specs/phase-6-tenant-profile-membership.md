# Phase 6 — Tenant, Profile, and Membership Foundation

Issue: [#10](https://github.com/MoggingLabs/mogginglabs-scout/issues/10) — Implement tenant/profile/membership foundation.
Milestone: M1 — App Foundation.
Depends on: #9 (auth routes) — closed by PR #57.

This document is the implementation specification for Phase 6. It is the planning artifact in a waterfall phase. No application code is changed by this document; implementation happens in a follow-up PR that consumes this spec.

---

## 1. Goal

Provide the data and application-layer foundation that makes a signed-in user usable as a Scout actor inside a single tenant:

- A `profiles` row exists for every authenticated user.
- The user's active tenant and membership can be resolved on every authenticated request.
- The membership role is available to server and client code as part of an `AppContext`.

This unlocks all later phases that depend on "the current tenant" and "the current role" (lead data, CRM workflow, AI analysis, outreach approval, compliance settings).

---

## 2. Scope

### In scope

- Schema design for `profiles`, `tenants`, `memberships` (DDL captured as committed migration SQL; not applied to any live project in this phase).
- RLS policies for those three tables (captured as SQL, not applied).
- Application-layer code that, when a Supabase environment is present, ensures a profile, resolves a membership, and exposes the role through a server-side `getAppContext()` and a client-side `useAppContext()`.
- Routing behavior for the three observable states of a signed-in visitor:
  1. Authenticated and a member of an active tenant → `/dashboard`.
  2. Authenticated but no active membership → `/no-access`.
  3. Unauthenticated → `/login`.
- Test coverage for mapping, selection, and routing decisions, using mocked Supabase clients only.
- Documentation updates to `docs/architecture.md` reflecting the new data contracts and helpers.

### Out of scope

- Wiring a live Supabase project, applying migrations, or exercising real SQL.
- Signup, invite, tenant switching, tenant creation, and account management UIs.
- Profile editing, avatar upload, or PII surface beyond what is already on the `Profile` TS type.
- Authorization beyond "role available in app context"; per-route role gating is a later phase.
- Any service-role-key code path from the application. Profile provisioning is implemented as a database trigger (see §6.4) so the app never touches the service role.
- Route planning, physical visit workflows, or any map-related work.
- Deployment, secrets, or anything that costs money.

---

## 3. Current repository observations

### 3.1 Application shell

- `src/app/layout.tsx` — root layout, Geist fonts, theme tokens.
- `src/app/page.tsx` — public landing.
- `src/app/(auth)/login/page.tsx` — login placeholder; auth is **not** wired in Phase 5 and remains placeholder until live Supabase auth is enabled.
- `src/app/(app)/layout.tsx:8` — `AppLayout` calls `getUser()` (Supabase SSR), redirects to `/login` if `user` is null, and **swallows** `SupabaseEnvMissingError` so public builds still render the layout. This is the exact pattern Phase 6 must extend without breaking.
- `src/app/(app)/dashboard/page.tsx` — protected dashboard placeholder.

### 3.2 Supabase plumbing

- `src/lib/supabase/client.ts` — browser client via `@supabase/ssr` `createBrowserClient`, reads env through `getPublicSupabaseEnv()`.
- `src/lib/supabase/server.ts` — server client via `createServerClient`, plus a `getUser()` helper that throws on Supabase errors.
- `src/lib/supabase/types.ts:9` — `Database` is a **stub**:
  ```ts
  // TODO: Replace this stub with generated Supabase types once the schema exists.
  public: { Tables: Record<string, never>; ... }
  ```
  Phase 6 must replace this stub with hand-authored typings for `profiles`, `tenants`, `memberships` (and their enums), until Supabase type generation is wired in a later phase.
- `src/proxy.ts` — Next 16 proxy (middleware) that refreshes Supabase sessions and tolerates a missing Supabase env. Does **not** need to change in Phase 6.

### 3.3 Environment validation

- `src/lib/env.ts` — Zod-based env schema with:
  - `getPublicSupabaseEnv()` throwing `SupabaseEnvMissingError` when Supabase URL/anon-key are both absent.
  - `SupabaseEnvInvalidError` for partial/invalid configuration.
  - `isSupabaseEnvMissingError()` predicate used by `(app)/layout.tsx` and `src/proxy.ts` to permit public builds without Supabase env.
- `.env.example` lists Supabase, AI provider, and provider-disabled placeholders. Phase 6 introduces **no new environment variables**.

### 3.4 Data contracts (already defined as TS types only)

- `src/lib/types/profile.ts` — `Profile` ({ id, email, displayName, avatarUrl, createdAt, updatedAt }).
- `src/lib/types/tenant.ts` — `Tenant` + `TenantStatus = "active" | "archived"`.
- `src/lib/types/membership.ts` — `Membership` + `MembershipRole = "owner" | "admin" | "member" | "viewer"`.

These three types are the contract that the Phase 6 code and SQL must satisfy. Tests can use them directly without touching the database.

### 3.5 Tests and tooling

- `vitest.config.ts` — Vitest, `environment: "node"`, alias `@ → ./src`, includes `src/**/*.test.ts`.
- Existing tests:
  - `src/lib/__tests__/env.test.ts`
  - `src/lib/__tests__/utils.test.ts`
- ESLint: `eslint . --max-warnings=0`.
- CI: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, then `node scripts/check-no-route-planning.mjs`.

### 3.6 Repo safety guardrails

- `scripts/check-no-route-planning.mjs` blocks the forbidden terms `route_optim`, `routePlanning`, `visit_route`, `navigate_to_visit`, `leaflet-routing-machine` outside `docs/` and the script itself.
- `.github/workflows/ci.yml` blocks committing `.env*` (except `.env.example`).
- `.github/workflows/secret-scan.yml` runs `gitleaks`.
- `SECURITY.md` forbids real data, keys, OAuth secrets, etc.

Phase 6 must remain compatible with every guardrail above.

---

## 4. Recommended implementation approach

### 4.1 High-level shape

```
src/
  app/
    (app)/
      layout.tsx                  # MODIFY: call getAppContext() + handle no-access redirect
      no-access/page.tsx          # NEW: minimal placeholder
      providers.tsx               # NEW: client provider boundary inside (app) layout
  components/
    app-context-provider.tsx      # NEW: client React context for { role, tenantId, ... }
  lib/
    account/
      context.ts                  # NEW: getAppContext() server helper (cached)
      profile.ts                  # NEW: ensureProfile() + mapping
      membership.ts               # NEW: resolveMembership() + selection
      errors.ts                   # NEW: NoActiveMembershipError, ProfileNotProvisionedError
      __tests__/
        profile.test.ts
        membership.test.ts
        context.test.ts
    supabase/
      types.ts                    # MODIFY: replace stub Database with authored tables
supabase/
  migrations/
    0001_account_schema.sql       # NEW: profiles, tenants, memberships, enums, indexes
    0002_account_rls.sql          # NEW: RLS policies
    0003_account_triggers.sql     # NEW: handle_new_user trigger + updated_at trigger
docs/
  architecture.md                 # MODIFY: extend "Application layout" + add data contracts section
  specs/
    phase-6-tenant-profile-membership.md   # THIS DOCUMENT
```

Migrations live under `supabase/` so that a later "live wiring" PR can run `supabase db push` against them without re-authoring SQL. Committed SQL is inert until applied; it does not require a live project.

### 4.2 Server-side `getAppContext`

`src/lib/account/context.ts` exports a `cache()`-wrapped function so any server component can call it without re-issuing queries within a request.

```text
getAppContext():
  1. Call createClient() (server) + supabase.auth.getUser().
  2. If user is null → return { kind: "unauthenticated" }.
  3. ensureProfile(supabase, user) → Profile.
     - If schema says profile auto-provisioning trigger is in place (DB-side), this is a SELECT-and-throw-if-missing.
     - The application path is read-only: it does NOT upsert from the app. Provisioning is the trigger's job (§6.4).
  4. resolveMembership(supabase, profile.id) → { tenant, membership } | null.
  5. If null → return { kind: "no-membership", user, profile }.
  6. Return { kind: "ready", user, profile, tenant, membership, role: membership.role }.
  7. If getPublicSupabaseEnv() throws SupabaseEnvMissingError, return { kind: "supabase-missing" } so public/dev builds without env render cleanly.
```

`AppContext` is a discriminated union to make every consumer choose a branch explicitly. This is preferable to a single nullable object that callers forget to null-check.

#### Why a discriminated union (alternative considered)

- **Alternative:** return `AppContext | null`, throw `NoActiveMembershipError` for the no-membership case.
  - **Tradeoff:** simpler ergonomics for the common path, but mixes a control-flow concern (env missing in public build) with a domain concern (no membership) into the same exception channel as today's `SupabaseEnvMissingError` swallowing. Caller code has to special-case both.
- **Recommended:** discriminated union with `kind`. Layouts switch on `kind` once. The `kind: "no-membership"` branch redirects to `/no-access`; `kind: "supabase-missing"` lets the layout render a minimal shell as today. This keeps tests deterministic and avoids try/catch noise in route handlers.

### 4.3 Client-side context

`src/components/app-context-provider.tsx` is a `"use client"` provider that takes a minimal serializable subset:

```ts
type ClientAppContext = {
  role: MembershipRole;
  tenantId: string;
  tenantName: string;
  profileId: string;
  displayName: string | null;
};
```

It is rendered from a thin `src/app/(app)/providers.tsx` client boundary inside `(app)/layout.tsx`. Client code reads `useAppContext()` for role-aware UI. The server context contains the full set (including `user` and `profile.email`); the client subset deliberately does not propagate `email` to keep PII off the wire unless a feature needs it.

### 4.4 Membership resolution rules

Phase 6 does not implement tenant switching. `resolveMembership` deterministically chooses one membership when multiple exist:

1. Filter memberships by `tenant.status = 'active'`.
2. Among the remaining, prefer the highest role rank: owner > admin > member > viewer.
3. Tie-break by most recent `updated_at` (descending).
4. Final tie-break by lexicographic `tenant.id`.

This is documented but is intentionally simple. Tenant switching (a later phase) will replace it with a selected-tenant cookie or path segment.

### 4.5 Edge behavior

| Situation                                                     | Behavior                                                                                                                                                                                                                                                                                                                                             |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unauthenticated visitor hits `/dashboard`                     | `(app)/layout.tsx` redirects to `/login` (existing).                                                                                                                                                                                                                                                                                                 |
| Authenticated user, no profile row                            | Profile row missing should not happen if the DB trigger is in place. If it does, `ensureProfile` raises `ProfileNotProvisionedError`; `getAppContext()` converts this to `no-membership` with `profile: null`, and the layout routes to `/no-access` with a generic message. (We do not auto-create from the app to avoid needing the service role.) |
| Authenticated user, profile exists, no membership             | Redirect to `/no-access`.                                                                                                                                                                                                                                                                                                                            |
| Authenticated user, profile + active membership               | Render children with `AppContext`.                                                                                                                                                                                                                                                                                                                   |
| Public build with no Supabase env (current Phase 5 invariant) | Render `(app)/layout.tsx` shell without context, exactly as today.                                                                                                                                                                                                                                                                                   |
| Supabase env present but DB unreachable                       | `getUser()` already throws; layout will let the error propagate, which becomes a Next error boundary. Acceptable for Phase 6; a friendlier error page is a later concern.                                                                                                                                                                            |

---

## 5. Acceptance criteria mapped to issue #10

| Issue acceptance                  | Where it lives                                                                                                                 | How it is verified                                                                                                                                                                                                                                                          |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **profile created**               | DB trigger `handle_new_user` on `auth.users` inserts a `profiles` row keyed on `auth.users.id`. App reads via `ensureProfile`. | (a) Migration `0003_account_triggers.sql` contains the trigger and is reviewed in PR. (b) Unit test confirms `ensureProfile` returns a mapped `Profile` from a fixture row. (c) Manual smoke (deferred to live-wiring PR) confirms inserting an auth user yields a profile. |
| **tenant membership resolved**    | `resolveMembership(supabase, profileId)` returns `{ tenant, membership }` or `null` per §4.4 rules.                            | Unit tests for: single-active membership, multiple memberships with role-priority tie, archived tenant excluded, no memberships → null.                                                                                                                                     |
| **role available in app context** | `getAppContext()` returns `role: MembershipRole` on the `kind: "ready"` branch. `useAppContext()` exposes it on the client.    | (a) Unit test that `getAppContext()` returns the expected discriminant. (b) Type-level test that `ctx.role` narrows to `MembershipRole` after `kind === "ready"`. (c) Build passes with the `(app)/layout.tsx` consumer wired.                                              |

---

## 6. Schema and SQL design (committed; not applied)

All DDL is captured in `supabase/migrations/`. None of it is applied in this phase. Filenames use a zero-padded sequential prefix matching the convention preferred by Supabase CLI.

### 6.1 Enums

```sql
create type tenant_status as enum ('active', 'archived');
create type membership_role as enum ('owner', 'admin', 'member', 'viewer');
```

### 6.2 Tables

```sql
create table public.profiles (
  id          uuid        primary key references auth.users(id) on delete cascade,
  email       text        not null,
  display_name text,
  avatar_url   text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.tenants (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null,
  slug        text        not null unique,
  status      tenant_status not null default 'active',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.memberships (
  id          uuid        primary key default gen_random_uuid(),
  tenant_id   uuid        not null references public.tenants(id) on delete cascade,
  profile_id  uuid        not null references public.profiles(id) on delete cascade,
  role        membership_role not null default 'viewer',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (tenant_id, profile_id)
);

create index memberships_profile_id_idx on public.memberships(profile_id);
create index memberships_tenant_id_idx  on public.memberships(tenant_id);
```

### 6.3 RLS policies (specified; refined in implementation PR)

```sql
alter table public.profiles    enable row level security;
alter table public.tenants     enable row level security;
alter table public.memberships enable row level security;

-- profiles: a user reads/updates only their own row.
create policy "profiles_self_select" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_self_update" on public.profiles
  for update using (auth.uid() = id);

-- memberships: a user reads only memberships where they are the profile.
create policy "memberships_self_select" on public.memberships
  for select using (auth.uid() = profile_id);

-- tenants: a user reads only tenants they are a member of.
create policy "tenants_member_select" on public.tenants
  for select using (
    exists (
      select 1 from public.memberships m
      where m.tenant_id = tenants.id and m.profile_id = auth.uid()
    )
  );
```

Write policies for tenants/memberships are intentionally **not** added in Phase 6 because no application code writes them. They are added in the phase that introduces tenant management.

### 6.4 Profile auto-provision trigger

```sql
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

#### Why a trigger (alternative considered)

- **Alternative:** server-side upsert from the application after `supabase.auth.getUser()`. Requires the service role (because the anon client cannot freely insert into `profiles`), and means application code touches `SUPABASE_SERVICE_ROLE_KEY`.
- **Recommended:** DB trigger. The application never holds elevated privilege for this case; provisioning is atomic with user creation; the app code becomes a simple read.

### 6.5 `updated_at` trigger (small utility, included in same migration)

```sql
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at    before update on public.profiles    for each row execute function public.set_updated_at();
create trigger tenants_set_updated_at     before update on public.tenants     for each row execute function public.set_updated_at();
create trigger memberships_set_updated_at before update on public.memberships for each row execute function public.set_updated_at();
```

---

## 7. TypeScript surface

### 7.1 `Database` typing in `src/lib/supabase/types.ts`

Replace the stub with hand-authored typings. (Generation is a later phase.) Shape:

```ts
export type Database = {
  public: {
    Tables: {
      profiles: { Row: { id: string; email: string; display_name: string | null; avatar_url: string | null; created_at: string; updated_at: string }; Insert: ...; Update: ... };
      tenants:  { Row: { id: string; name: string; slug: string; status: "active" | "archived"; created_at: string; updated_at: string }; Insert: ...; Update: ... };
      memberships: { Row: { id: string; tenant_id: string; profile_id: string; role: "owner" | "admin" | "member" | "viewer"; created_at: string; updated_at: string }; Insert: ...; Update: ... };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      tenant_status: "active" | "archived";
      membership_role: "owner" | "admin" | "member" | "viewer";
    };
    CompositeTypes: Record<string, never>;
  };
};
```

The existing `Profile`, `Tenant`, `Membership` TS types in `src/lib/types/*` stay; `src/lib/account/*` is responsible for mapping snake_case `Row` shapes to camelCase domain types.

### 7.2 `AppContext` discriminated union

```ts
// src/lib/account/context.ts
export type AppContext =
  | {
      kind: "ready";
      user: User;
      profile: Profile;
      tenant: Tenant;
      membership: Membership;
      role: MembershipRole;
    }
  | { kind: "no-membership"; user: User; profile: Profile | null }
  | { kind: "unauthenticated" }
  | { kind: "supabase-missing" };
```

`getAppContext()` is wrapped in React's `cache()` so multiple server components in one request share one resolution.

### 7.3 Errors

```ts
// src/lib/account/errors.ts
export class ProfileNotProvisionedError extends Error { ... }
export class NoActiveMembershipError extends Error { ... }
```

Both are thrown only from inside `getAppContext()`'s implementation and converted to discriminated-union branches before returning. They are not part of the public return contract. `ProfileNotProvisionedError` maps to `kind: "no-membership"` with `profile: null`; `NoActiveMembershipError` maps to `kind: "no-membership"` with the resolved profile.

---

## 8. Public-build preservation strategy

The Phase 5 invariant — "public builds boot without `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY`" — must be preserved. Phase 6 preserves it as follows:

- `getAppContext()` wraps the initial `getPublicSupabaseEnv()` call (transitively via `createClient()`) in a try/catch on `SupabaseEnvMissingError` and returns `{ kind: "supabase-missing" }`.
- `(app)/layout.tsx` treats `kind: "supabase-missing"` the same way it currently handles the swallowed `SupabaseEnvMissingError`: render the shell.
- `src/proxy.ts` is unchanged.
- No new env vars are added. No reads of `SUPABASE_SERVICE_ROLE_KEY` from the application.
- No code runs migrations at build time.

CI verification: existing `pnpm build` is run with no `NEXT_PUBLIC_SUPABASE_*` set. Phase 6 must keep `pnpm build` green in that mode.

---

## 9. Exact files to create / modify / not touch

### 9.1 Create

- `docs/specs/phase-6-tenant-profile-membership.md` (this file).
- `src/lib/account/context.ts`
- `src/lib/account/profile.ts`
- `src/lib/account/membership.ts`
- `src/lib/account/errors.ts`
- `src/lib/account/__tests__/context.test.ts`
- `src/lib/account/__tests__/profile.test.ts`
- `src/lib/account/__tests__/membership.test.ts`
- `src/components/app-context-provider.tsx`
- `src/app/(app)/providers.tsx`
- `src/app/(app)/no-access/page.tsx`
- `supabase/migrations/0001_account_schema.sql`
- `supabase/migrations/0002_account_rls.sql`
- `supabase/migrations/0003_account_triggers.sql`

### 9.2 Modify

- `src/lib/supabase/types.ts` — replace stub `Database`.
- `src/app/(app)/layout.tsx` — call `getAppContext()`, route on `kind`, mount `<AppContextProvider>` for `kind: "ready"`.
- `docs/architecture.md` — extend the layout map and add a short "Account model and AppContext" section.

### 9.3 Do not touch

- `src/proxy.ts` — Phase 5 contract is correct as-is.
- `src/lib/env.ts` — no new env vars in Phase 6.
- `.env.example` — no new keys.
- `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts` — keep as-is. The `getUser()` helper is reused.
- `src/lib/types/{profile,tenant,membership}.ts` — already correct contracts.
- `scripts/check-no-route-planning.mjs` — unchanged.
- `.github/workflows/*.yml` — unchanged.
- `src/app/(auth)/login/page.tsx` — login page remains a placeholder; signup/login wiring is its own future issue.
- `next.config.mjs`, `tsconfig.json`, `vitest.config.ts`, `eslint.config.mjs`, `tailwind.config.ts`, `postcss.config.mjs`, `components.json` — no changes needed.
- `pnpm-lock.yaml` — no new dependencies are required.

---

## 10. Test strategy

Phase 6 is TDD-shaped. The Supabase client is mocked; no live database is touched.

### 10.1 Test files and what they cover

- `src/lib/account/__tests__/profile.test.ts`
  - `mapProfileRow()` maps snake_case row → `Profile` (camelCase).
  - `ensureProfile()` returns the mapped profile when the row exists.
  - `ensureProfile()` throws `ProfileNotProvisionedError` when no row is found (a state that should not occur once the trigger is live).

- `src/lib/account/__tests__/membership.test.ts`
  - `resolveMembership()` returns null when no rows.
  - `resolveMembership()` returns the only active membership.
  - `resolveMembership()` excludes archived tenants.
  - `resolveMembership()` prefers owner over admin over member over viewer.
  - `resolveMembership()` tie-breaks by `updated_at` desc when roles are equal.
  - `resolveMembership()` tie-breaks by tenant id lexicographically when both above are equal.

- `src/lib/account/__tests__/context.test.ts`
  - Returns `{ kind: "supabase-missing" }` when `createClient()` throws `SupabaseEnvMissingError`.
  - Returns `{ kind: "unauthenticated" }` when `auth.getUser()` returns no user.
  - Returns `{ kind: "no-membership", ... }` when profile exists but `resolveMembership` returns null.
  - Returns `{ kind: "ready", ..., role }` when everything resolves.
  - Type-level assertion that `ctx.role` narrows after `ctx.kind === "ready"`.

### 10.2 Mocking pattern

Each test creates a hand-rolled fake Supabase client that exposes only the methods called by the function under test (`.auth.getUser()`, `.from('profiles').select(...).eq(...).maybeSingle()`, `.from('memberships').select(... join tenants ...).eq(...)`, etc.) using `vi.fn()`. This keeps tests fast, deterministic, and unblocked by the absent live project.

### 10.3 Commands (pnpm)

Run from the worktree root:

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test
pnpm build                              # must remain green with no NEXT_PUBLIC_SUPABASE_*
node scripts/check-no-route-planning.mjs
```

`pnpm test:watch` is available during development. No new scripts are added to `package.json`.

### 10.4 Future test coverage (out of Phase 6)

- RLS tests against a local Supabase stack — issue #51 already exists; tracked separately.
- End-to-end Playwright flows — issue #53 already exists; tracked separately.

---

## 11. Security and privacy

- **No service role from app code.** Provisioning is a database trigger; the anon-cookie SSR client is sufficient for everything else Phase 6 does.
- **RLS is authoritative.** Application-side role checks in `AppContext` are for UI gating only. Any data access must remain protected at the DB layer via the policies in §6.3 plus the policies added by later phases.
- **Minimal PII on the wire.** `ClientAppContext` excludes `email` by default. Server code that needs email reads from `AppContext.profile.email` directly.
- **No new secrets, no new env vars.**
- **No real data.** Tests use synthetic fixtures (`"user-1"`, `"tenant-1"`, `name@example.com`).
- **Compliance posture.** Phase 6 introduces no outreach, no email sending, no public ingestion; the controls in `docs/privacy-and-compliance.md` are unaffected.
- **Trigger safety.** `handle_new_user` is `security definer` with a pinned `search_path = public` to prevent search-path injection. The DB role that owns this function must be the Supabase Postgres `postgres`/`supabase_admin` role.
- **Auditability.** Memberships and tenants carry `created_at`/`updated_at`. A dedicated audit log is a later phase (#48).

---

## 12. Documentation updates

- `docs/architecture.md`:
  - Update the `src/` tree to include `lib/account/`, `(app)/no-access/`, and `(app)/providers.tsx`.
  - Add an "Account model and AppContext" section that names the discriminated union and links to this spec.
  - Add a `supabase/migrations/` entry to the boundaries section noting that committed SQL is inert until applied.
- `docs/specs/phase-6-tenant-profile-membership.md` (this file): authoritative spec for the phase.

No changes to `docs/waterfall-plan.md` or `docs/privacy-and-compliance.md`.

---

## 13. Implementation checklist

The implementation PR is opened against `feat/phase-6-tenant-membership`. The following checklist is bounded — it must not exceed the scope of this spec.

> **Task.** Implement Phase 6 of MoggingLabs Scout exactly as specified in `docs/specs/phase-6-tenant-profile-membership.md` in this branch. No deviations.
>
> **Branch.** `feat/phase-6-tenant-membership` (already checked out).
>
> **Allowed file changes (create/modify only what is listed in §9):**
>
> - Create: `src/lib/account/{context,profile,membership,errors}.ts`, their `__tests__/*.test.ts`, `src/components/app-context-provider.tsx`, `src/app/(app)/providers.tsx`, `src/app/(app)/no-access/page.tsx`, `supabase/migrations/0001_account_schema.sql`, `supabase/migrations/0002_account_rls.sql`, `supabase/migrations/0003_account_triggers.sql`.
> - Modify: `src/lib/supabase/types.ts`, `src/app/(app)/layout.tsx`, `docs/architecture.md`.
> - Do **not** touch: `src/proxy.ts`, `src/lib/env.ts`, `.env.example`, `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, `src/lib/types/*`, `scripts/check-no-route-planning.mjs`, `.github/**`, `src/app/(auth)/login/page.tsx`, `next.config.mjs`, `tsconfig.json`, `vitest.config.ts`, `eslint.config.mjs`, `tailwind.config.ts`, `postcss.config.mjs`, `components.json`, `pnpm-lock.yaml`, `package.json`.
>
> **Constraints.**
>
> 1. No live Supabase wiring. The implementation must keep `pnpm build` green with no `NEXT_PUBLIC_SUPABASE_*` set.
> 2. No new environment variables, no new dependencies. Do not add anything to `package.json` or `.env.example`.
> 3. No use of `SUPABASE_SERVICE_ROLE_KEY` anywhere in application code.
> 4. SQL files in `supabase/migrations/` must be committed but never executed at build or test time.
> 5. Public repo safe: synthetic data only (`name@example.com`, `tenant-1`, etc.); no AI/tool/vendor attribution in any committed file or commit message.
> 6. No route-planning, no map content. The forbidden-terms script must continue to pass.
> 7. Follow the discriminated-union shape for `AppContext` from §7.2. Do not introduce a `null`-or-object return.
> 8. Provisioning is via the DB trigger (§6.4); `ensureProfile` is read-only.
>
> **TDD order.**
>
> 1. Write failing tests under `src/lib/account/__tests__/` for each behavior in §10.1 using mocked Supabase clients.
> 2. Implement `errors.ts`, then `profile.ts`, then `membership.ts`, then `context.ts` until tests pass.
> 3. Update `src/lib/supabase/types.ts` to match §7.1.
> 4. Wire `(app)/layout.tsx` to switch on `kind`; add `/no-access/page.tsx` and the client provider boundary.
> 5. Add the three migration SQL files exactly per §6.1–§6.5.
> 6. Update `docs/architecture.md` per §12.
>
> **Validation (must all pass locally):**
>
> ```sh
> pnpm install --frozen-lockfile
> pnpm typecheck
> pnpm lint
> pnpm test
> pnpm build
> node scripts/check-no-route-planning.mjs
> ```
>
> **Out of scope. Do not implement, even if tempted:**
>
> - Signup, login, OAuth, password reset, magic links.
> - Tenant creation/edit, tenant switcher, invitations.
> - Profile edit UI, avatar upload.
> - Per-route role authorization beyond the no-membership redirect.
> - Live Supabase project, applied migrations, service-role usage, deployment, secrets.
> - Any map or route-planning code.
>
> **Deliverables.** A single PR titled `feat: add phase 6 tenant/profile/membership foundation` that closes `#10`, with a PR body listing the exact files added/modified, the validation commands above, and the security/compliance notes from §11.

Implementation is a separate, reviewed step.

---

## 14. Questions, assumptions, and future work

### 14.1 Assumptions

- Phase 6 commits inert SQL under `supabase/migrations/` rather than deferring all schema authorship to a later "live wiring" PR. This keeps the schema reviewable in code while complying with the no-live-wiring constraint.
- The `auth.users` table from Supabase Auth is the source of truth for user identity; the `profiles` table joins to it 1:1.
- Multi-tenancy is real but tenant switching is deferred. One deterministic "active" tenant per user is enough for the rest of M1.
- `Database` typing is hand-authored in this phase. Auto-generation (`supabase gen types typescript`) is deferred to the live-wiring phase.

### 14.2 Open questions (raise during PR review)

1. **Personal tenants on signup?** Should a brand-new user without any membership land on `/no-access`, or should signup auto-create a personal tenant + owner membership? This spec chooses `/no-access` because personal-tenant auto-create requires either a trigger (more SQL, more policy review) or service-role app code (forbidden in Phase 6). If product wants the auto-create, it is a follow-up issue.
2. **Should migrations land in this PR at all?** The constraint forbids "live wiring" but is silent on committed-but-unapplied SQL. The recommendation is to commit SQL; if review disagrees, the SQL block in §6 stays as spec-only and the migration files are deferred. The application-layer code in §4 does not depend on which choice is made.
3. **Should the `(app)` shell render anything for `kind: "supabase-missing"`?** Today it renders the empty dashboard. Phase 6 keeps that behavior. If reviewers prefer an explicit "configure Supabase to continue" notice, that becomes a one-line change to the layout.
4. **Slug uniqueness vs name collisions.** `tenants.slug` is `unique`. The implementation PR does not need to add a slug generator — there is no tenant-creation flow in Phase 6 — but the column exists for later phases.

### 14.3 Future work

- Signup/login implementation (separate issue, not yet filed in this milestone).
- Tenant creation, edit, archive (later milestone).
- Tenant switching UI + cookie-or-route-based active tenant selection (later milestone).
- Generated Supabase types (`supabase gen types`) replacing the hand-authored `Database` in §7.1.
- RLS regression suite (#51) once a local Supabase stack is available.
- Audit log integration (#48) hooking membership/tenant writes when those flows exist.
