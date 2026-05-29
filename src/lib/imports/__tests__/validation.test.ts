import { describe, expect, it } from "vitest";

import { parseCsvText, suggestCsvColumnMapping } from "../csv";
import {
  buildLeadImportDuplicateKey,
  normalizeLeadImportValue,
  validateLeadImportRows
} from "../validation";

describe("lead import value normalization", () => {
  it("normalizes domains, website URLs, emails, phones, country, and company names", () => {
    expect(
      normalizeLeadImportValue("company_name", "  Acme   Services  ")
    ).toEqual({
      value: "Acme Services",
      errors: []
    });
    expect(
      normalizeLeadImportValue("domain", "https://WWW.Example.COM/path?q=1")
    ).toEqual({
      value: "example.com",
      errors: []
    });
    expect(normalizeLeadImportValue("website_url", "example.com/demo")).toEqual(
      {
        value: "https://example.com/demo",
        errors: []
      }
    );
    expect(normalizeLeadImportValue("email", " SALES@Example.COM ")).toEqual({
      value: "sales@example.com",
      errors: []
    });
    expect(normalizeLeadImportValue("phone", " +1 (555) 123-4567 ")).toEqual({
      value: "+15551234567",
      errors: []
    });
    expect(normalizeLeadImportValue("country", " pt ")).toEqual({
      value: "PT",
      errors: []
    });
  });

  it("returns typed format errors for invalid optional values", () => {
    expect(
      normalizeLeadImportValue("domain", "not a host").errors
    ).toContainEqual({
      code: "invalid-domain",
      fieldId: "domain",
      message: "Domain must be a valid host name."
    });
    expect(
      normalizeLeadImportValue("website_url", "mailto:sales@example.com").errors
    ).toContainEqual({
      code: "invalid-website-url",
      fieldId: "website_url",
      message: "Website URL must be http(s) or a bare host name."
    });
    expect(
      normalizeLeadImportValue("email", "sales-at-example").errors
    ).toContainEqual({
      code: "invalid-email",
      fieldId: "email",
      message: "Email must be a valid address."
    });
    expect(normalizeLeadImportValue("phone", "123").errors).toContainEqual({
      code: "invalid-phone",
      fieldId: "phone",
      message: "Phone must contain at least seven digits."
    });
  });
});

describe("lead import duplicate keys", () => {
  it("uses domain, email, phone, then company/location as duplicate-key precedence", () => {
    expect(
      buildLeadImportDuplicateKey({
        company_name: "Acme",
        domain: "example.com",
        email: "sales@example.com",
        phone: "+15551234567",
        city: "Porto",
        country: "PT"
      })
    ).toBe("domain:example.com");
    expect(
      buildLeadImportDuplicateKey({
        company_name: "Acme",
        email: "sales@example.com"
      })
    ).toBe("email:sales@example.com");
    expect(
      buildLeadImportDuplicateKey({
        company_name: "Acme",
        phone: "+15551234567"
      })
    ).toBe("phone:+15551234567");
    expect(
      buildLeadImportDuplicateKey({
        company_name: "Acme Services",
        city: "Porto",
        country: "PT"
      })
    ).toBe("company:acme services|porto|pt");
  });
});

