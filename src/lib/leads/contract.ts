import type { Database } from "@/lib/supabase/types";

type PublicSchema = Database["public"];
type LeadTable = PublicSchema["Tables"]["leads"];
type LeadSourceTable = PublicSchema["Tables"]["lead_sources"];

export type LeadRow = LeadTable["Row"];
export type LeadInsert = LeadTable["Insert"];
export type LeadUpdate = LeadTable["Update"];
export type LeadStatus = PublicSchema["Enums"]["lead_status"];
export type LeadSourceRow = LeadSourceTable["Row"];

export const LEAD_STATUSES = [
  "new",
  "qualified",
  "disqualified",
  "archived"
] as const satisfies readonly LeadStatus[];

export const DEFAULT_LEAD_STATUS = "new" satisfies LeadStatus;
export const DEFAULT_LEAD_COUNTRY = "US";

export const LEAD_CRM_FIELD_IDS = [
  "company_name",
  "domain",
  "website_url",
  "industry",
  "city",
  "state_region",
  "country",
  "phone",
  "email"
] as const satisfies readonly (keyof LeadRow)[];

export type LeadCrmFieldId = (typeof LEAD_CRM_FIELD_IDS)[number];

export type LeadCrmFieldValues = {
  [FieldId in LeadCrmFieldId]: FieldId extends "company_name" | "country"
    ? string
    : string | null;
};

export type LeadRecord = {
  id: string;
  tenantId: string;
  sourceId: string | null;
  importBatchId: string | null;
  companyName: string;
  domain: string | null;
  websiteUrl: string | null;
  industry: string | null;
  city: string | null;
  stateRegion: string | null;
  country: string;
  phone: string | null;
  email: string | null;
  status: LeadStatus;
  sourceMetadata: LeadRow["source_metadata"];
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  fields: LeadCrmFieldValues;
};

const LEAD_STATUS_SET = new Set<LeadStatus>(LEAD_STATUSES);

export function isLeadStatus(value: unknown): value is LeadStatus {
  return typeof value === "string" && LEAD_STATUS_SET.has(value as LeadStatus);
}

export function coerceNullableLeadField(
  value: string | null | undefined
): string | null {
  const trimmedValue = value?.trim() ?? "";
  return trimmedValue.length > 0 ? trimmedValue : null;
}

export function displayNullableLeadField(
  value: string | null | undefined,
  fallback = ""
): string {
  return coerceNullableLeadField(value) ?? fallback;
}

export function mapLeadRowToRecord(row: LeadRow): LeadRecord {
  const fields = mapLeadRowToFieldValues(row);

  return {
    id: row.id,
    tenantId: row.tenant_id,
    sourceId: row.source_id,
    importBatchId: row.import_batch_id,
    companyName: fields.company_name,
    domain: fields.domain,
    websiteUrl: fields.website_url,
    industry: fields.industry,
    city: fields.city,
    stateRegion: fields.state_region,
    country: fields.country,
    phone: fields.phone,
    email: fields.email,
    status: row.status,
    sourceMetadata: row.source_metadata,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    fields
  };
}

export function mapLeadRowToFieldValues(row: LeadRow): LeadCrmFieldValues {
  return {
    company_name: row.company_name,
    domain: row.domain,
    website_url: row.website_url,
    industry: row.industry,
    city: row.city,
    state_region: row.state_region,
    country: row.country,
    phone: row.phone,
    email: row.email
  };
}
