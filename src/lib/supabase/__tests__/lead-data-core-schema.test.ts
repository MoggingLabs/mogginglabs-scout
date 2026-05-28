import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/0004_lead_data_core.sql"),
  "utf8"
);

const databaseTypes = readFileSync(
  join(process.cwd(), "src/lib/supabase/types.ts"),
  "utf8"
);

describe("lead data core migration", () => {
  it("creates source, import batch, import row, and lead tables", () => {
    expect(migration).toContain("create type lead_status as enum");
    expect(migration).toContain("create type import_batch_status as enum");
    expect(migration).toContain("create table public.lead_sources");
    expect(migration).toContain("create table public.import_batches");
    expect(migration).toContain("create table public.import_rows");
    expect(migration).toContain("create table public.leads");
  });

  it("scopes every tenant-owned table to tenants and enables RLS", () => {
    for (const table of [
      "lead_sources",
      "import_batches",
      "import_rows",
      "leads"
    ]) {
      expect(migration).toContain(
        `alter table public.${table} enable row level security;`
      );
      expect(migration).toContain(
        `tenant_id uuid not null references public.tenants(id) on delete cascade`
      );
    }
  });

  it("adds tenant-safe indexes and deduplication constraints", () => {
    expect(migration).toContain(
      "create unique index lead_sources_tenant_name_key"
    );
    expect(migration).toContain("create unique index leads_tenant_domain_key");
    expect(migration).toContain("create index leads_tenant_status_idx");
    expect(migration).toContain("create index import_rows_batch_status_idx");
    expect(migration).toContain("import_batches_tenant_source_fkey");
    expect(migration).toContain("leads_tenant_source_fkey");
    expect(migration).toContain("leads_tenant_import_batch_fkey");
    expect(migration).toContain("import_rows_tenant_batch_fkey");
    expect(migration).toContain("import_rows_tenant_lead_fkey");
  });
});

describe("lead data core database types", () => {
  it("adds table typings for lead data core tables", () => {
    for (const table of [
      "lead_sources",
      "import_batches",
      "import_rows",
      "leads"
    ]) {
      expect(databaseTypes).toContain(`${table}: {`);
    }
  });

  it("adds enum typings for lead and import statuses", () => {
    expect(databaseTypes).toContain("lead_status:");
    expect(databaseTypes).toContain("import_batch_status:");
    expect(databaseTypes).toContain("import_row_status:");
  });
});
