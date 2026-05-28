export type CsvParseErrorCode =
  | "empty-input"
  | "missing-header"
  | "duplicate-header"
  | "extra-column"
  | "unterminated-quote"
  | "unexpected-quote";

export type CsvParseError = {
  code: CsvParseErrorCode;
  message: string;
  rowNumber?: number;
  columnNumber?: number;
};

export type CsvParseResult = {
  headers: string[];
  rows: CsvParsedRow[];
  rowCount: number;
  errors: CsvParseError[];
};

export type CsvParsedRow = {
  rowNumber: number;
  values: Record<string, string>;
};

export type LeadImportFieldId =
  | "company_name"
  | "domain"
  | "website_url"
  | "industry"
  | "city"
  | "state_region"
  | "country"
  | "phone"
  | "email";

export type LeadImportField = {
  id: LeadImportFieldId;
  label: string;
  required: boolean;
  description: string;
  aliases: string[];
};

export type CsvColumnMapping = Partial<Record<LeadImportFieldId, string>>;

export type CsvColumnMappingSummary = {
  mapping: CsvColumnMapping;
  ignoredHeaders: string[];
  missingRequiredFields: LeadImportFieldId[];
  isReadyForValidation: boolean;
};

export const LEAD_IMPORT_FIELDS: LeadImportField[] = [
  {
    id: "company_name",
    label: "Company name",
    required: true,
    description: "The business or organization name for the lead.",
    aliases: [
      "company",
      "company name",
      "business",
      "business name",
      "organization",
      "name"
    ]
  },
  {
    id: "domain",
    label: "Domain",
    required: false,
    description:
      "The canonical domain, without protocol, for duplicate detection.",
    aliases: ["domain", "website domain", "site domain"]
  },
  {
    id: "website_url",
    label: "Website URL",
    required: false,
    description: "The full website URL when available.",
    aliases: ["website", "website url", "url", "site", "web", "homepage"]
  },
  {
    id: "industry",
    label: "Industry",
    required: false,
    description: "Industry, category, niche, or vertical label.",
    aliases: ["industry", "category", "vertical", "niche", "business type"]
  },
  {
    id: "city",
    label: "City",
    required: false,
    description: "Primary operating city.",
    aliases: ["city", "town", "locality"]
  },
  {
    id: "state_region",
    label: "State / region",
    required: false,
    description: "State, region, district, county, or province.",
    aliases: [
      "state",
      "region",
      "state region",
      "province",
      "county",
      "district"
    ]
  },
  {
    id: "country",
    label: "Country",
    required: false,
    description: "Country code or country name.",
    aliases: ["country", "nation"]
  },
  {
    id: "phone",
    label: "Phone",
    required: false,
    description: "Primary phone number.",
    aliases: ["phone", "phone number", "telephone", "mobile", "contact phone"]
  },
  {
    id: "email",
    label: "Email",
    required: false,
    description: "Primary email address.",
    aliases: ["email", "email address", "contact email", "e-mail"]
  }
];

const REQUIRED_IMPORT_FIELD_IDS = LEAD_IMPORT_FIELDS.filter(
  (field) => field.required
).map((field) => field.id);

const FIELD_BY_NORMALIZED_ALIAS = new Map<string, LeadImportFieldId>(
  LEAD_IMPORT_FIELDS.flatMap((field) =>
    [field.label, field.id, ...field.aliases].map((alias) => [
      normalizeHeader(alias),
      field.id
    ])
  )
);

type CsvRecord = {
  fields: string[];
  rowNumber: number;
};

