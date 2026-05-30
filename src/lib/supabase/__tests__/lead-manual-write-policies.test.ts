import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/0005_lead_manual_write_policies.sql"
  ),
  "utf8"
);

describe("manual lead write policies", () => {
  it("limits authenticated writes to manual lead columns", () => {
    expect(migration).toContain(
      "revoke insert, update on table public.leads from authenticated;"
    );
    expect(migration).toContain("grant insert (");
    expect(migration).toContain("tenant_id,");
    expect(migration).toContain("created_by");
    expect(migration).toContain("grant update (");
    expect(migration).toContain("company_name,");
    expect(migration).not.toContain("grant update (\n  tenant_id");
    expect(migration).not.toContain("grant update (\n  source_id");
  });

  it("allows lead inserts only for members of the target tenant", () => {
    expect(migration).toContain(
      'create policy "leads_member_insert" on public.leads'
    );
    expect(migration).toContain("for insert with check");
    expect(migration).toContain("where m.tenant_id = leads.tenant_id");
    expect(migration).toContain("and m.profile_id = auth.uid()");
    expect(migration).toContain(
      "and (created_by is null or created_by = auth.uid())"
    );
  });

  it("allows lead updates only through tenant membership checks", () => {
    expect(migration).toContain(
      'create policy "leads_member_update" on public.leads'
    );
    expect(migration).toContain("for update using");
    expect(migration).toContain(") with check (");
  });

  it("prevents lead tenant ownership changes during updates", () => {
    expect(migration).toContain(
      "create function public.prevent_leads_tenant_id_update()"
    );
    expect(migration).toContain("if new.tenant_id <> old.tenant_id then");
    expect(migration).toContain(
      "create trigger leads_prevent_tenant_id_update"
    );
    expect(migration).toContain("before update of tenant_id on public.leads");
  });
});
