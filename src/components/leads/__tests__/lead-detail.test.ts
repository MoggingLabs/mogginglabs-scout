import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  LEAD_DETAIL_FALLBACK,
  LEAD_DETAIL_UNNAMED_COMPANY,
  LeadDetail,
  LeadDrawer,
  LeadStatusBadge,
  getLeadDetailSections,
  getLeadStatusLabel
} from "@/components/leads";
import { LEAD_STATUSES, type LeadRecord } from "@/lib/leads/contract";

function createLeadRecord(overrides: Partial<LeadRecord> = {}): LeadRecord {
  return {
    id: "lead-1",
    tenantId: "tenant-1",
    sourceId: "source-1",
    importBatchId: "batch-1",
    companyName: "Acme Services",
    domain: "example.com",
    websiteUrl: "https://example.com",
    industry: "Commercial services",
    city: "Austin",
    stateRegion: "TX",
    country: "US",
    phone: "+15550100",
    email: "sales@example.com",
    status: "qualified",
    sourceMetadata: { importColumn: "company" },
    createdBy: "user-1",
    createdAt: "2026-01-01T10:30:00.000Z",
    updatedAt: "2026-01-02T11:45:00.000Z",
    fields: {
      company_name: "Acme Services",
      domain: "example.com",
      website_url: "https://example.com",
      industry: "Commercial services",
      city: "Austin",
      state_region: "TX",
      country: "US",
      phone: "+15550100",
      email: "sales@example.com"
    },
    ...overrides
  };
}

function findField(lead: LeadRecord, fieldId: string) {
  const field = getLeadDetailSections(lead)
    .flatMap((section) => section.fields)
    .find((detailField) => detailField.id === fieldId);

  if (!field) {
    throw new Error(`Missing lead detail field: ${fieldId}`);
  }

  return field;
}

describe("lead detail field sections", () => {
  it("renders shared CRM contract fields into read-only sections", () => {
    const lead = createLeadRecord();

    expect(findField(lead, "company-name")).toMatchObject({
      label: "Company",
      value: "Acme Services"
    });
    expect(findField(lead, "domain")).toMatchObject({
      label: "Domain",
      value: "example.com",
      href: "https://example.com"
    });
    expect(findField(lead, "email")).toMatchObject({
      label: "Email",
      value: "sales@example.com",
      href: "mailto:sales@example.com"
    });
    expect(findField(lead, "country")).toMatchObject({
      label: "Country",
      value: "US"
    });
  });

  it("uses the contract display fallback for blank and nullable fields", () => {
    const lead = createLeadRecord({
      companyName: "  ",
      domain: null,
      websiteUrl: null,
      industry: null,
      phone: "   ",
      email: null,
      sourceId: null,
      importBatchId: null,
      createdBy: null
    });

    expect(findField(lead, "company-name").value).toBe(
      LEAD_DETAIL_UNNAMED_COMPANY
    );
    expect(findField(lead, "domain").value).toBe(LEAD_DETAIL_FALLBACK);
    expect(findField(lead, "website-url").value).toBe(LEAD_DETAIL_FALLBACK);
    expect(findField(lead, "industry").value).toBe(LEAD_DETAIL_FALLBACK);
    expect(findField(lead, "phone").value).toBe(LEAD_DETAIL_FALLBACK);
    expect(findField(lead, "email").href).toBeUndefined();
    expect(findField(lead, "source-id").value).toBe(LEAD_DETAIL_FALLBACK);
  });
});

describe("lead status display", () => {
  it("labels every shared lead status", () => {
    expect(LEAD_STATUSES.map((status) => getLeadStatusLabel(status))).toEqual([
      "New",
      "Qualified",
      "Disqualified",
      "Archived"
    ]);
  });

  it("renders the selected status badge", () => {
    const rendered = renderToStaticMarkup(
      createElement(LeadStatusBadge, { status: "disqualified" })
    );

    expect(rendered).toContain("Disqualified");
    expect(rendered).toContain("bg-destructive");
  });
});

describe("lead detail components", () => {
  it("renders lead values and status in the detail panel", () => {
    const rendered = renderToStaticMarkup(
      createElement(LeadDetail, { lead: createLeadRecord() })
    );

    expect(rendered).toContain("Acme Services");
    expect(rendered).toContain("Qualified");
    expect(rendered).toContain("sales@example.com");
    expect(rendered).toContain("2026-01-01 10:30 UTC");
  });

  it("renders a controlled drawer shell without list-page state wiring", () => {
    const renderedOpen = renderToStaticMarkup(
      createElement(LeadDrawer, {
        lead: createLeadRecord({ status: "new" }),
        open: true
      })
    );
    const renderedClosed = renderToStaticMarkup(
      createElement(LeadDrawer, {
        lead: createLeadRecord(),
        open: false
      })
    );

    expect(renderedOpen).toContain('role="dialog"');
    expect(renderedOpen).toContain("Lead details");
    expect(renderedOpen).toContain("New");
    expect(renderedClosed).toBe("");
  });

  it("renders an empty drawer fallback when no lead is selected", () => {
    const rendered = renderToStaticMarkup(
      createElement(LeadDrawer, {
        lead: null,
        open: true
      })
    );

    expect(rendered).toContain("No lead selected");
    expect(rendered).toContain("Select a lead to review its CRM details.");
  });
});
