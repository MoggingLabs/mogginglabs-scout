import {
  coerceNullableLeadField,
  DEFAULT_LEAD_COUNTRY,
  DEFAULT_LEAD_STATUS,
  isLeadStatus,
  LEAD_CRM_FIELD_IDS,
  LEAD_STATUSES,
  mapLeadRowToFieldValues,
  type LeadCrmFieldId,
  type LeadInsert,
  type LeadRow,
  type LeadStatus,
  type LeadUpdate
} from "@/lib/leads/contract";

export const MANUAL_LEAD_STATUS_FIELD_ID = "status";

export type ManualLeadFormFieldId =
  | LeadCrmFieldId
  | typeof MANUAL_LEAD_STATUS_FIELD_ID;

export type ManualLeadFormInput = Record<LeadCrmFieldId, string> & {
  status: string;
};

export type ManualLeadFormValues = Record<LeadCrmFieldId, string> & {
  status: LeadStatus;
};

export type ManualLeadFieldErrors = Partial<
  Record<ManualLeadFormFieldId | "form", string>
>;

export type ManualLeadValidationResult = {
  values: ManualLeadFormValues;
  errors: ManualLeadFieldErrors;
  isValid: boolean;
};

export type ManualLeadFormState = {
  kind: "idle" | "error" | "success";
  message: string | null;
  values: ManualLeadFormValues;
  errors: ManualLeadFieldErrors;
};

export type ManualLeadPersistenceContext = {
  tenantId: string;
  createdBy?: string | null;
};

export type ManualLeadFormField = {
  id: LeadCrmFieldId;
  label: string;
  required: boolean;
  type: "text" | "url" | "email" | "tel";
  autoComplete?: string;
};

const MANUAL_LEAD_FIELD_DEFINITIONS = {
  company_name: {
    label: "Company name",
    required: true,
    type: "text",
    autoComplete: "organization"
  },
  domain: {
    label: "Domain",
    required: false,
    type: "text"
  },
  website_url: {
    label: "Website URL",
    required: false,
    type: "url",
    autoComplete: "url"
  },
  industry: {
    label: "Industry",
    required: false,
    type: "text"
  },
  city: {
    label: "City",
    required: false,
    type: "text",
    autoComplete: "address-level2"
  },
  state_region: {
    label: "State / region",
    required: false,
    type: "text",
    autoComplete: "address-level1"
  },
  country: {
    label: "Country",
    required: false,
    type: "text",
    autoComplete: "country"
  },
  phone: {
    label: "Phone",
    required: false,
    type: "tel",
    autoComplete: "tel"
  },
  email: {
    label: "Email",
    required: false,
    type: "email",
    autoComplete: "email"
  }
} satisfies Record<LeadCrmFieldId, Omit<ManualLeadFormField, "id">>;

export const MANUAL_LEAD_FORM_FIELDS: ManualLeadFormField[] =
  LEAD_CRM_FIELD_IDS.map((id) => ({
    id,
    ...MANUAL_LEAD_FIELD_DEFINITIONS[id]
  }));

export const MANUAL_LEAD_STATUS_OPTIONS = LEAD_STATUSES;

const FIELD_ERROR_MESSAGES = {
  company_name: "Company name is required.",
  domain: "Domain must be a valid host name.",
  website_url: "Website URL must be http(s) or a bare host name.",
  email: "Email must be a valid address.",
  phone: "Phone must contain at least seven digits.",
  status: "Choose a valid lead status."
} satisfies Partial<Record<ManualLeadFormFieldId, string>>;

export function getDefaultManualLeadFormValues(): ManualLeadFormValues {
  return {
    company_name: "",
    domain: "",
    website_url: "",
    industry: "",
    city: "",
    state_region: "",
    country: DEFAULT_LEAD_COUNTRY,
    phone: "",
    email: "",
    status: DEFAULT_LEAD_STATUS
  };
}

export function createManualLeadFormState({
  kind = "idle",
  message = null,
  values = getDefaultManualLeadFormValues(),
  errors = {}
}: Partial<ManualLeadFormState> = {}): ManualLeadFormState {
  return {
    kind,
    message,
    values,
    errors
  };
}

export function parseManualLeadFormData(
  formData: FormData
): ManualLeadFormInput {
  return {
    company_name: readFormString(formData, "company_name"),
    domain: readFormString(formData, "domain"),
    website_url: readFormString(formData, "website_url"),
    industry: readFormString(formData, "industry"),
    city: readFormString(formData, "city"),
    state_region: readFormString(formData, "state_region"),
    country: readFormString(formData, "country"),
    phone: readFormString(formData, "phone"),
    email: readFormString(formData, "email"),
    status: readFormString(formData, MANUAL_LEAD_STATUS_FIELD_ID)
  };
}

export function validateManualLeadFormData(
  formData: FormData
): ManualLeadValidationResult {
  return validateManualLeadFormInput(parseManualLeadFormData(formData));
}

