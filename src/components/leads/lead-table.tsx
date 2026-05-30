import { Badge } from "@/components/ui/badge";
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
import { hasActiveLeadFilters, type LeadFilters } from "@/lib/leads/filters";

import { LeadStatusBadge } from "./lead-status-badge";

export function LeadTable({
  filters,
  leads
}: {
  filters: LeadFilters;
  leads: readonly LeadRecord[];
}) {
  return (
    <Card>
      <CardHeader className="gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>Lead list</CardTitle>
          <CardDescription>
            Read-only CRM records scoped to the active tenant.
          </CardDescription>
        </div>
        <Badge variant="secondary">
          {leads.length} {leads.length === 1 ? "lead" : "leads"}
        </Badge>
      </CardHeader>
      <CardContent>
        {leads.length > 0 ? (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[58rem] border-collapse text-left text-sm">
              <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Company</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Location</th>
                  <th className="px-4 py-3 font-medium">Contact</th>
                  <th className="px-4 py-3 font-medium">Source</th>
                  <th className="px-4 py-3 font-medium">Updated</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <LeadTableRow key={lead.id} lead={lead} />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <LeadEmptyState filters={filters} />
        )}
      </CardContent>
    </Card>
  );
}

export function LeadTableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Lead list</CardTitle>
        <CardDescription>Loading read-only lead records.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 rounded-md border p-4">
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              className="grid gap-3 sm:grid-cols-[minmax(12rem,1fr)_8rem_10rem_12rem]"
            >
              <div className="h-4 rounded bg-muted" />
              <div className="h-4 rounded bg-muted" />
              <div className="h-4 rounded bg-muted" />
              <div className="h-4 rounded bg-muted" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function LeadErrorState({ message }: { message: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Lead data unavailable</CardTitle>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive-foreground">
          No lead rows were read for this request.
        </div>
      </CardContent>
    </Card>
  );
}

function LeadTableRow({ lead }: { lead: LeadRecord }) {
  return (
    <tr className="border-t">
      <td className="px-4 py-4 align-top">
        <div className="font-medium">{lead.companyName}</div>
        <div className="mt-1 text-xs text-muted-foreground">
          {displayNullableLeadField(lead.domain, "No domain")}
        </div>
      </td>
      <td className="px-4 py-4 align-top">
        <LeadStatusBadge status={lead.status} />
      </td>
      <td className="px-4 py-4 align-top text-muted-foreground">
        {formatLeadLocation(lead)}
      </td>
      <td className="px-4 py-4 align-top">
        <div>{displayNullableLeadField(lead.email, "No email")}</div>
        <div className="mt-1 text-xs text-muted-foreground">
          {displayNullableLeadField(lead.phone, "No phone")}
        </div>
      </td>
      <td className="px-4 py-4 align-top text-muted-foreground">
        {formatLeadSource(lead)}
      </td>
      <td className="px-4 py-4 align-top text-muted-foreground">
        {formatDate(lead.updatedAt)}
      </td>
    </tr>
  );
}

function LeadEmptyState({ filters }: { filters: LeadFilters }) {
  const filtered = hasActiveLeadFilters(filters);

  return (
    <div className="rounded-md border border-dashed p-8 text-center">
      <p className="text-sm font-medium">
        {filtered ? "No leads match these filters." : "No leads yet."}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        {filtered
          ? "Adjust the search text or status to widen the read-only list."
          : "Imported and manually-entered lead records will appear here once they exist."}
      </p>
    </div>
  );
}

function formatLeadLocation(lead: LeadRecord): string {
  const parts = [
    lead.city,
    lead.stateRegion,
    displayNullableLeadField(lead.country)
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(", ") : "No location";
}

function formatLeadSource(lead: LeadRecord): string {
  if (lead.importBatchId) {
    return "Import";
  }

  if (lead.sourceId) {
    return "Source linked";
  }

  return "Manual";
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  }).format(date);
}
