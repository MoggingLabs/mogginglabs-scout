import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LEAD_STATUSES } from "@/lib/leads/contract";
import {
  LEAD_FILTER_QUERY_KEYS,
  hasActiveLeadFilters,
  type LeadFilters
} from "@/lib/leads/filters";

import { formatLeadStatus } from "./lead-status-badge";

export function LeadFiltersForm({ filters }: { filters: LeadFilters }) {
  const hasFilters = hasActiveLeadFilters(filters);

  return (
    <form
      action="/leads"
      className="grid gap-4 rounded-lg border bg-card p-4 sm:grid-cols-[minmax(14rem,1fr)_12rem_auto] sm:items-end"
    >
      <div className="space-y-2">
        <Label htmlFor="lead-search">Search leads</Label>
        <Input
          id="lead-search"
          name={LEAD_FILTER_QUERY_KEYS.search}
          defaultValue={filters.search}
          placeholder="Company, domain, city, email"
          type="search"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="lead-status">Status</Label>
        <select
          id="lead-status"
          name={LEAD_FILTER_QUERY_KEYS.status}
          defaultValue={filters.status}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <option value="all">All statuses</option>
          {LEAD_STATUSES.map((status) => (
            <option key={status} value={status}>
              {formatLeadStatus(status)}
            </option>
          ))}
        </select>
      </div>

      {filters.sourceId ? (
        <input
          name={LEAD_FILTER_QUERY_KEYS.sourceId}
          type="hidden"
          value={filters.sourceId}
        />
      ) : null}
      {filters.importBatchId ? (
        <input
          name={LEAD_FILTER_QUERY_KEYS.importBatchId}
          type="hidden"
          value={filters.importBatchId}
        />
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit">Apply filters</Button>
        {hasFilters ? (
          <Link
            href="/leads"
            className={buttonVariants({ variant: "outline" })}
          >
            Clear
          </Link>
        ) : null}
      </div>

      {filters.sourceId || filters.importBatchId ? (
        <p className="text-xs text-muted-foreground sm:col-span-3">
          Provenance filter active
          {filters.sourceId ? ` for source ${filters.sourceId}` : ""}
          {filters.importBatchId
            ? ` for import batch ${filters.importBatchId}`
            : ""}
          .
        </p>
      ) : null}
    </form>
  );
}
