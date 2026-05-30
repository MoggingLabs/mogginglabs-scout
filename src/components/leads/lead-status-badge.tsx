import { Badge, type BadgeVariant } from "@/components/ui/badge";
import type { LeadStatus } from "@/lib/leads/contract";

const leadStatusLabels = {
  new: "New",
  qualified: "Qualified",
  disqualified: "Disqualified",
  archived: "Archived"
} as const satisfies Record<LeadStatus, string>;

const leadStatusVariants = {
  new: "secondary",
  qualified: "default",
  disqualified: "destructive",
  archived: "outline"
} as const satisfies Record<LeadStatus, BadgeVariant>;

export function formatLeadStatus(status: LeadStatus): string {
  return leadStatusLabels[status];
}

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  return (
    <Badge variant={leadStatusVariants[status]}>
      {formatLeadStatus(status)}
    </Badge>
  );
}
