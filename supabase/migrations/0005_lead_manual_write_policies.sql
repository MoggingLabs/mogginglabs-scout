-- Manual lead create/edit uses authenticated Supabase writes from server
-- actions. The app derives tenant_id from membership context; these policies
-- keep direct table writes tenant-scoped for members of that tenant.

revoke insert, update on table public.leads from authenticated;

grant insert (
  tenant_id,
  company_name,
  domain,
  website_url,
  industry,
  city,
  state_region,
  country,
  phone,
  email,
  status,
  created_by
) on table public.leads to authenticated;

grant update (
  company_name,
  domain,
  website_url,
  industry,
  city,
  state_region,
  country,
  phone,
  email,
  status
) on table public.leads to authenticated;

create policy "leads_member_insert" on public.leads
  for insert with check (
    exists (
      select 1
      from public.memberships m
      where m.tenant_id = leads.tenant_id
        and m.profile_id = auth.uid()
    )
    and (created_by is null or created_by = auth.uid())
  );

create policy "leads_member_update" on public.leads
  for update using (
    exists (
      select 1
      from public.memberships m
      where m.tenant_id = leads.tenant_id
        and m.profile_id = auth.uid()
    )
  ) with check (
    exists (
      select 1
      from public.memberships m
      where m.tenant_id = leads.tenant_id
        and m.profile_id = auth.uid()
    )
  );

create function public.prevent_leads_tenant_id_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.tenant_id <> old.tenant_id then
    raise exception 'lead tenant_id cannot be changed';
  end if;

  return new;
end;
$$;

create trigger leads_prevent_tenant_id_update
  before update of tenant_id on public.leads
  for each row execute function public.prevent_leads_tenant_id_update();
