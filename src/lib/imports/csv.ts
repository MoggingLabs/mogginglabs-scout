export type CsvParseErrorCode =
  | "empty-input"
  | "missing-header"
  | "duplicate-header"
  | "extra-column"
  | "short-row"
  | "unterminated-quote"
  | "unexpected-quote"
  | "unexpected-content-after-quote";

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

export type CsvParsedCell = {
  header: string;
  value: string;
  columnNumber: number;
};

export type CsvParsedRow = {
  rowNumber: number;
  values: Record<string, string>;
  valuesByHeader: Record<string, string[]>;
  cells: CsvParsedCell[];
  extraValues: string[];
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

export type LeadImportFieldAlias = {
  value: string;
  specificity: number;
};

export type LeadImportField = {
  id: LeadImportFieldId;
  label: string;
  required: boolean;
  description: string;
  aliases: LeadImportFieldAlias[];
};

export type CsvColumnMapping = Partial<Record<LeadImportFieldId, string>>;

export type CsvColumnMappingAmbiguity = {
  fieldId: LeadImportFieldId;
  headers: string[];
};

export type CsvColumnMappingSummary = {
  mapping: CsvColumnMapping;
  ignoredHeaders: string[];
  missingRequiredFields: LeadImportFieldId[];
  ambiguousRequiredFields: LeadImportFieldId[];
  ambiguousMappings: CsvColumnMappingAmbiguity[];
  isReadyForValidation: boolean;
};

export type NormalizedLeadImportAliasCollision = {
  normalizedAlias: string;
  fieldIds: LeadImportFieldId[];
};

export const LEAD_IMPORT_FIELDS: LeadImportField[] = [
  {
    id: "company_name",
    label: "Company name",
    required: true,
    description: "The business or organization name for the lead.",
    aliases: [
      alias("company name", 95),
      alias("company", 80),
      alias("business name", 95),
      alias("business", 80),
      alias("organization", 80),
      alias("name", 10)
    ]
  },
  {
    id: "domain",
    label: "Domain",
    required: false,
    description:
      "The canonical domain, without protocol, for duplicate detection.",
    aliases: [
      alias("domain", 90),
      alias("website domain", 80),
      alias("site domain", 80)
    ]
  },
  {
    id: "website_url",
    label: "Website URL",
    required: false,
    description: "The full website URL when available.",
    aliases: [
      alias("website url", 95),
      alias("website", 90),
      alias("url", 70),
      alias("site", 60),
      alias("web", 60),
      alias("homepage", 60)
    ]
  },
  {
    id: "industry",
    label: "Industry",
    required: false,
    description: "Industry, category, niche, or vertical label.",
    aliases: [
      alias("industry", 90),
      alias("category", 80),
      alias("vertical", 80),
      alias("niche", 80),
      alias("business type", 80)
    ]
  },
  {
    id: "city",
    label: "City",
    required: false,
    description: "Primary operating city.",
    aliases: [alias("city", 90), alias("town", 80), alias("locality", 70)]
  },
  {
    id: "state_region",
    label: "State / region",
    required: false,
    description: "State, region, district, county, or province.",
    aliases: [
      alias("state region", 95),
      alias("state", 80),
      alias("region", 80),
      alias("province", 70),
      alias("county", 70),
      alias("district", 70)
    ]
  },
  {
    id: "country",
    label: "Country",
    required: false,
    description: "Country code or country name.",
    aliases: [alias("country", 90), alias("nation", 70)]
  },
  {
    id: "phone",
    label: "Phone",
    required: false,
    description: "Primary phone number.",
    aliases: [
      alias("phone", 90),
      alias("phone number", 95),
      alias("telephone", 80),
      alias("mobile", 80),
      alias("contact phone", 95)
    ]
  },
  {
    id: "email",
    label: "Email",
    required: false,
    description: "Primary email address.",
    aliases: [
      alias("email", 90),
      alias("email address", 95),
      alias("contact email", 95),
      alias("e-mail", 90)
    ]
  }
];

const REQUIRED_IMPORT_FIELD_IDS = LEAD_IMPORT_FIELDS.filter(
  (field) => field.required
).map((field) => field.id);

type NormalizedAliasEntry = {
  normalizedAlias: string;
  fieldId: LeadImportFieldId;
  score: number;
};

const NORMALIZED_ALIAS_ENTRIES: NormalizedAliasEntry[] =
  createNormalizedAliasEntries(LEAD_IMPORT_FIELDS);

const ALIAS_ENTRIES_BY_NORMALIZED_HEADER = NORMALIZED_ALIAS_ENTRIES.reduce<
  Map<string, NormalizedAliasEntry[]>
>((entriesByHeader, entry) => {
  const entries = entriesByHeader.get(entry.normalizedAlias) ?? [];
  entries.push(entry);
  entriesByHeader.set(entry.normalizedAlias, entries);
  return entriesByHeader;
}, new Map());

function alias(value: string, specificity: number): LeadImportFieldAlias {
  return { value, specificity };
}

function createNormalizedAliasEntries(
  fields: LeadImportField[]
): NormalizedAliasEntry[] {
  return fields.flatMap((field) =>
    [alias(field.label, 100), alias(field.id, 100), ...field.aliases].map(
      (fieldAlias) => ({
        normalizedAlias: normalizeHeader(fieldAlias.value),
        fieldId: field.id,
        score: fieldAlias.specificity
      })
    )
  );
}

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
  let justClosedQuote = false;
  let rowNumber = 1;
  let recordRowNumber = 1;
  let columnNumber = 1;
  let index = 0;

  function finishRecord(consumedCharacters: number): void {
    record.push(field);
    records.push({ fields: record, rowNumber: recordRowNumber });
    field = "";
    record = [];
    rowNumber += 1;
    recordRowNumber = rowNumber;
    columnNumber = 1;
    index += consumedCharacters;
    justClosedQuote = false;
  }

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
        justClosedQuote = true;
        index += 1;
        columnNumber += 1;
        continue;
      }

      if (char === "\r") {
        field += "\n";
        rowNumber += 1;
        columnNumber = 1;
        index += nextChar === "\n" ? 2 : 1;
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
      justClosedQuote = false;
      index += 1;
      columnNumber += 1;
      continue;
    }

    if (char === ",") {
      record.push(field);
      field = "";
      justClosedQuote = false;
      index += 1;
      columnNumber += 1;
      continue;
    }

    if (char === "\n") {
      finishRecord(1);
      continue;
    }

    if (char === "\r") {
      finishRecord(nextChar === "\n" ? 2 : 1);
      continue;
    }

    if (justClosedQuote) {
      errors.push({
        code: "unexpected-content-after-quote",
        message: "Unexpected content after a closing CSV quote.",
        rowNumber: recordRowNumber,
        columnNumber
      });
    }

    field += char;
    justClosedQuote = false;
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

  const headerRecord = meaningfulRecords[0];
  const headers = headerRecord.fields.map((header) => header.trim());
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

  const duplicateHeaders = findDuplicateHeaders(headers);
  for (const header of duplicateHeaders) {
    errors.push({
      code: "duplicate-header",
      message: `CSV header "${header}" appears more than once.`,
      rowNumber: headerRecord.rowNumber
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

    if (sourceRecord.fields.length < headers.length) {
      errors.push({
        code: "short-row",
        message: `CSV row ${sourceRecord.rowNumber} has fewer columns than the header row.`,
        rowNumber: sourceRecord.rowNumber,
        columnNumber: sourceRecord.fields.length + 1
      });
    }

    return buildParsedRow(sourceRecord, headers);
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
  const candidatesByField = new Map<
    LeadImportFieldId,
    NormalizedAliasEntry[]
  >();

  for (const header of headers) {
    const entries = ALIAS_ENTRIES_BY_NORMALIZED_HEADER.get(
      normalizeHeader(header)
    );
    if (!entries) {
      continue;
    }

    for (const entry of entries) {
      const candidates = candidatesByField.get(entry.fieldId) ?? [];
      candidates.push(entry);
      candidatesByField.set(entry.fieldId, candidates);
    }
  }

  const mapping: CsvColumnMapping = {};
  const ambiguousMappings: CsvColumnMappingAmbiguity[] = [];

  for (const [fieldId, candidates] of candidatesByField) {
    const bestScore = Math.max(
      ...candidates.map((candidate) => candidate.score)
    );
    const bestHeaders = headers.filter((header) =>
      candidates.some(
        (candidate) =>
          candidate.score === bestScore &&
          candidate.normalizedAlias === normalizeHeader(header)
      )
    );

    if (bestHeaders.length > 1) {
      ambiguousMappings.push({ fieldId, headers: bestHeaders });
    }

    mapping[fieldId] = bestHeaders[0];
  }

  return summarizeCsvColumnMapping(headers, mapping, ambiguousMappings);
}

export function summarizeCsvColumnMapping(
  headers: string[],
  mapping: CsvColumnMapping,
  ambiguousMappings: CsvColumnMappingAmbiguity[] = []
): CsvColumnMappingSummary {
  const headerSet = new Set(headers);
  const mappedHeaders = new Set<string>();

  for (const header of Object.values(mapping)) {
    if (header && headerSet.has(header)) {
      mappedHeaders.add(header);
    }
  }

  const ambiguousFieldIds = new Set(
    ambiguousMappings.map((ambiguity) => ambiguity.fieldId)
  );
  const ambiguousRequiredFields = REQUIRED_IMPORT_FIELD_IDS.filter((fieldId) =>
    ambiguousFieldIds.has(fieldId)
  );
  const missingRequiredFields = REQUIRED_IMPORT_FIELD_IDS.filter(
    (fieldId) => !mapping[fieldId] || !headerSet.has(mapping[fieldId])
  );

  const ambiguousHeaders = new Set(
    ambiguousMappings.flatMap((ambiguity) => ambiguity.headers)
  );

  return {
    mapping,
    ignoredHeaders: headers.filter(
      (header) => !mappedHeaders.has(header) && !ambiguousHeaders.has(header)
    ),
    missingRequiredFields,
    ambiguousRequiredFields,
    ambiguousMappings,
    isReadyForValidation:
      missingRequiredFields.length === 0 &&
      ambiguousRequiredFields.length === 0 &&
      ambiguousMappings.length === 0
  };
}

export function getNormalizedLeadImportAliasCollisions(
  fields: LeadImportField[] = LEAD_IMPORT_FIELDS
): NormalizedLeadImportAliasCollision[] {
  const entries = createNormalizedAliasEntries(fields).map((entry) => ({
    normalizedAlias: entry.normalizedAlias,
    fieldId: entry.fieldId
  }));

  const fieldIdsByAlias = entries.reduce<Map<string, Set<LeadImportFieldId>>>(
    (aliases, entry) => {
      const fieldIds =
        aliases.get(entry.normalizedAlias) ?? new Set<LeadImportFieldId>();
      fieldIds.add(entry.fieldId);
      aliases.set(entry.normalizedAlias, fieldIds);
      return aliases;
    },
    new Map()
  );

  return [...fieldIdsByAlias.entries()]
    .filter(([, fieldIds]) => fieldIds.size > 1)
    .map(([normalizedAlias, fieldIds]) => ({
      normalizedAlias,
      fieldIds: [...fieldIds]
    }));
}

function buildParsedRow(
  sourceRecord: CsvRecord,
  headers: string[]
): CsvParsedRow {
  const values = Object.create(null) as Record<string, string>;
  const valuesByHeader = Object.create(null) as Record<string, string[]>;
  const cells: CsvParsedCell[] = [];

  for (const [headerIndex, header] of headers.entries()) {
    const value = sourceRecord.fields[headerIndex]?.trim() ?? "";
    values[header] = value;
    const valuesForHeader = valuesByHeader[header] ?? [];
    valuesForHeader.push(value);
    valuesByHeader[header] = valuesForHeader;
    cells.push({ header, value, columnNumber: headerIndex + 1 });
  }

  return {
    rowNumber: sourceRecord.rowNumber,
    values,
    valuesByHeader,
    cells,
    extraValues: sourceRecord.fields
      .slice(headers.length)
      .map((value) => value.trim())
  };
}

function trimBlankBoundaryRecords(records: CsvRecord[]): CsvRecord[] {
  let start = 0;
  let end = records.length;

  // Leading comma-shaped blank rows should be treated as headers so they can
  // surface `missing-header`; only truly blank leading lines are skipped.
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
