import { Badge } from "@/components/ui/badge";
import { LeadTableSkeleton } from "@/components/leads/lead-table";

export default function LeadsLoading() {
  return (
    <div className="flex flex-1 flex-col gap-8">
      <header className="flex flex-col gap-3 border-b pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Lead Data Core
          </p>
          <h1 className="mt-2 text-3xl font-semibold">Leads</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            Loading tenant-owned lead records.
          </p>
        </div>
        <Badge variant="secondary">Read-only</Badge>
      </header>

      <div className="rounded-lg border bg-card p-4">
        <div className="grid gap-4 sm:grid-cols-[minmax(14rem,1fr)_12rem_auto]">
          <div className="h-10 rounded bg-muted" />
          <div className="h-10 rounded bg-muted" />
          <div className="h-10 rounded bg-muted" />
        </div>
      </div>

      <LeadTableSkeleton />
    </div>
  );
}
