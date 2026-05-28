export const CSV_IMPORT_ACCEPT = ".csv,text/csv";
export const CSV_IMPORT_MAX_FILE_SIZE_MB = 10;

export type CsvImportWizardStepId =
  | "upload"
  | "map-columns"
  | "validate"
  | "commit"
  | "review";

export type CsvImportWizardStep = {
  id: CsvImportWizardStepId;
  title: string;
  description: string;
};

export const CSV_IMPORT_WIZARD_STEPS: CsvImportWizardStep[] = [
  {
    id: "upload",
    title: "Upload CSV",
    description: "Choose a tenant-owned CSV file and keep it staged for review."
  },
  {
    id: "map-columns",
    title: "Map columns",
    description: "Map source columns to Scout lead fields before validation."
  },
  {
    id: "validate",
    title: "Validate rows",
    description: "Check required fields, formatting, and duplicate candidates."
  },
  {
    id: "commit",
    title: "Commit leads",
    description: "Turn valid rows into tenant-scoped lead records."
  },
  {
    id: "review",
    title: "Review results",
    description: "Summarize committed, invalid, and duplicate rows."
  }
];

export function getCsvImportWizardStep(id: string): CsvImportWizardStep | null {
  return CSV_IMPORT_WIZARD_STEPS.find((step) => step.id === id) ?? null;
}
