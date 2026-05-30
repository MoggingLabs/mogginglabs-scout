"use client";

import { useId } from "react";

import { LeadDetail, getLeadDisplayName } from "@/components/leads/lead-detail";
import { Button } from "@/components/ui/button";
import { type LeadRecord } from "@/lib/leads/contract";
import { cn } from "@/lib/utils";

export type LeadDrawerProps = {
  lead: LeadRecord | null;
  open: boolean;
  onClose?: () => void;
  className?: string;
};

export function LeadDrawer({
  lead,
  open,
  onClose,
  className
}: LeadDrawerProps) {
  const titleId = useId();

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-background/80 backdrop-blur-sm"
      role="presentation"
    >
      {onClose ? (
        <button
          aria-label="Close lead details overlay"
          className="absolute inset-0 h-full w-full cursor-default"
          onClick={onClose}
          type="button"
        />
      ) : null}
      <aside
        aria-labelledby={titleId}
        aria-modal="true"
        className={cn(
          "relative z-10 flex h-full w-full max-w-xl flex-col border-l bg-background shadow-xl",
          className
        )}
        role="dialog"
      >
        <header className="flex items-start justify-between gap-4 border-b p-6">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Lead details
            </p>
            <h2 id={titleId} className="mt-1 text-xl font-semibold">
              {lead ? getLeadDisplayName(lead) : "No lead selected"}
            </h2>
          </div>
          {onClose ? (
            <Button
              aria-label="Close lead details"
              onClick={onClose}
              size="sm"
              variant="ghost"
            >
              Close
            </Button>
          ) : null}
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {lead ? (
            <LeadDetail lead={lead} />
          ) : (
            <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
              Select a lead to review its CRM details.
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
