import { describe, expect, it } from "vitest";

import type { LeadRecord } from "@/lib/leads/contract";

import {
  DEFAULT_LEAD_FILTERS,
  filterLeadRecords,
  hasActiveLeadFilters,
  normalizeLeadFilters,
  type LeadFilters
} from "../filters";

function createLeadRecord(overrides: Partial<LeadRecord> = {}): LeadRecord {
  const record: LeadRecord = {
    id: "lead-1",
    tenantId: "tenant-1",
    sourceId: null,
    importBatchId: null,
    companyName: "Acme Services",
    domain: "acme.example",
    websiteUrl: "https://acme.example",
    industry: "SaaS",
    city: "Porto",
    stateRegion: "North",
    country: "PT",
    phone: "+15551234567",
    email: "sales@acme.example",
    status: "new",
    sourceMetadata: {},
    createdBy: "user-1",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    fields: {
      company_name: "Acme Services",
      domain: "acme.example",
      website_url: "https://acme.example",
      industry: "SaaS",
      city: "Porto",
      state_region: "North",
      country: "PT",
      phone: "+15551234567",
      email: "sales@acme.example"
    }
  };

  return {
    ...record,
    ...overrides,
    fields: {
      ...record.fields,
      ...overrides.fields
    }
  };
}

describe("normalizeLeadFilters", () => {
  it("normalizes URLSearchParams into a deterministic filter shape", () => {
    const searchParams = new URLSearchParams({
      q: "  Acme   Porto  ",
      status: "QUALIFIED",
      source_id: " source-1 ",
      import_batch_id: " batch-1 "
    });

    expect(normalizeLeadFilters(searchParams)).toEqual({
      search: "Acme Porto",
      status: "qualified",
      sourceId: "source-1",
      importBatchId: "batch-1"
    });
  });

  it("falls back to all statuses and empty provenance filters", () => {
    expect(
      normalizeLeadFilters({
        q: ["  first value  ", "second value"],
        status: "committed",
        source_id: " ",
        import_batch_id: undefined
      })
    ).toEqual({
      search: "first value",
      status: "all",
      sourceId: null,
      importBatchId: null
    });
  });
});

describe("hasActiveLeadFilters", () => {
  it("treats the default filter shape as inactive", () => {
    expect(hasActiveLeadFilters(DEFAULT_LEAD_FILTERS)).toBe(false);
  });

  it("detects status, search, source, and import filters", () => {
    const activeFilters: LeadFilters[] = [
      { ...DEFAULT_LEAD_FILTERS, search: "acme" },
      { ...DEFAULT_LEAD_FILTERS, status: "new" },
      { ...DEFAULT_LEAD_FILTERS, sourceId: "source-1" },
      { ...DEFAULT_LEAD_FILTERS, importBatchId: "batch-1" }
    ];

    expect(activeFilters.every(hasActiveLeadFilters)).toBe(true);
  });
});

describe("filterLeadRecords", () => {
  it("applies status, search, source, and import filters together", () => {
    const leads = [
      createLeadRecord({
        id: "lead-1",
        sourceId: "source-1",
        importBatchId: "batch-1",
        status: "qualified"
      }),
      createLeadRecord({
        id: "lead-2",
        companyName: "Bravo Fitness",
        domain: "bravo.example",
        city: "Lisbon",
        status: "qualified"
      }),
      createLeadRecord({
        id: "lead-3",
        companyName: "Acme Archive",
        sourceId: "source-1",
        importBatchId: "batch-1",
        status: "archived"
      })
    ];

    expect(
      filterLeadRecords(leads, {
        search: "acme porto",
        status: "qualified",
        sourceId: "source-1",
        importBatchId: "batch-1"
      }).map((lead) => lead.id)
    ).toEqual(["lead-1"]);
  });

  it("matches search terms across nullable lead display fields", () => {
    const leads = [
      createLeadRecord({
        id: "lead-1",
        companyName: "Null Contact",
        domain: null,
        email: "hello@example.com",
        phone: null
      }),
      createLeadRecord({
        id: "lead-2",
        companyName: "Other Contact",
        email: null
      })
    ];

    expect(
      filterLeadRecords(leads, {
        ...DEFAULT_LEAD_FILTERS,
        search: "hello example"
      }).map((lead) => lead.id)
    ).toEqual(["lead-1"]);
  });
});
