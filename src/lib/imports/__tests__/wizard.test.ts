import { describe, expect, it } from "vitest";

import {
  CSV_IMPORT_ACCEPT,
  CSV_IMPORT_MAX_FILE_SIZE_MB,
  CSV_IMPORT_WIZARD_STEPS,
  getCsvImportWizardStep
} from "../wizard";

describe("CSV import wizard metadata", () => {
  it("defines the ordered upload, mapping, validate, commit, and review steps", () => {
    expect(CSV_IMPORT_WIZARD_STEPS.map((step) => step.id)).toEqual([
      "upload",
      "map-columns",
      "validate",
      "commit",
      "review"
    ]);
  });

  it("documents safe CSV-only upload constraints", () => {
    expect(CSV_IMPORT_ACCEPT).toBe(".csv,text/csv");
    expect(CSV_IMPORT_MAX_FILE_SIZE_MB).toBe(10);
  });

  it("returns a known step by id", () => {
    expect(getCsvImportWizardStep("map-columns")?.title).toBe("Map columns");
    expect(getCsvImportWizardStep("missing")).toBeNull();
  });
});
