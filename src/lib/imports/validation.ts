import type { CsvColumnMapping, CsvParsedRow, LeadImportFieldId } from "./csv";

export type LeadImportValidationErrorCode =
  | "missing-required-field"
  | "invalid-domain"
  | "invalid-website-url"
  | "invalid-email"
  | "invalid-phone";

export type LeadImportValidationError = {
  code: LeadImportValidationErrorCode;
  fieldId: LeadImportFieldId;
  message: string;
};

export type NormalizedLeadImportRow = Partial<
  Record<LeadImportFieldId, string>
> & {
  company_name?: string;
  domain?: string;
  website_url?: string;
  industry?: string;
  city?: string;
  state_region?: string;
  country?: string;
  phone?: string;
  email?: string;
};

export type LeadImportRowStatus = "valid" | "invalid" | "duplicate";

export type LeadImportDuplicateScope = "import" | "existing";

export type LeadImportDuplicateEvidence =
  | {
      scope: "import";
      duplicateKey: string;
      rowNumbers: number[];
    }
  | {
      scope: "existing";
      duplicateKey: string;
      leadIds: string[];
    };

export type ExistingLeadDuplicateCandidate = {
  id: string;
  company_name?: string | null;
  domain?: string | null;
  website_url?: string | null;
  industry?: string | null;
  city?: string | null;
  state_region?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
};

export type LeadImportValidatedRow = {
  rowNumber: number;
  status: LeadImportRowStatus;
  rawData: Record<string, string>;
  normalizedData: NormalizedLeadImportRow;
  errors: LeadImportValidationError[];
  duplicateKey: string | null;
  duplicates: LeadImportDuplicateEvidence[];
};

export type LeadImportValidationSummary = {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
};

export type LeadImportValidationResult = {
  rows: LeadImportValidatedRow[];
  summary: LeadImportValidationSummary;
};

export type ValidateLeadImportRowsInput = {
  rows: CsvParsedRow[];
  mapping: CsvColumnMapping;
  existingLeads?: ExistingLeadDuplicateCandidate[];
};

const EXISTING_LEAD_DEDUP_FIELD_IDS = [
  "company_name",
  "domain",
  "website_url",
  "city",
  "country",
  "phone",
  "email"
] as const satisfies readonly (keyof ExistingLeadDuplicateCandidate &
  LeadImportFieldId)[];

export type NormalizedLeadImportValueResult = {
  value: string;
  errors: LeadImportValidationError[];
};

const REQUIRED_VALIDATION_FIELD_IDS: LeadImportFieldId[] = ["company_name"];

const FIELD_ERROR_MESSAGES = {
  "missing-required-field": "Required field is missing.",
  "invalid-domain": "Domain must be a valid host name.",
  "invalid-website-url": "Website URL must be http(s) or a bare host name.",
  "invalid-email": "Email must be a valid address.",
  "invalid-phone": "Phone must contain at least seven digits."
} satisfies Record<LeadImportValidationErrorCode, string>;

export function normalizeLeadImportValue(
  fieldId: LeadImportFieldId,
  value: string
): NormalizedLeadImportValueResult {
  const trimmedValue = value.trim();
  if (trimmedValue.length === 0) {
    return { value: "", errors: [] };
  }

  switch (fieldId) {
    case "company_name":
    case "industry":
    case "city":
    case "state_region":
      return { value: collapseWhitespace(trimmedValue), errors: [] };
    case "country":
      return { value: trimmedValue.toUpperCase(), errors: [] };
    case "domain": {
      const domain = normalizeDomain(trimmedValue);
      return domain
        ? { value: domain, errors: [] }
        : {
            value: trimmedValue.toLowerCase(),
            errors: [fieldError("invalid-domain", fieldId)]
          };
    }
    case "website_url": {
      const websiteUrl = normalizeWebsiteUrl(trimmedValue);
      return websiteUrl
        ? { value: websiteUrl, errors: [] }
        : {
            value: trimmedValue,
            errors: [fieldError("invalid-website-url", fieldId)]
          };
    }
    case "email": {
      const email = trimmedValue.toLowerCase();
      return isValidEmail(email)
        ? { value: email, errors: [] }
        : { value: email, errors: [fieldError("invalid-email", fieldId)] };
    }
    case "phone": {
      const phone = normalizePhone(trimmedValue);
      return isValidPhone(phone)
        ? { value: phone, errors: [] }
        : { value: phone, errors: [fieldError("invalid-phone", fieldId)] };
    }
  }
}