export function validateManualLeadFormInput(
  input: ManualLeadFormInput
): ManualLeadValidationResult {
  const values = getDefaultManualLeadFormValues();
  const errors: ManualLeadFieldErrors = {};

  values.company_name = collapseWhitespace(input.company_name);
  values.industry = collapseWhitespace(input.industry);
  values.city = collapseWhitespace(input.city);
  values.state_region = collapseWhitespace(input.state_region);
  values.country =
    collapseWhitespace(input.country).toUpperCase() || DEFAULT_LEAD_COUNTRY;

  if (!values.company_name) {
    errors.company_name = FIELD_ERROR_MESSAGES.company_name;
  }

  const domain = normalizeDomainInput(input.domain);
  values.domain = domain.value;
  if (!domain.isValid) {
    errors.domain = FIELD_ERROR_MESSAGES.domain;
  }

  const websiteUrl = normalizeWebsiteUrlInput(input.website_url);
  values.website_url = websiteUrl.value;
  if (!websiteUrl.isValid) {
    errors.website_url = FIELD_ERROR_MESSAGES.website_url;
  }

  if (!values.domain && websiteUrl.isValid && values.website_url) {
    values.domain = normalizeDomain(values.website_url) ?? "";
  }

  const email = normalizeEmailInput(input.email);
  values.email = email.value;
  if (!email.isValid) {
    errors.email = FIELD_ERROR_MESSAGES.email;
  }

  const phone = normalizePhoneInput(input.phone);
  values.phone = phone.value;
  if (!phone.isValid) {
    errors.phone = FIELD_ERROR_MESSAGES.phone;
  }

  values.status = isLeadStatus(input.status)
    ? input.status
    : DEFAULT_LEAD_STATUS;
  if (!isLeadStatus(input.status)) {
    errors.status = FIELD_ERROR_MESSAGES.status;
  }

  return {
    values,
    errors,
    isValid: Object.keys(errors).length === 0
  };
}

export function mapLeadRowToManualLeadFormValues(
  row: LeadRow
): ManualLeadFormValues {
  const fields = mapLeadRowToFieldValues(row);

  return {
    company_name: fields.company_name,
    domain: fields.domain ?? "",
    website_url: fields.website_url ?? "",
    industry: fields.industry ?? "",
    city: fields.city ?? "",
    state_region: fields.state_region ?? "",
    country: fields.country,
    phone: fields.phone ?? "",
    email: fields.email ?? "",
    status: row.status
  };
}

export function mapManualLeadValuesToLeadInsert(
  values: ManualLeadFormValues,
  context: ManualLeadPersistenceContext
): LeadInsert {
  return {
    tenant_id: context.tenantId,
    company_name: values.company_name,
    domain: coerceNullableLeadField(values.domain),
    website_url: coerceNullableLeadField(values.website_url),
    industry: coerceNullableLeadField(values.industry),
    city: coerceNullableLeadField(values.city),
    state_region: coerceNullableLeadField(values.state_region),
    country: values.country || DEFAULT_LEAD_COUNTRY,
    phone: coerceNullableLeadField(values.phone),
    email: coerceNullableLeadField(values.email),
    status: values.status,
    created_by: context.createdBy ?? null
  };
}

export function mapManualLeadValuesToLeadUpdate(
  values: ManualLeadFormValues
): LeadUpdate {
  return {
    company_name: values.company_name,
    domain: coerceNullableLeadField(values.domain),
    website_url: coerceNullableLeadField(values.website_url),
    industry: coerceNullableLeadField(values.industry),
    city: coerceNullableLeadField(values.city),
    state_region: coerceNullableLeadField(values.state_region),
    country: values.country || DEFAULT_LEAD_COUNTRY,
    phone: coerceNullableLeadField(values.phone),
    email: coerceNullableLeadField(values.email),
    status: values.status
  };
}

export function isValidLeadId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function readFormString(formData: FormData, fieldId: ManualLeadFormFieldId) {
  const value = formData.get(fieldId);
  return typeof value === "string" ? value : "";
}

function normalizeDomainInput(value: string): {
  value: string;
  isValid: boolean;
} {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return { value: "", isValid: true };
  }

  const domain = normalizeDomain(trimmedValue);
  return domain
    ? { value: domain, isValid: true }
    : { value: trimmedValue.toLowerCase(), isValid: false };
}

function normalizeWebsiteUrlInput(value: string): {
  value: string;
  isValid: boolean;
} {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return { value: "", isValid: true };
  }

  const websiteUrl = normalizeWebsiteUrl(trimmedValue);
  return websiteUrl
    ? { value: websiteUrl, isValid: true }
    : { value: trimmedValue, isValid: false };
}

function normalizeEmailInput(value: string): {
  value: string;
  isValid: boolean;
} {
  const email = value.trim().toLowerCase();
  if (!email) {
    return { value: "", isValid: true };
  }

  return isValidEmail(email)
    ? { value: email, isValid: true }
    : { value: email, isValid: false };
}

function normalizePhoneInput(value: string): {
  value: string;
  isValid: boolean;
} {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return { value: "", isValid: true };
  }

  const phone = normalizePhone(trimmedValue);
  return isValidPhone(phone)
    ? { value: phone, isValid: true }
    : { value: phone, isValid: false };
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
  const startsWithPlus = value.startsWith("+");
  const digits = value.replace(/\D/g, "");
  return startsWithPlus ? `+${digits}` : digits;
}

function isValidPhone(phone: string): boolean {
  return phone.replace(/\D/g, "").length >= 7;
}

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}
