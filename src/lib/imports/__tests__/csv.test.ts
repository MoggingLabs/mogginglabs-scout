import { describe, expect, it } from "vitest";

import {
  getNormalizedLeadImportAliasCollisions,
  LEAD_IMPORT_FIELDS,
  normalizeHeader,
  parseCsvText,
  suggestCsvColumnMapping,
  summarizeCsvColumnMapping
} from "../csv";

describe("CSV parser", () => {
  it("parses headers and normalized row values", () => {
    const result = parseCsvText(
      "Company,Website,City\nAcme,https://acme.test,Porto\n"
    );

    expect(result.errors).toEqual([]);
    expect(result.headers).toEqual(["Company", "Website", "City"]);
    expect(result.rowCount).toBe(1);
    expect(result.rows[0]).toMatchObject({
      rowNumber: 2,
      values: {
        Company: "Acme",
        Website: "https://acme.test",
        City: "Porto"
      },
      valuesByHeader: {
        Company: ["Acme"],
        Website: ["https://acme.test"],
        City: ["Porto"]
      },
      extraValues: []
    });
  });

  it("supports quoted commas, escaped quotes, and quoted line breaks", () => {
    const result = parseCsvText(
      'Company,Notes\n"Acme, Ltd","Says ""hello""\nfrom Porto"\n'
    );

    expect(result.errors).toEqual([]);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].values.Company).toBe("Acme, Ltd");
    expect(result.rows[0].values.Notes).toBe('Says "hello"\nfrom Porto');
  });

  it("normalizes CRLF and lone CR inside quoted fields", () => {
    const result = parseCsvText(
      'Company,Notes\nAcme,"first\r\nsecond\rthird"\n'
    );

    expect(result.errors).toEqual([]);
    expect(result.rows[0].values.Notes).toBe("first\nsecond\nthird");
  });

  it("ignores blank trailing rows without dropping partial rows", () => {
    const result = parseCsvText("Company,Email,Phone\nAcme,,123\n\n");

    expect(result.errors).toEqual([]);
    expect(result.rowCount).toBe(1);
    expect(result.rows[0].values).toMatchObject({
      Company: "Acme",
      Email: "",
      Phone: "123"
    });
  });

  it("keeps header-only input as an empty valid preview", () => {
    const result = parseCsvText("Company,Website\n");

    expect(result.errors).toEqual([]);
    expect(result.headers).toEqual(["Company", "Website"]);
    expect(result.rows).toEqual([]);
    expect(result.rowCount).toBe(0);
  });

  it("returns a typed error for empty input", () => {
    const result = parseCsvText("\n  \n");

    expect(result.headers).toEqual([]);
    expect(result.rows).toEqual([]);
    expect(result.errors).toContainEqual({
      code: "empty-input",
      message: "CSV input must include a header row."
    });
  });

  it("returns typed errors for malformed quotes", () => {
    expect(parseCsvText('Company\n"Acme').errors).toContainEqual(
      expect.objectContaining({ code: "unterminated-quote" })
    );
    expect(parseCsvText('Company\nAc"me').errors).toContainEqual(
      expect.objectContaining({ code: "unexpected-quote" })
    );
    expect(parseCsvText('Company\n"Acme"x').errors).toContainEqual(
      expect.objectContaining({
        code: "unexpected-content-after-quote",
        rowNumber: 2,
        columnNumber: 7
      })
    );

    expect(
      parseCsvText('Company\n"Acme"xyz').errors.filter(
        (error) => error.code === "unexpected-content-after-quote"
      )
    ).toHaveLength(1);
  });

  it("supports CRLF and lone CR line endings", () => {
    const crlf = parseCsvText("Company,City\r\nAcme,Porto\r\n");
    const loneCr = parseCsvText("Company,City\rAcme,Porto\r");

    for (const result of [crlf, loneCr]) {
      expect(result.errors).toEqual([]);
      expect(result.headers).toEqual(["Company", "City"]);
      expect(result.rowCount).toBe(1);
      expect(result.rows[0].values.Company).toBe("Acme");
      expect(result.rows[0].values.City).toBe("Porto");
    }
  });

  it("skips leading blank rows before selecting the header row", () => {
    const result = parseCsvText("\n\nCompany,City\nAcme,Porto\n");

    expect(result.errors).toEqual([]);
    expect(result.headers).toEqual(["Company", "City"]);
    expect(result.rowCount).toBe(1);
  });

  it("surfaces missing, duplicate, short, and over-long header shape errors", () => {
    expect(parseCsvText(",,\nAcme,Porto\n").errors).toContainEqual({
      code: "missing-header",
      message: "CSV input must include at least one named header."
    });

    const duplicate = parseCsvText("Company,Company\nAcme,Duplicate\n");
    expect(duplicate.errors).toContainEqual({
      code: "duplicate-header",
      message: 'CSV header "Company" appears more than once.',
      rowNumber: 1
    });
    expect(duplicate.rows[0].valuesByHeader.Company).toEqual([
      "Acme",
      "Duplicate"
    ]);
    expect(duplicate.rows[0].cells).toEqual([
      { header: "Company", value: "Acme", columnNumber: 1 },
      { header: "Company", value: "Duplicate", columnNumber: 2 }
    ]);

    const extra = parseCsvText("Company\nAcme,Extra\n");
    expect(extra.errors).toContainEqual({
      code: "extra-column",
      message: "CSV row 2 has more columns than the header row.",
      rowNumber: 2,
      columnNumber: 2
    });
    expect(extra.rows[0].extraValues).toEqual(["Extra"]);

    const short = parseCsvText("Company,Email\nAcme\n");
    expect(short.errors).toContainEqual({
      code: "short-row",
      message: "CSV row 2 has fewer columns than the header row.",
      rowNumber: 2,
      columnNumber: 2
    });
    expect(short.rows[0].values.Email).toBe("");
    expect(short.rows[0].cells).toContainEqual({
      header: "Email",
      value: "",
      columnNumber: 2
    });
  });

  it("keeps row numbers consistent after leading blank rows", () => {
    const result = parseCsvText('\n\nCompany\nAc"me\n');

    expect(result.rows[0].rowNumber).toBe(4);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: "unexpected-quote", rowNumber: 4 })
    );
  });
});