export function buildLeadImportDuplicateKey(
  row: NormalizedLeadImportRow
): string | null {
  if (row.domain) {
    return `domain:${row.domain.toLowerCase()}`;
  }

  if (row.email) {
    return `email:${row.email.toLowerCase()}`;
  }

  if (row.phone) {
    return `phone:${row.phone}`;
  }

  if (row.company_name) {
    return `company:${[
      normalizeDuplicateSegment(row.company_name),
      normalizeDuplicateSegment(row.city),
      normalizeDuplicateSegment(row.country)
    ].join("|")}`;
  }

  return null;
}

export function validateLeadImportRows({
  rows,
  mapping,
  existingLeads = []
}: ValidateLeadImportRowsInput): LeadImportValidationResult {
  const validatedRows = rows.map((row) => validateLeadImportRow(row, mapping));
  const existingLeadIdsByDuplicateKey =
    buildExistingLeadDuplicateIndex(existingLeads);
  const rowNumbersByDuplicateKey = buildImportDuplicateIndex(validatedRows);

  for (const row of validatedRows) {
    if (!row.duplicateKey) {
      continue;
    }

    const importRowNumbers =
      rowNumbersByDuplicateKey.get(row.duplicateKey) ?? [];
    if (importRowNumbers.length > 1) {
      row.duplicates.push({
        scope: "import",
        duplicateKey: row.duplicateKey,
        rowNumbers: importRowNumbers
      });
    }

    const existingLeadIds =
      existingLeadIdsByDuplicateKey.get(row.duplicateKey) ?? [];
    if (existingLeadIds.length > 0) {
      row.duplicates.push({
        scope: "existing",
        duplicateKey: row.duplicateKey,
        leadIds: existingLeadIds
      });
    }

    if (row.errors.length === 0 && row.duplicates.length > 0) {
      row.status = "duplicate";
    }
  }

  return {
    rows: validatedRows,
    summary: summarizeValidatedRows(validatedRows)
  };
}

function validateLeadImportRow(
  row: CsvParsedRow,
  mapping: CsvColumnMapping
): LeadImportValidatedRow {
  const normalizedData: NormalizedLeadImportRow = {};
  const errors: LeadImportValidationError[] = [];

  for (const [fieldId, header] of Object.entries(mapping) as [
    LeadImportFieldId,
    string | undefined
  ][]) {
    if (!header) {
      continue;
    }

    const sourceValue = row.values[header] ?? "";
    const normalizedValue = normalizeLeadImportValue(fieldId, sourceValue);
    if (
      normalizedValue.value.length > 0 &&
      normalizedValue.errors.length === 0
    ) {
      normalizedData[fieldId] = normalizedValue.value;
    }
    errors.push(...normalizedValue.errors);
  }

  if (!normalizedData.domain && normalizedData.website_url) {
    const derivedDomain = normalizeDomain(normalizedData.website_url);
    if (derivedDomain) {
      normalizedData.domain = derivedDomain;
    }
  }

  if (!normalizedData.country) {
    normalizedData.country = "US";
  }

  for (const fieldId of REQUIRED_VALIDATION_FIELD_IDS) {
    if (!normalizedData[fieldId]?.trim()) {
      errors.unshift(fieldError("missing-required-field", fieldId));
    }
  }

  return {
    rowNumber: row.rowNumber,
    status: errors.length > 0 ? "invalid" : "valid",
    rawData: row.values,
    normalizedData,
    errors,
    duplicateKey: buildLeadImportDuplicateKey(normalizedData),
    duplicates: []
  };
}

