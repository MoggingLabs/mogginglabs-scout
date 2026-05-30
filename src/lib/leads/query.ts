import type { SupabaseClient } from "@supabase/supabase-js";

import { mapLeadRowToRecord, type LeadRow } from "@/lib/leads/contract";
import { filterLeadRecords, type LeadFilters } from "@/lib/leads/filters";
import type { Database } from "@/lib/supabase/types";

export type LeadListQueryClient = Pick<SupabaseClient<Database>, "from">;

export type ListLeadRecordsInput = {
  tenantId: string;
  filters: LeadFilters;
  limit?: number;
};

export const LEAD_LIST_LIMIT = 200;

export const LEAD_LIST_SELECT =
  "id, tenant_id, source_id, import_batch_id, company_name, domain, website_url, industry, city, state_region, country, phone, email, status, source_metadata, created_by, created_at, updated_at";

export async function listLeadRecords(
  supabase: LeadListQueryClient,
  input: ListLeadRecordsInput
): Promise<LeadRow[]> {
  const limit = input.limit ?? LEAD_LIST_LIMIT;
  let query = supabase
    .from("leads")
    .select(LEAD_LIST_SELECT)
    .eq("tenant_id", input.tenantId);

  if (input.filters.status !== "all") {
    query = query.eq("status", input.filters.status);
  }

  if (input.filters.sourceId) {
    query = query.eq("source_id", input.filters.sourceId);
  }

  if (input.filters.importBatchId) {
    query = query.eq("import_batch_id", input.filters.importBatchId);
  }

  const { data, error } = await query
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data ?? []) as LeadRow[];
}

export async function listFilteredLeadRecords(
  supabase: LeadListQueryClient,
  input: ListLeadRecordsInput
) {
  const rows = await listLeadRecords(supabase, input);
  const records = rows.map(mapLeadRowToRecord);

  return filterLeadRecords(records, input.filters);
}