describe("CSV column mapping", () => {
  it("defines company name as the only required field for this slice", () => {
    expect(
      LEAD_IMPORT_FIELDS.filter((field) => field.required).map(
        (field) => field.id
      )
    ).toEqual(["company_name"]);
  });

  it("keeps normalized import aliases collision-free across fields", () => {
    expect(getNormalizedLeadImportAliasCollisions()).toEqual([]);
    expect(
      getNormalizedLeadImportAliasCollisions([
        {
          id: "company_name",
          label: "Company name",
          required: true,
          description: "Synthetic company field.",
          aliases: [{ value: "shared", specificity: 80 }]
        },
        {
          id: "domain",
          label: "Domain",
          required: false,
          description: "Synthetic domain field.",
          aliases: [{ value: "shared", specificity: 80 }]
        }
      ])
    ).toEqual([
      { normalizedAlias: "shared", fieldIds: ["company_name", "domain"] }
    ]);
  });

  it("normalizes common header punctuation and spacing", () => {
    expect(normalizeHeader(" Website_URL ")).toBe("website url");
    expect(normalizeHeader("Contact E-mail")).toBe("contact email");
  });

  it("suggests canonical lead field mappings from common headers", () => {
    const summary = suggestCsvColumnMapping([
      "Business Name",
      "Website",
      "Category",
      "Town",
      "Contact Email",
      "Unneeded Notes"
    ]);

    expect(summary.mapping).toEqual({
      company_name: "Business Name",
      website_url: "Website",
      industry: "Category",
      city: "Town",
      email: "Contact Email"
    });
    expect(summary.ignoredHeaders).toEqual(["Unneeded Notes"]);
    expect(summary.missingRequiredFields).toEqual([]);
    expect(summary.ambiguousRequiredFields).toEqual([]);
    expect(summary.ambiguousMappings).toEqual([]);
    expect(summary.isReadyForValidation).toBe(true);
  });

  it("prefers specific company headers over generic name headers", () => {
    const summary = suggestCsvColumnMapping(["Name", "Company"]);

    expect(summary.mapping.company_name).toBe("Company");
    expect(summary.ignoredHeaders).toEqual(["Name"]);
    expect(summary.isReadyForValidation).toBe(true);
  });

  it("surfaces ambiguous auto-mappings for confirmation", () => {
    const summary = suggestCsvColumnMapping(["Company", "Business"]);

    expect(summary.mapping.company_name).toBe("Company");
    expect(summary.ambiguousMappings).toEqual([
      { fieldId: "company_name", headers: ["Company", "Business"] }
    ]);
    expect(summary.ignoredHeaders).toEqual([]);
    expect(summary.missingRequiredFields).toEqual([]);
    expect(summary.ambiguousRequiredFields).toEqual(["company_name"]);
    expect(summary.isReadyForValidation).toBe(false);
  });

  it("surfaces optional-field ambiguity before validation can continue", () => {
    const summary = suggestCsvColumnMapping(["Site", "Web", "Company"]);

    expect(summary.mapping.website_url).toBe("Site");
    expect(summary.ambiguousMappings).toContainEqual({
      fieldId: "website_url",
      headers: ["Site", "Web"]
    });
    expect(summary.missingRequiredFields).toEqual([]);
    expect(summary.ambiguousRequiredFields).toEqual([]);
    expect(summary.isReadyForValidation).toBe(false);
  });

  it("surfaces missing required fields before validation can continue", () => {
    const summary = suggestCsvColumnMapping(["Website", "City"]);

    expect(summary.mapping).toEqual({
      website_url: "Website",
      city: "City"
    });
    expect(summary.missingRequiredFields).toEqual(["company_name"]);
    expect(summary.ambiguousRequiredFields).toEqual([]);
    expect(summary.isReadyForValidation).toBe(false);
  });

  it("summarizes manually supplied mappings and ignored headers", () => {
    const summary = summarizeCsvColumnMapping(["Name", "URL", "Notes"], {
      company_name: "Name",
      domain: "URL"
    });

    expect(summary.ignoredHeaders).toEqual(["Notes"]);
    expect(summary.missingRequiredFields).toEqual([]);
    expect(summary.isReadyForValidation).toBe(true);
  });

  it("treats mappings to unknown headers as unmapped", () => {
    const summary = summarizeCsvColumnMapping(["Name", "URL"], {
      company_name: "Missing",
      domain: "URL"
    });

    expect(summary.ignoredHeaders).toEqual(["Name"]);
    expect(summary.missingRequiredFields).toEqual(["company_name"]);
    expect(summary.ambiguousRequiredFields).toEqual([]);
    expect(summary.isReadyForValidation).toBe(false);
  });
});
