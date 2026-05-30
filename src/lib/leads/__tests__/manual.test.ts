import { describe, expect, it } from "vitest";

import {
  DEFAULT_LEAD_COUNTRY,
  DEFAULT_LEAD_STATUS,
  LEAD_CRM_FIELD_IDS,
  type LeadRow
} from "../contract";
import {
  MANUAL_LEAD_FORM_FIELDS,
  createManualLeadFormState,
  isValidLeadId,
  mapLeadRowToManualLeadFormValues,
  mapManualLeadValuesToLeadInsert,
  mapManualLeadValuesToLeadUpdate,
  parseManualLeadFormData,
  validateManualLeadFormInput,
  type ManualLeadFormInput
} from "../manual";

function createManualLeadInput(
  overrides: Partial<ManualLeadFormInput> = {}
): ManualLeadFormInput {
  return {
    company_name: "Acme Labs",
    domain: "",
    website_url: "",
    industry: "",
    city: "",
    state_region: "",
    country: DEFAULT_LEAD_COUNTRY,
    phone: "",
    email: "",
    status: DEFAULT_LEAD_STATUS,
    ...overrides
  };
}

function createLeadRow(overrides: Partial<LeadRow> = {}): LeadRow {
  return {
    id: "lead-1",
    tenant_id: "tenant-1",
    source_id: null,
    import_batch_id: null,
    company_name: "Acme Labs",
    domain: null,
    website_url: "https://example.com",
    industry: null,
    city: "Austin",
    state_region: "TX",
    country: "US",
    phone: null,
    email: "sales@example.com",
    status: "qualified",
    source_metadata: {},
    created_by: "profile-1",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-02T00:00:00.000Z",
    ...overrides
  };
}

describe("manual lead form contract", () => {
  it("keeps manual form fields aligned with the shared CRM field ids", () => {
    expect(MANUAL_LEAD_FORM_FIELDS.map((field) => field.id)).toEqual(
      LEAD_CRM_FIELD_IDS
    );
    expect(MANUAL_LEAD_FORM_FIELDS.filter((field) => field.required)).toEqual([
      expect.objectContaining({ id: "company_name" })
    ]);
  });

  it("creates an idle form state with lead defaults", () => {
    expect(createManualLeadFormState()).toMatchObject({
      kind: "idle",
      message: null,
      values: {
        country: DEFAULT_LEAD_COUNTRY,
        status: DEFAULT_LEAD_STATUS
      },
      errors: {}
    });
  });
});

describe("manual lead form parsing and validation", () => {
  it("parses string fields from FormData", () => {
    const formData = new FormData();
    formData.set("company_name", "  Acme Labs  ");
    formData.set("email", "SALES@example.com");
    formData.set("status", "qualified");

    expect(parseManualLeadFormData(formData)).toMatchObject({
      company_name: "  Acme Labs  ",
      email: "SALES@example.com",
      status: "qualified"
    });
  });

  it("normalizes valid values and derives domain from website URL", () => {
    const result = validateManualLeadFormInput(
      createManualLeadInput({
        company_name: "  Acme   Labs  ",
        website_url: "example.com/path/",
        industry: " SaaS   Tools ",
        city: " New   York ",
        state_region: " ny ",
        country: " us ",
        phone: " +1 (555) 123-4567 ",
        email: " SALES@Example.COM ",
        status: "qualified"
      })
    );

    expect(result).toEqual({
      isValid: true,
      errors: {},
      values: {
        company_name: "Acme Labs",
        domain: "example.com",
        website_url: "https://example.com/path",
        industry: "SaaS Tools",
        city: "New York",
        state_region: "ny",
        country: "US",
        phone: "+15551234567",
        email: "sales@example.com",
        status: "qualified"
      }
    });
  });

  it("returns field errors for missing required and invalid optional values", () => {
    const result = validateManualLeadFormInput(
      createManualLeadInput({
        company_name: "   ",
        domain: "not-a-host",
        website_url: "ftp://example.com",
        phone: "123",
        email: "bad-email",
        status: "draft"
      })
    );

    expect(result.isValid).toBe(false);
    expect(result.errors).toEqual({
      company_name: "Company name is required.",
      domain: "Domain must be a valid host name.",
      website_url: "Website URL must be http(s) or a bare host name.",
      email: "Email must be a valid address.",
      phone: "Phone must contain at least seven digits.",
      status: "Choose a valid lead status."
    });
    expect(result.values.status).toBe(DEFAULT_LEAD_STATUS);
  });
});

describe("manual lead persistence mapping", () => {
  it("maps validated values into a tenant-scoped lead insert", () => {
    const validation = validateManualLeadFormInput(
      createManualLeadInput({
        company_name: "  Acme   Labs ",
        domain: "https://www.example.com/about",
        email: " Sales@Example.COM ",
        status: "qualified"
      })
    );

    expect(validation.isValid).toBe(true);
    expect(
      mapManualLeadValuesToLeadInsert(validation.values, {
        tenantId: "tenant-1",
        createdBy: "profile-1"
      })
    ).toEqual({
      tenant_id: "tenant-1",
      company_name: "Acme Labs",
      domain: "example.com",
      website_url: null,
      industry: null,
      city: null,
      state_region: null,
      country: "US",
      phone: null,
      email: "sales@example.com",
      status: "qualified",
      created_by: "profile-1"
    });
  });

  it("maps updates without tenant or creator ownership fields", () => {
    const validation = validateManualLeadFormInput(
      createManualLeadInput({
        company_name: "Acme Labs",
        country: "",
        status: "archived"
      })
    );
    const update = mapManualLeadValuesToLeadUpdate(validation.values);

    expect(update).toMatchObject({
      company_name: "Acme Labs",
      country: DEFAULT_LEAD_COUNTRY,
      status: "archived"
    });
    expect("tenant_id" in update).toBe(false);
    expect("created_by" in update).toBe(false);
  });

  it("maps nullable lead rows into string form defaults", () => {
    expect(mapLeadRowToManualLeadFormValues(createLeadRow())).toEqual({
      company_name: "Acme Labs",
      domain: "",
      website_url: "https://example.com",
      industry: "",
      city: "Austin",
      state_region: "TX",
      country: "US",
      phone: "",
      email: "sales@example.com",
      status: "qualified"
    });
  });

  it("validates lead ids used by manual edit routes", () => {
    expect(isValidLeadId("11111111-1111-4111-8111-111111111111")).toBe(true);
    expect(isValidLeadId("lead-1")).toBe(false);
    expect(isValidLeadId("11111111-1111-1111-1111-111111111111")).toBe(false);
  });
});