export function parseCsvText(input: string): CsvParseResult {
  const records: CsvRecord[] = [];
  const errors: CsvParseError[] = [];
  let field = "";
  let record: string[] = [];
  let inQuotes = false;
  let rowNumber = 1;
  let recordRowNumber = 1;
  let columnNumber = 1;
  let index = 0;

  while (index < input.length) {
    const char = input[index];
    const nextChar = input[index + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          field += '"';
          index += 2;
          columnNumber += 2;
          continue;
        }

        inQuotes = false;
        index += 1;
        columnNumber += 1;
        continue;
      }

      field += char;
      if (char === "\n") {
        rowNumber += 1;
        columnNumber = 1;
      } else {
        columnNumber += 1;
      }
      index += 1;
      continue;
    }

    if (char === '"') {
      if (field.length === 0) {
        inQuotes = true;
        index += 1;
        columnNumber += 1;
        continue;
      }

      errors.push({
        code: "unexpected-quote",
        message: "Unexpected quote inside an unquoted CSV field.",
        rowNumber: recordRowNumber,
        columnNumber
      });
      field += char;
      index += 1;
      columnNumber += 1;
      continue;
    }

    if (char === ",") {
      record.push(field);
      field = "";
      index += 1;
      columnNumber += 1;
      continue;
    }

    if (char === "\n") {
      record.push(field);
      records.push({ fields: record, rowNumber: recordRowNumber });
      field = "";
      record = [];
      rowNumber += 1;
      recordRowNumber = rowNumber;
      columnNumber = 1;
      index += 1;
      continue;
    }

    if (char === "\r") {
      if (nextChar === "\n") {
        record.push(field);
        records.push({ fields: record, rowNumber: recordRowNumber });
        field = "";
        record = [];
        rowNumber += 1;
        recordRowNumber = rowNumber;
        columnNumber = 1;
        index += 2;
        continue;
      }

      record.push(field);
      records.push({ fields: record, rowNumber: recordRowNumber });
      field = "";
      record = [];
      rowNumber += 1;
      recordRowNumber = rowNumber;
      columnNumber = 1;
      index += 1;
      continue;
    }

    field += char;
    index += 1;
    columnNumber += 1;
  }

  if (inQuotes) {
    errors.push({
      code: "unterminated-quote",
      message: "CSV input ended before a quoted field was closed.",
      rowNumber: recordRowNumber,
      columnNumber
    });
  }

  record.push(field);
  records.push({ fields: record, rowNumber: recordRowNumber });

  const meaningfulRecords = trimBlankBoundaryRecords(records);
  if (meaningfulRecords.length === 0) {
    return {
      headers: [],
      rows: [],
      rowCount: 0,
      errors: [
        ...errors,
        {
          code: "empty-input",
          message: "CSV input must include a header row."
        }
      ]
    };
  }

  const headers = meaningfulRecords[0].fields.map((header) => header.trim());
  if (headers.length === 0 || headers.every((header) => header.length === 0)) {
    return {
      headers: [],
      rows: [],
      rowCount: 0,
      errors: [
        ...errors,
        {
          code: "missing-header",
          message: "CSV input must include at least one named header."
        }
      ]
    };
  }

  const headerRowNumber = meaningfulRecords[0].rowNumber;
  const duplicateHeaders = findDuplicateHeaders(headers);
  for (const header of duplicateHeaders) {
    errors.push({
      code: "duplicate-header",
      message: `CSV header "${header}" appears more than once.`,
      rowNumber: headerRowNumber
    });
  }

  const rows = meaningfulRecords.slice(1).map((sourceRecord) => {
    if (sourceRecord.fields.length > headers.length) {
      errors.push({
        code: "extra-column",
        message: `CSV row ${sourceRecord.rowNumber} has more columns than the header row.`,
        rowNumber: sourceRecord.rowNumber,
        columnNumber: headers.length + 1
      });
    }

    return {
      rowNumber: sourceRecord.rowNumber,
      values: headers.reduce<Record<string, string>>(
        (values, header, headerIndex) => {
          values[header] = sourceRecord.fields[headerIndex]?.trim() ?? "";
          return values;
        },
        Object.create(null) as Record<string, string>
      )
    };
  });

  return {
    headers,
    rows,
    rowCount: rows.length,
    errors
  };
}

export function normalizeHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .replace(/\be mail\b/g, "email")
    .trim();
}

export function suggestCsvColumnMapping(
  headers: string[]
): CsvColumnMappingSummary {
  const mapping: CsvColumnMapping = {};

  for (const header of headers) {
    const fieldId = FIELD_BY_NORMALIZED_ALIAS.get(normalizeHeader(header));
    if (!fieldId || mapping[fieldId]) {
      continue;
    }

    mapping[fieldId] = header;
  }

  return summarizeCsvColumnMapping(headers, mapping);
}

export function summarizeCsvColumnMapping(
  headers: string[],
  mapping: CsvColumnMapping
): CsvColumnMappingSummary {
  const headerSet = new Set(headers);
  const mappedHeaders = new Set<string>();

  for (const header of Object.values(mapping)) {
    if (header && headerSet.has(header)) {
      mappedHeaders.add(header);
    }
  }

  const missingRequiredFields = REQUIRED_IMPORT_FIELD_IDS.filter(
    (fieldId) => !mapping[fieldId] || !headerSet.has(mapping[fieldId])
  );

  return {
    mapping,
    ignoredHeaders: headers.filter((header) => !mappedHeaders.has(header)),
    missingRequiredFields,
    isReadyForValidation: missingRequiredFields.length === 0
  };
}

function trimBlankBoundaryRecords(records: CsvRecord[]): CsvRecord[] {
  let start = 0;
  let end = records.length;

  while (start < end && isBlankLineRecord(records[start])) {
    start += 1;
  }

  while (end > start && isBlankRecord(records[end - 1])) {
    end -= 1;
  }

  return records.slice(start, end);
}

function findDuplicateHeaders(headers: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const header of headers) {
    if (seen.has(header)) {
      duplicates.add(header);
      continue;
    }

    seen.add(header);
  }

  return [...duplicates];
}

function isBlankLineRecord(record: CsvRecord): boolean {
  return record.fields.length === 1 && record.fields[0].trim().length === 0;
}

function isBlankRecord(record: CsvRecord): boolean {
  return record.fields.every((value) => value.trim().length === 0);
}
