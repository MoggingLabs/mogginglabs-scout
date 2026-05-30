import {
  displayNullableLeadField,
  isLeadStatus,
  type LeadRecord,
  type LeadStatus
} from "@/lib/leads/contract";

export const LEAD_FILTER_QUERY_KEYS = {
  search: "q",
  status: "status",
  sourceId: "source_id",
  importBatchId: "import_batch_id"
} as const;

export type LeadStatusFilter = LeadStatus | "all";

export type LeadFilters = {
  search: string;
  status: LeadStatusFilter;
  sourceId: string | null;
  importBatchId: string | null;
};

export type LeadFilterSearchParams =
  | URLSearchParams
  | Record<string, string | string[] | undefined>
  | undefined;

export const DEFAULT_LEAD_FILTERS = {
  search: "",
  status: "all",
  sourceId: null,
  importBatchId: null
} as const satisfies LeadFilters;

const MAX_SEARCH_LENGTH = 120;

export function normalizeLeadFilters(
  searchParams: LeadFilterSearchParams
): LeadFilters {
  const statusValue = cleanScalarParam(
    readSearchParam(searchParams, LEAD_FILTER_QUERY_KEYS.status)
  )?.toLowerCase();
  const status = statusValue && isLeadStatus(statusValue) ? statusValue : "all";

  return {
    search: normalizeSearchText(
      readSearchParam(searchParams, LEAD_FILTER_QUERY_KEYS.search)
    ),
    status,
    sourceId: cleanScalarParam(
      readSearchParam(searchParams, LEAD_FILTER_QUERY_KEYS.sourceId)
    ),
    importBatchId: cleanScalarParam(
      readSearchParam(searchParams, LEAD_FILTER_QUERY_KEYS.importBatchId)
    )
  };
}

export function hasActiveLeadFilters(filters: LeadFilters): boolean {
  return (
    filters.search.length > 0 ||
    filters.status !== "all" ||
    filters.sourceId !== null ||
    filters.importBatchId !== null
  );
}

export function filterLeadRecords(
  leads: readonly LeadRecord[],
  filters: LeadFilters
): LeadRecord[] {
  const terms = filters.search.toLowerCase().split(" ").filter(Boolean);

  return leads.filter((lead) => {
    if (filters.status !== "all" && lead.status !== filters.status) {
      return false;
    }

    if (filters.sourceId && lead.sourceId !== filters.sourceId) {
      return false;
    }

    if (filters.importBatchId && lead.importBatchId !== filters.importBatchId) {
      return false;
    }

    if (terms.length === 0) {
      return true;
    }

    const searchableText = buildLeadSearchText(lead);
    return terms.every((term) => searchableText.includes(term));
  });
}

function buildLeadSearchText(lead: LeadRecord): string {
  return [
    lead.companyName,
    lead.domain,
    lead.websiteUrl,
    lead.industry,
    lead.city,
    lead.stateRegion,
    lead.country,
    lead.phone,
    lead.email,
    lead.status
  ]
    .map((value) => displayNullableLeadField(value))
    .join(" ")
    .toLowerCase();
}

function normalizeSearchText(value: string | undefined): string {
  const normalized = cleanScalarParam(value)?.replace(/\s+/g, " ") ?? "";

  return normalized.slice(0, MAX_SEARCH_LENGTH);
}

function cleanScalarParam(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? "";

  return trimmed.length > 0 ? trimmed : null;
}

function readSearchParam(
  searchParams: LeadFilterSearchParams,
  key: string
): string | undefined {
  if (!searchParams) {
    return undefined;
  }

  if (searchParams instanceof URLSearchParams) {
    return searchParams.get(key) ?? undefined;
  }

  const value = searchParams[key];

  return Array.isArray(value) ? value[0] : value;
}
