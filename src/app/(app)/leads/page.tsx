import { Badge } from "@/components/ui/badge";
import { LeadFiltersForm } from "@/components/leads/lead-filters";
import { LeadErrorState, LeadTable } from "@/components/leads/lead-table";
import { getAppContext } from "@/lib/account/context";
import {
  normalizeLeadFilters,
  type LeadFilterSearchParams
} from "@/lib/leads/filters";
import { listFilteredLeadRecords } from "@/lib/leads/query";
import { createClient } from "@/lib/supabase/server";

type LeadsPageProps = {
  searchParams?: Promise<LeadFilterSearchParams>;
};

export default async function LeadsPage({ searchParams }: LeadsPageProps) {
  const filters = normalizeLeadFilters(
    searchParams ? await searchParams : undefined
  );
  const context = await getAppContext();

  const leadList =
    context.kind === "ready"
      ? await readTenantLeads(context.tenant.id, filters)
      : {
          kind: "error" as const,
          message:
            context.kind === "supabase-missing"
              ? "Supabase is not configured for this environment, so live lead rows cannot be read."
              : "Lead data requires an authenticated workspace with an active tenant."
        };

  return (
    <div className="flex flex-1 flex-col gap-8">
      <header className="flex flex-col gap-3 border-b pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Lead Data Core
          </p>
          <h1 className="mt-2 text-3xl font-semibold">Leads</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            Review tenant-owned lead records with deterministic status and
            search filters. This surface is read-only for the M2 foundation.
          </p>
        </div>
        <Badge variant="secondary">Read-only</Badge>
      </header>

      <LeadFiltersForm filters={filters} />

      {leadList.kind === "ready" ? (
        <LeadTable filters={filters} leads={leadList.leads} />
      ) : (
        <LeadErrorState message={leadList.message} />
      )}
    </div>
  );
}

async function readTenantLeads(
  tenantId: string,
  filters: ReturnType<typeof normalizeLeadFilters>
) {
  try {
    const supabase = await createClient();
    const leads = await listFilteredLeadRecords(supabase, {
      tenantId,
      filters
    });

    return { kind: "ready" as const, leads };
  } catch {
    return {
      kind: "error" as const,
      message:
        "Lead records could not be loaded. Check read access and try again."
    };
  }
}
