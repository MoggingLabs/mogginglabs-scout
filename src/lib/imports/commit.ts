import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";

import type {
  LeadImportDuplicateEvidence,
  LeadImportValidatedRow,
  LeadImportValidationError
} from "./validation";

export type LeadInsert = Database["public"]["Tables"]["leads"]["Insert"];
export type LeadImportCommitClient = Pick<SupabaseClient<Database>, "from">;

export type LeadImportCommitContext = {
  tenantId: string;
  sourceId?: string | null;
  importBatchId?: string | null;
  createdBy?: string | null;
};

export type LeadImportCommitInput = LeadImportCommitContext & {
  rows: LeadImportValidatedRow[];
};

export type LeadImportCommitRow = {
  rowNumber: number;
  lead: LeadInsert;
};

export type LeadImportCommitSkippedRow = {
  rowNumber: number;
  status: "invalid" | "duplicate";
  errors: LeadImportValidationError[];
  duplicateKey: string | null;
  duplicates: LeadImportDuplicateEvidence[];
};

export type LeadImportCommitSummary = {
  totalRows: number;
  committedRows: number;
  skippedInvalidRows: number;
  skippedDuplicateRows: number;
};

export type LeadImportCommitPayload = {
  leadRows: LeadImportCommitRow[];
  skippedRows: LeadImportCommitSkippedRow[];
  summary: LeadImportCommitSummary;
};

export function buildLeadImportCommitPayload(
  input: LeadImportCommitInput
): LeadImportCommitPayload {
  const leadRows: LeadImportCommitRow[] = [];
  const skippedRows: LeadImportCommitSkippedRow[] = [];

  for (const row of input.rows) {
    if (isValidLeadImportRow(row)) {
      leadRows.push({
        rowNumber: row.rowNumber,
        lead: mapValidLeadImportRowToLeadInsert(row, input)
      });
      continue;
    }

    skippedRows.push({
      rowNumber: row.rowNumber,
      status: row.status === "invalid" ? "invalid" : "duplicate",
      errors: row.errors,
      duplicateKey: row.duplicateKey,
      duplicates: row.duplicates
    });
  }

  return {
    leadRows,
    skippedRows,
    summary: summarizeCommitRows(input.rows.length, leadRows, skippedRows)
  };
}

export async function commitValidatedLeadImportRows(
  supabase: LeadImportCommitClient,
  input: LeadImportCommitInput
): Promise<LeadImportCommitPayload> {
  const payload = buildLeadImportCommitPayload(input);
  const leads = payload.leadRows.map((row) => row.lead);

  if (leads.length === 0) {
    return payload;
  }

  const { error } = await supabase.from("leads").insert(leads);
  if (error) {
    throw error;
  }

  return payload;
}

export function mapValidLeadImportRowToLeadInsert(
  row: LeadImportValidatedRow & { status: "valid" },
  context: LeadImportCommitContext
): LeadInsert {
  const companyName = row.normalizedData.company_name;
  if (!companyName) {
    throw new Error(
      `Validated import row ${row.rowNumber} is missing company_name.`
    );
  }

  return {
    tenant_id: context.tenantId,
    source_id: context.sourceId ?? null,
    import_batch_id: context.importBatchId ?? null,
    company_name: companyName,
    domain: nullableLeadField(row.normalizedData.domain),
    website_url: nullableLeadField(row.normalizedData.website_url),
    industry: nullableLeadField(row.normalizedData.industry),
    city: nullableLeadField(row.normalizedData.city),
    state_region: nullableLeadField(row.normalizedData.state_region),
    country: row.normalizedData.country ?? "US",
    phone: nullableLeadField(row.normalizedData.phone),
    email: nullableLeadField(row.normalizedData.email),
    created_by: context.createdBy ?? null
  };
}

function summarizeCommitRows(
  totalRows: number,
  leadRows: LeadImportCommitRow[],
  skippedRows: LeadImportCommitSkippedRow[]
): LeadImportCommitSummary {
  return {
    totalRows,
    committedRows: leadRows.length,
    skippedInvalidRows: skippedRows.filter((row) => row.status === "invalid")
      .length,
    skippedDuplicateRows: skippedRows.filter(
      (row) => row.status === "duplicate"
    ).length
  };
}

function nullableLeadField(value: string | undefined): string | null {
  return value && value.length > 0 ? value : null;
}

function isValidLeadImportRow(
  row: LeadImportValidatedRow
): row is LeadImportValidatedRow & { status: "valid" } {
  return row.status === "valid";
}
