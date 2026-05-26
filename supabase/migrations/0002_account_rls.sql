alter table public.profiles enable row level security;
alter table public.tenants enable row level security;
alter table public.memberships enable row level security;

create policy "profiles_self_select" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_self_update" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "memberships_self_select" on public.memberships
  for select using (auth.uid() = profile_id);

create policy "tenants_member_select" on public.tenants
  for select using (
    exists (
      select 1
      from public.memberships m
      where m.tenant_id = tenants.id
        and m.profile_id = auth.uid()
    )
  );
