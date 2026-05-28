create type lead_status as enum ('new', 'qualified', 'disqualified', 'archived');
create type import_batch_status as enum ('draft', 'validating', 'ready', 'committed', 'failed');
create type import_row_status as enum ('pending', 'valid', 'invalid', 'duplicate', 'committed');

create table public.lead_sources (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  kind text not null default 'manual',
  external_reference text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.import_batches (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  source_id uuid references public.lead_sources(id) on delete set null,
  filename text not null,
  status import_batch_status not null default 'draft',
  total_rows integer not null default 0 check (total_rows >= 0),
  valid_rows integer not null default 0 check (valid_rows >= 0),
  invalid_rows integer not null default 0 check (invalid_rows >= 0),
  committed_rows integer not null default 0 check (committed_rows >= 0),
  created_by uuid references public.profiles(id) on delete set null,
  mapping jsonb not null default '{}'::jsonb,
  error_summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  source_id uuid references public.lead_sources(id) on delete set null,
  import_batch_id uuid references public.import_batches(id) on delete set null,
  company_name text not null,
  domain text,
  website_url text,
  industry text,
  city text,
  state_region text,
  country text not null default 'US',
  phone text,
  email text,
  status lead_status not null default 'new',
  source_metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.import_rows (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.import_batches(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  row_number integer not null check (row_number > 0),
  status import_row_status not null default 'pending',
  raw_data jsonb not null,
  normalized_data jsonb not null default '{}'::jsonb,
  validation_errors jsonb not null default '[]'::jsonb,
  duplicate_key text,
  lead_id uuid references public.leads(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (batch_id, row_number)
);

create unique index lead_sources_tenant_name_key
  on public.lead_sources (tenant_id, lower(name));
create unique index lead_sources_tenant_id_id_key
  on public.lead_sources (tenant_id, id);
create index lead_sources_tenant_id_idx on public.lead_sources(tenant_id);

create unique index import_batches_tenant_id_id_key
  on public.import_batches (tenant_id, id);
create index import_batches_tenant_status_idx
  on public.import_batches(tenant_id, status);
create index import_batches_source_id_idx on public.import_batches(source_id);

create unique index leads_tenant_id_id_key
  on public.leads (tenant_id, id);
create unique index leads_tenant_domain_key
  on public.leads (tenant_id, lower(domain))
  where domain is not null;
create index leads_tenant_status_idx on public.leads(tenant_id, status);
create index leads_source_id_idx on public.leads(source_id);
create index leads_import_batch_id_idx on public.leads(import_batch_id);

create index import_rows_batch_status_idx on public.import_rows(batch_id, status);
create index import_rows_tenant_id_idx on public.import_rows(tenant_id);
create index import_rows_duplicate_key_idx on public.import_rows(tenant_id, duplicate_key)
  where duplicate_key is not null;

alter table public.import_batches
  add constraint import_batches_tenant_source_fkey
  foreign key (tenant_id, source_id)
  references public.lead_sources(tenant_id, id);

alter table public.leads
  add constraint leads_tenant_source_fkey
  foreign key (tenant_id, source_id)
  references public.lead_sources(tenant_id, id);

alter table public.leads
  add constraint leads_tenant_import_batch_fkey
  foreign key (tenant_id, import_batch_id)
  references public.import_batches(tenant_id, id);

alter table public.import_rows
  add constraint import_rows_tenant_batch_fkey
  foreign key (tenant_id, batch_id)
  references public.import_batches(tenant_id, id);

alter table public.import_rows
  add constraint import_rows_tenant_lead_fkey
  foreign key (tenant_id, lead_id)
  references public.leads(tenant_id, id);

alter table public.lead_sources enable row level security;
alter table public.import_batches enable row level security;
alter table public.import_rows enable row level security;
alter table public.leads enable row level security;

create policy "lead_sources_member_select" on public.lead_sources
  for select using (
    exists (
      select 1
      from public.memberships m
      where m.tenant_id = lead_sources.tenant_id
        and m.profile_id = auth.uid()
    )
  );

create policy "import_batches_member_select" on public.import_batches
  for select using (
    exists (
      select 1
      from public.memberships m
      where m.tenant_id = import_batches.tenant_id
        and m.profile_id = auth.uid()
    )
  );

create policy "import_rows_member_select" on public.import_rows
  for select using (
    exists (
      select 1
      from public.memberships m
      where m.tenant_id = import_rows.tenant_id
        and m.profile_id = auth.uid()
    )
  );

create policy "leads_member_select" on public.leads
  for select using (
    exists (
      select 1
      from public.memberships m
      where m.tenant_id = leads.tenant_id
        and m.profile_id = auth.uid()
    )
  );

create trigger lead_sources_set_updated_at
  before update on public.lead_sources
  for each row execute function public.set_updated_at();

create trigger import_batches_set_updated_at
  before update on public.import_batches
  for each row execute function public.set_updated_at();

create trigger import_rows_set_updated_at
  before update on public.import_rows
  for each row execute function public.set_updated_at();

create trigger leads_set_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();
