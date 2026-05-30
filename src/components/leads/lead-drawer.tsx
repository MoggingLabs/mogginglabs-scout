"use client";

import { useEffect, useId, useRef } from "react";

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

const DRAWER_FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])"
].join(",");

function getFocusableElements(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLElement>(DRAWER_FOCUSABLE_SELECTOR)
  ).filter((element) => !element.hasAttribute("disabled"));
}

export function LeadDrawer({
  lead,
  open,
  onClose,
  className
}: LeadDrawerProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLElement | null>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) {
      previouslyFocusedElementRef.current?.focus();
      previouslyFocusedElementRef.current = null;
      return;
    }

    previouslyFocusedElementRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    dialogRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose?.();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const dialog = dialogRef.current;
      if (!dialog) {
        return;
      }

      const focusableElements = getFocusableElements(dialog);
      if (focusableElements.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const firstFocusableElement = focusableElements[0];
      const lastFocusableElement =
        focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (activeElement === dialog) {
        event.preventDefault();
        (event.shiftKey ? lastFocusableElement : firstFocusableElement).focus();
        return;
      }

      if (event.shiftKey && activeElement === firstFocusableElement) {
        event.preventDefault();
        lastFocusableElement.focus();
        return;
      }

      if (!event.shiftKey && activeElement === lastFocusableElement) {
        event.preventDefault();
        firstFocusableElement.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      previouslyFocusedElementRef.current?.focus();
      previouslyFocusedElementRef.current = null;
    };
  }, [onClose, open]);

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
          aria-hidden="true"
          className="absolute inset-0 h-full w-full cursor-default"
          onClick={onClose}
          tabIndex={-1}
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
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
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