function buildExistingLeadDuplicateIndex(
  existingLeads: ExistingLeadDuplicateCandidate[]
): Map<string, string[]> {
  const leadIdsByDuplicateKey = new Map<string, string[]>();

  for (const lead of existingLeads) {
    const normalizedLead = normalizeExistingLead(lead);
    const duplicateKey = buildLeadImportDuplicateKey(normalizedLead);
    if (!duplicateKey) {
      continue;
    }

    const leadIds = leadIdsByDuplicateKey.get(duplicateKey) ?? [];
    leadIds.push(lead.id);
    leadIdsByDuplicateKey.set(duplicateKey, leadIds);
  }

  return leadIdsByDuplicateKey;
}

function normalizeExistingLead(
  lead: ExistingLeadDuplicateCandidate
): NormalizedLeadImportRow {
  const normalizedLead: NormalizedLeadImportRow = {};

  for (const fieldId of EXISTING_LEAD_DEDUP_FIELD_IDS) {
    const value = lead[fieldId];
    if (typeof value !== "string" || value.trim().length === 0) {
      continue;
    }

    const normalizedValue = normalizeLeadImportValue(fieldId, value);
    if (
      normalizedValue.value.length > 0 &&
      normalizedValue.errors.length === 0
    ) {
      normalizedLead[fieldId] = normalizedValue.value;
    }
  }

  if (!normalizedLead.domain && normalizedLead.website_url) {
    const derivedDomain = normalizeDomain(normalizedLead.website_url);
    if (derivedDomain) {
      normalizedLead.domain = derivedDomain;
    }
  }

  return normalizedLead;
}

function buildImportDuplicateIndex(
  rows: LeadImportValidatedRow[]
): Map<string, number[]> {
  const rowNumbersByDuplicateKey = new Map<string, number[]>();

  for (const row of rows) {
    if (!row.duplicateKey) {
      continue;
    }

    const rowNumbers = rowNumbersByDuplicateKey.get(row.duplicateKey) ?? [];
    rowNumbers.push(row.rowNumber);
    rowNumbersByDuplicateKey.set(row.duplicateKey, rowNumbers);
  }

  return rowNumbersByDuplicateKey;
}

function summarizeValidatedRows(
  rows: LeadImportValidatedRow[]
): LeadImportValidationSummary {
  return {
    totalRows: rows.length,
    validRows: rows.filter((row) => row.status === "valid").length,
    invalidRows: rows.filter((row) => row.status === "invalid").length,
    duplicateRows: rows.filter((row) => row.status === "duplicate").length
  };
}

function fieldError(
  code: LeadImportValidationErrorCode,
  fieldId: LeadImportFieldId
): LeadImportValidationError {
  return {
    code,
    fieldId,
    message: FIELD_ERROR_MESSAGES[code]
  };
}

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeWebsiteUrl(value: string): string | null {
  if (/^[a-z][a-z0-9+.-]*:/i.test(value) && !/^https?:\/\//i.test(value)) {
    return null;
  }

  const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`;

  try {
    const url = new URL(candidate);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      !isValidHost(url.hostname)
    ) {
      return null;
    }

    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

function normalizeDomain(value: string): string | null {
  const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`;

  try {
    const url = new URL(candidate);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    return isValidHost(host) ? host : null;
  } catch {
    return null;
  }
}

function isValidHost(host: string): boolean {
  return /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i.test(
    host
  );
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizePhone(value: string): string {
  const startsWithPlus = value.trim().startsWith("+");
  const digits = value.replace(/\D/g, "");
  return startsWithPlus ? `+${digits}` : digits;
}

function isValidPhone(phone: string): boolean {
  return phone.replace(/\D/g, "").length >= 7;
}

function normalizeDuplicateSegment(value?: string): string {
  return collapseWhitespace(value ?? "").toLowerCase();
}
