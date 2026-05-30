import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  displayNullableLeadField,
  type LeadRecord
} from "@/lib/leads/contract";
import { cn } from "@/lib/utils";

import { LeadStatusBadge, formatLeadStatus } from "./lead-status-badge";

export const LEAD_DETAIL_FALLBACK = "Not provided";
export const LEAD_DETAIL_UNNAMED_COMPANY = "Unnamed lead";

export type LeadDetailField = {
  id: string;
  label: string;
  value: string;
  href?: string;
};

export type LeadDetailSection = {
  id: string;
  title: string;
  fields: LeadDetailField[];
};

export type LeadDetailProps = {
  lead: LeadRecord;
  className?: string;
};

function displayLeadField(value: string | null | undefined) {
  return displayNullableLeadField(value, LEAD_DETAIL_FALLBACK);
}

export function getLeadDisplayName(lead: LeadRecord) {
  return displayNullableLeadField(
    lead.companyName,
    LEAD_DETAIL_UNNAMED_COMPANY
  );
}

function formatLeadTimestamp(value: string) {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return displayLeadField(value);
  }

  const isoTimestamp = parsedDate.toISOString();

  return `${isoTimestamp.slice(0, 10)} ${isoTimestamp.slice(11, 16)} UTC`;
}

function createOptionalLink(value: string, href: string | null | undefined) {
  return value === LEAD_DETAIL_FALLBACK || !href ? undefined : href;
}

export const getLeadStatusLabel = formatLeadStatus;

export function getLeadDetailSections(lead: LeadRecord): LeadDetailSection[] {
  const domain = displayLeadField(lead.domain);
  const websiteUrl = displayLeadField(lead.websiteUrl);
  const email = displayLeadField(lead.email);
  const phone = displayLeadField(lead.phone);

  return [
    {
      id: "company",
      title: "Company",
      fields: [
        {
          id: "company-name",
          label: "Company",
          value: getLeadDisplayName(lead)
        },
        {
          id: "industry",
          label: "Industry",
          value: displayLeadField(lead.industry)
        },
        {
          id: "domain",
          label: "Domain",
          value: domain,
          href: createOptionalLink(domain, lead.websiteUrl)
        },
        {
          id: "website-url",
          label: "Website",
          value: websiteUrl,
          href: createOptionalLink(websiteUrl, lead.websiteUrl)
        }
      ]
    },
    {
      id: "contact",
      title: "Contact",
      fields: [
        {
          id: "email",
          label: "Email",
          value: email,
          href: createOptionalLink(email, `mailto:${email}`)
        },
        {
          id: "phone",
          label: "Phone",
          value: phone,
          href: createOptionalLink(phone, `tel:${phone}`)
        }
      ]
    },
    {
      id: "location",
      title: "Location",
      fields: [
        {
          id: "city",
          label: "City",
          value: displayLeadField(lead.city)
        },
        {
          id: "state-region",
          label: "State / region",
          value: displayLeadField(lead.stateRegion)
        },
        {
          id: "country",
          label: "Country",
          value: displayLeadField(lead.country)
        }
      ]
    },
    {
      id: "provenance",
      title: "Provenance",
      fields: [
        {
          id: "source-id",
          label: "Source",
          value: displayLeadField(lead.sourceId)
        },
        {
          id: "import-batch-id",
          label: "Import batch",
          value: displayLeadField(lead.importBatchId)
        },
        {
          id: "created-by",
          label: "Created by",
          value: displayLeadField(lead.createdBy)
        },
        {
          id: "created-at",
          label: "Created",
          value: formatLeadTimestamp(lead.createdAt)
        },
        {
          id: "updated-at",
          label: "Last updated",
          value: formatLeadTimestamp(lead.updatedAt)
        }
      ]
    }
  ];
}

function LeadDetailValue({ field }: { field: LeadDetailField }) {
  if (!field.href) {
    return <dd className="mt-1 text-sm text-foreground">{field.value}</dd>;
  }

  return (
    <dd className="mt-1 text-sm">
      <a
        className="text-primary underline-offset-4 hover:underline"
        href={field.href}
      >
        {field.value}
      </a>
    </dd>
  );
}

export function LeadDetail({ lead, className }: LeadDetailProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="border-b">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <CardTitle className="leading-7">
              {getLeadDisplayName(lead)}
            </CardTitle>
            <CardDescription className="mt-2">
              Lead ID {lead.id}
            </CardDescription>
          </div>
          <LeadStatusBadge status={lead.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        {getLeadDetailSections(lead).map((section) => (
          <section key={section.id} aria-labelledby={`lead-${section.id}`}>
            <h3
              id={`lead-${section.id}`}
              className="text-sm font-semibold uppercase tracking-normal text-muted-foreground"
            >
              {section.title}
            </h3>
            <dl className="mt-3 grid gap-4 sm:grid-cols-2">
              {section.fields.map((field) => (
                <div key={field.id} className="min-w-0 rounded-md border p-3">
                  <dt className="text-xs font-medium text-muted-foreground">
                    {field.label}
                  </dt>
                  <LeadDetailValue field={field} />
                </div>
              ))}
            </dl>
          </section>
        ))}
      </CardContent>
    </Card>
  );
}
