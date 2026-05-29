import { describe, expect, it, vi } from "vitest";

import { parseCsvText, suggestCsvColumnMapping } from "../csv";
import {
  buildLeadImportCommitPayload,
  commitValidatedLeadImportRows,
  type LeadImportCommitClient
} from "../commit";
import {
  validateLeadImportRows,
  type ExistingLeadDuplicateCandidate,
  type LeadImportValidationResult
} from "../validation";

function validateCsvRows(
  csv: string,
  existingLeads: ExistingLeadDuplicateCandidate[] = []
): LeadImportValidationResult {
  const parsed = parseCsvText(csv);
  expect(parsed.errors).toEqual([]);

  const mapping = suggestCsvColumnMapping(parsed.headers);
  expect(mapping.isReadyForValidation).toBe(true);

  return validateLeadImportRows({
    rows: parsed.rows,
    mapping: mapping.mapping,
    existingLeads
  });
}

function createCommitClient(error: Error | null = null) {
  const insert = vi.fn().mockResolvedValue({ data: null, error });
  const from = vi.fn(() => ({ insert }));

  return {
    client: { from } as unknown as LeadImportCommitClient,
    from,
    insert
  };
}

describe("lead import commit payloads", () => {
  it("maps only valid validated rows into lead inserts and skips invalid or duplicate rows", () => {
    const validation = validateCsvRows(
      [
        "Company,Website,Email,Phone,City,State,Country,Industry",
        "  Acme   Services  ,example.com/path, SALES@Example.COM , +1 (555) 123-4567 , Porto , North , pt , SaaS",
        ",missing.example,sales@missing.example,5555555,Porto,North,PT,SaaS",
        "Dupe Primary,dupe.com,dupe1@example.com,5550001111,Porto,North,PT,SaaS",
        "Dupe Secondary,https://www.dupe.com/about,dupe2@example.com,5550002222,Lisbon,South,PT,SaaS"
      ].join("\n")
    );

    const payload = buildLeadImportCommitPayload({
      rows: validation.rows,
      tenantId: "tenant-1",
      sourceId: "source-1",
      importBatchId: "batch-1",
      createdBy: "user-1"
    });

    expect(validation.summary).toEqual({
      totalRows: 4,
      validRows: 1,
      invalidRows: 1,
      duplicateRows: 2
    });
    expect(payload.summary).toEqual({
      totalRows: 4,
      committedRows: 1,
      skippedInvalidRows: 1,
      skippedDuplicateRows: 2
    });
    expect(payload.leadRows).toEqual([
      {
        rowNumber: 2,
        lead: {
          tenant_id: "tenant-1",
          source_id: "source-1",
          import_batch_id: "batch-1",
          company_name: "Acme Services",
          domain: "example.com",
          website_url: "https://example.com/path",
          industry: "SaaS",
          city: "Porto",
          state_region: "North",
          country: "PT",
          phone: "+15551234567",
          email: "sales@example.com",
          created_by: "user-1"
        }
      }
    ]);
    expect(
      payload.skippedRows.map((row) => ({
        rowNumber: row.rowNumber,
        status: row.status
      }))
    ).toEqual([
      { rowNumber: 3, status: "invalid" },
      { rowNumber: 4, status: "duplicate" },
      { rowNumber: 5, status: "duplicate" }
    ]);
  });

  it("keeps invalid lower-precedence duplicate evidence out of lead inserts", () => {
    const validation = validateCsvRows(
      [
        "Company,Domain,Email",
        "Acme,not a host,dupe@example.com",
        "Other,also not host,DUPE@example.com",
        "Winner,example.com,winner@example.com"
      ].join("\n")
    );

    const payload = buildLeadImportCommitPayload({
      rows: validation.rows,
      tenantId: "tenant-1"
    });

    expect(validation.rows.slice(0, 2).map((row) => row.status)).toEqual([
      "invalid",
      "invalid"
    ]);
    expect(payload.summary).toEqual({
      totalRows: 3,
      committedRows: 1,
      skippedInvalidRows: 2,
      skippedDuplicateRows: 0
    });
    expect(payload.leadRows.map((row) => row.rowNumber)).toEqual([4]);
    expect(payload.skippedRows[0]).toMatchObject({
      rowNumber: 2,
      status: "invalid",
      duplicateKey: "email:dupe@example.com",
      duplicates: [
        {
          scope: "import",
          duplicateKey: "email:dupe@example.com",
          rowNumbers: [2, 3]
        }
      ]
    });
  });
});

describe("commitValidatedLeadImportRows", () => {
  it("persists only valid lead inserts through the supplied Supabase client", async () => {
    const validation = validateCsvRows(
      [
        "Company,Website",
        "Acme,example.com",
        ",missing.example",
        "Dupe One,dupe.com",
        "Dupe Two,https://dupe.com/about"
      ].join("\n")
    );
    const input = {
      rows: validation.rows,
      tenantId: "tenant-1",
      sourceId: "source-1",
      importBatchId: "batch-1",
      createdBy: "user-1"
    };
    const expectedPayload = buildLeadImportCommitPayload(input);
    const { client, from, insert } = createCommitClient();

    await expect(commitValidatedLeadImportRows(client, input)).resolves.toEqual(
      expectedPayload
    );

    expect(from).toHaveBeenCalledWith("leads");
    expect(insert).toHaveBeenCalledWith(
      expectedPayload.leadRows.map((row) => row.lead)
    );
  });

  it("does not persist when every validated row is invalid or duplicate", async () => {
    const validation = validateCsvRows(
      ["Company,Website", ",missing.example", "Existing,example.com"].join(
        "\n"
      ),
      [{ id: "lead-1", company_name: "Existing", domain: "example.com" }]
    );
    const { client, from, insert } = createCommitClient();

    const payload = await commitValidatedLeadImportRows(client, {
      rows: validation.rows,
      tenantId: "tenant-1"
    });

    expect(payload.summary).toEqual({
      totalRows: 2,
      committedRows: 0,
      skippedInvalidRows: 1,
      skippedDuplicateRows: 1
    });
    expect(from).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });
});
