import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { LeadRecord } from "@/lib/leads/contract";
import { DEFAULT_LEAD_FILTERS } from "@/lib/leads/filters";

import { LeadTable } from "../lead-table";

function createLeadRecord(overrides: Partial<LeadRecord> = {}): LeadRecord {
  const record: LeadRecord = {
    id: "lead-1",
    tenantId: "tenant-1",
    sourceId: "source-1",
    importBatchId: "batch-1",
    companyName: "Acme Services",
    domain: "acme.example",
    websiteUrl: "https://acme.example",
    industry: "SaaS",
    city: "Porto",
    stateRegion: "North",
    country: "PT",
    phone: "+15551234567",
    email: "sales@acme.example",
    status: "qualified",
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

describe("LeadTable", () => {
  it("renders read-only lead table fields", () => {
    const html = renderToStaticMarkup(
      createElement(LeadTable, {
        filters: DEFAULT_LEAD_FILTERS,
        leads: [createLeadRecord()]
      })
    );

    expect(html).toContain("Acme Services");
    expect(html).toContain("Qualified");
    expect(html).toContain("Porto, North, PT");
    expect(html).toContain("sales@acme.example");
    expect(html).toContain("Import");
  });

  it("renders a filtered empty state", () => {
    const html = renderToStaticMarkup(
      createElement(LeadTable, {
        filters: { ...DEFAULT_LEAD_FILTERS, status: "archived" },
        leads: []
      })
    );

    expect(html).toContain("No leads match these filters.");
  });
});