describe("lead import row validation", () => {
  it("normalizes mapped rows, derives domain from website, and defaults country", () => {
    const parsed = parseCsvText(
      "Company,Website,Email\n  Acme   Services  ,example.com/path, SALES@Example.COM \n"
    );
    const mapping = suggestCsvColumnMapping(parsed.headers);

    const result = validateLeadImportRows({
      rows: parsed.rows,
      mapping: mapping.mapping
    });

    expect(result.summary).toEqual({
      totalRows: 1,
      validRows: 1,
      invalidRows: 0,
      duplicateRows: 0
    });
    expect(result.rows[0]).toMatchObject({
      rowNumber: 2,
      status: "valid",
      duplicateKey: "domain:example.com",
      normalizedData: {
        company_name: "Acme Services",
        domain: "example.com",
        website_url: "https://example.com/path",
        email: "sales@example.com",
        country: "US"
      },
      errors: [],
      duplicates: []
    });
  });

  it("marks rows with missing required company or invalid formats as invalid", () => {
    const parsed = parseCsvText(
      "Company,Website,Email,Phone\n,notaurl,sales-at-example,123\n"
    );
    const mapping = suggestCsvColumnMapping(parsed.headers);

    const result = validateLeadImportRows({
      rows: parsed.rows,
      mapping: mapping.mapping
    });

    expect(result.summary).toEqual({
      totalRows: 1,
      validRows: 0,
      invalidRows: 1,
      duplicateRows: 0
    });
    expect(result.rows[0].status).toBe("invalid");
    expect(result.rows[0].errors.map((error) => error.code)).toEqual([
      "missing-required-field",
      "invalid-website-url",
      "invalid-email",
      "invalid-phone"
    ]);
  });

  it("detects duplicate rows inside the same import preview", () => {
    const parsed = parseCsvText(
      "Company,Website,City,Country\nAcme,https://example.com,Porto,PT\nAcme Duplicate,example.com/about,Lisbon,PT\n"
    );
    const mapping = suggestCsvColumnMapping(parsed.headers);

    const result = validateLeadImportRows({
      rows: parsed.rows,
      mapping: mapping.mapping
    });

    expect(result.summary).toEqual({
      totalRows: 2,
      validRows: 0,
      invalidRows: 0,
      duplicateRows: 2
    });
    expect(result.rows.map((row) => row.status)).toEqual([
      "duplicate",
      "duplicate"
    ]);
    expect(result.rows[0].duplicates).toEqual([
      {
        scope: "import",
        duplicateKey: "domain:example.com",
        rowNumbers: [2, 3]
      }
    ]);
    expect(result.rows[1].duplicates).toEqual([
      {
        scope: "import",
        duplicateKey: "domain:example.com",
        rowNumbers: [2, 3]
      }
    ]);
  });

  it("does not let invalid high-precedence identifiers mask valid duplicate evidence", () => {
    const parsed = parseCsvText(
      "Company,Domain,Email\nAcme,not a host,dupe@example.com\nOther,also not host,DUPE@example.com\n"
    );
    const mapping = suggestCsvColumnMapping(parsed.headers);

    const result = validateLeadImportRows({
      rows: parsed.rows,
      mapping: mapping.mapping
    });

    expect(result.summary).toEqual({
      totalRows: 2,
      validRows: 0,
      invalidRows: 2,
      duplicateRows: 0
    });
    expect(result.rows.map((row) => row.duplicateKey)).toEqual([
      "email:dupe@example.com",
      "email:dupe@example.com"
    ]);
    expect(result.rows[0].errors).toContainEqual({
      code: "invalid-domain",
      fieldId: "domain",
      message: "Domain must be a valid host name."
    });
    expect(result.rows[0].duplicates).toEqual([
      {
        scope: "import",
        duplicateKey: "email:dupe@example.com",
        rowNumbers: [2, 3]
      }
    ]);
  });

  it("detects duplicates against supplied existing lead candidates without database access", () => {
    const parsed = parseCsvText("Company,Website\nAcme,https://example.com\n");
    const mapping = suggestCsvColumnMapping(parsed.headers);

    const result = validateLeadImportRows({
      rows: parsed.rows,
      mapping: mapping.mapping,
      existingLeads: [
        { id: "lead_1", company_name: "Existing Acme", domain: "EXAMPLE.com" }
      ]
    });

    expect(result.summary).toEqual({
      totalRows: 1,
      validRows: 0,
      invalidRows: 0,
      duplicateRows: 1
    });
    expect(result.rows[0]).toMatchObject({
      status: "duplicate",
      duplicateKey: "domain:example.com",
      duplicates: [
        {
          scope: "existing",
          duplicateKey: "domain:example.com",
          leadIds: ["lead_1"]
        }
      ]
    });
  });

  it("keeps invalid duplicate rows invalid while retaining duplicate evidence", () => {
    const parsed = parseCsvText(
      "Company,Email\n,dupe@example.com\n,DUPE@example.com\n"
    );
    const mapping = suggestCsvColumnMapping(parsed.headers);

    const result = validateLeadImportRows({
      rows: parsed.rows,
      mapping: mapping.mapping
    });

    expect(result.summary).toEqual({
      totalRows: 2,
      validRows: 0,
      invalidRows: 2,
      duplicateRows: 0
    });
    expect(result.rows.map((row) => row.status)).toEqual([
      "invalid",
      "invalid"
    ]);
    expect(result.rows[0].duplicateKey).toBe("email:dupe@example.com");
    expect(result.rows[0].duplicates).toEqual([
      {
        scope: "import",
        duplicateKey: "email:dupe@example.com",
        rowNumbers: [2, 3]
      }
    ]);
  });
});
