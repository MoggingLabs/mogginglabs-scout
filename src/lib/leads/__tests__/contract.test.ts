import { describe, expect, it } from "vitest";

import { LEAD_IMPORT_FIELDS, type LeadImportFieldId } from "@/lib/imports/csv";

import {
  DEFAULT_LEAD_COUNTRY,
  DEFAULT_LEAD_STATUS,
  LEAD_CRM_FIELD_IDS,
  LEAD_STATUSES,
  coerceNullableLeadField,
  displayNullableLeadField,
  isLeadStatus,
  mapLeadRowToFieldValues,
  mapLeadRowToRecord,
  type LeadRow,
  type LeadStatus
} from "../contract";

function createLeadRow(overrides: Partial<LeadRow> = {}): LeadRow {
  return {
    id: "lead-1",
    tenant_id: "tenant-1",
    source_id: "source-1",
    import_batch_id: "batch-1",
    company_name: "Acme Services",
    domain: "example.com",
    website_url: "https://example.com",
    industry: "SaaS",
    city: "Porto",
    state_region: "Porto",
    country: "PT",
    phone: "+155****0100",
    email: "sales@example.com",
    status: "qualified",
    source_metadata: { importedBy: "csv" },
    created_by: "user-1",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-02T00:00:00.000Z",
    ...overrides
  };
}

describe("lead CRM contract constants", () => {
  it("keeps status constants aligned with the database enum contract", () => {
    const schemaStatuses: readonly LeadStatus[] = LEAD_STATUSES;

    expect(schemaStatuses).toEqual([
      "new",
      "qualified",
      "disqualified",
      "archived"
    ]);
    expect(DEFAULT_LEAD_STATUS).toBe("new");
  });

  it("keeps CRM field ids aligned with import field ids", () => {
    const importFieldIds: readonly LeadImportFieldId[] = LEAD_CRM_FIELD_IDS;

    expect(importFieldIds).toEqual(LEAD_IMPORT_FIELDS.map((field) => field.id));
    expect(DEFAULT_LEAD_COUNTRY).toBe("US");
  });
});

describe("lead status guard", () => {
  it("accepts every lead status and rejects non-lead statuses", () => {
    for (const status of LEAD_STATUSES) {
      expect(isLeadStatus(status)).toBe(true);
    }

    expect(isLeadStatus("draft")).toBe(false);
    expect(isLeadStatus("committed")).toBe(false);
    expect(isLeadStatus(null)).toBe(false);
    expect(isLeadStatus(undefined)).toBe(false);
  });
});

describe("lead nullable field helpers", () => {
  it("trims string fields and coerces blank values to null", () => {
    expect(coerceNullableLeadField("  Acme Services  ")).toBe("Acme Services");
    expect(coerceNullableLeadField("   ")).toBeNull();
    expect(coerceNullableLeadField("")).toBeNull();
    expect(coerceNullableLeadField(null)).toBeNull();
    expect(coerceNullableLeadField(undefined)).toBeNull();
  });

  it("formats nullable values for display with a caller-owned fallback", () => {
    expect(displayNullableLeadField(" sales@example.com ")).toBe(
      "sales@example.com"
    );
    expect(displayNullableLeadField(null, "Not provided")).toBe("Not provided");
  });
});

describe("lead row mapping", () => {
  it("maps lead rows into camel-cased app records and canonical field values", () => {
    const row = createLeadRow({
      domain: null,
      phone: null,
      status: "new"
    });

    expect(mapLeadRowToFieldValues(row)).toEqual({
      company_name: "Acme Services",
      domain: null,
      website_url: "https://example.com",
      industry: "SaaS",
      city: "Porto",
      state_region: "Porto",
      country: "PT",
      phone: null,
      email: "sales@example.com"
    });
    expect(mapLeadRowToRecord(row)).toEqual({
      id: "lead-1",
      tenantId: "tenant-1",
      sourceId: "source-1",
      importBatchId: "batch-1",
      companyName: "Acme Services",
      domain: null,
      websiteUrl: "https://example.com",
      industry: "SaaS",
      city: "Porto",
      stateRegion: "Porto",
      country: "PT",
      phone: null,
      email: "sales@example.com",
      status: "new",
      sourceMetadata: { importedBy: "csv" },
      createdBy: "user-1",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
      fields: {
        company_name: "Acme Services",
        domain: null,
        website_url: "https://example.com",
        industry: "SaaS",
        city: "Porto",
        state_region: "Porto",
        country: "PT",
        phone: null,
        email: "sales@example.com"
      }
    });
  });
});
