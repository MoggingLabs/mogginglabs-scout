"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  MANUAL_LEAD_FORM_FIELDS,
  MANUAL_LEAD_STATUS_OPTIONS,
  type ManualLeadFormFieldId,
  type ManualLeadFormState
} from "@/lib/leads/manual";
import type { LeadStatus } from "@/lib/leads/contract";
import { cn } from "@/lib/utils";

export type ManualLeadFormAction = (
  state: ManualLeadFormState,
  formData: FormData
) => Promise<ManualLeadFormState>;

type ManualLeadFormProps = {
  action: ManualLeadFormAction;
  initialState: ManualLeadFormState;
  submitLabel: string;
};

const LEAD_STATUS_LABELS = {
  new: "New",
  qualified: "Qualified",
  disqualified: "Disqualified",
  archived: "Archived"
} satisfies Record<LeadStatus, string>;

export function ManualLeadForm({
  action,
  initialState,
  submitLabel
}: ManualLeadFormProps) {
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-6">
      {state.message ? (
        <div
          className={cn(
            "rounded-md border px-4 py-3 text-sm",
            state.kind === "error"
              ? "border-destructive/60 bg-destructive/10 text-destructive"
              : "border-primary/40 bg-primary/10 text-foreground"
          )}
          role={state.kind === "error" ? "alert" : "status"}
        >
          {state.message}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {MANUAL_LEAD_FORM_FIELDS.map((field) => {
          const error = state.errors[field.id];

          return (
            <div key={field.id} className="space-y-2">
              <Label htmlFor={field.id}>
                {field.label}
                {field.required ? (
                  <span className="ml-1 text-destructive">*</span>
                ) : null}
              </Label>
              <Input
                id={field.id}
                name={field.id}
                type={field.type}
                autoComplete={field.autoComplete}
                defaultValue={state.values[field.id]}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? `${field.id}-error` : undefined}
              />
              <FieldError id={field.id} error={error} />
            </div>
          );
        })}

        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            name="status"
            defaultValue={state.values.status}
            aria-invalid={Boolean(state.errors.status)}
            aria-describedby={state.errors.status ? "status-error" : undefined}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {MANUAL_LEAD_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {LEAD_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
          <FieldError id="status" error={state.errors.status} />
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-end">
        <SubmitButton label={submitLabel} />
      </div>
    </form>
  );
}

function FieldError({
  id,
  error
}: {
  id: ManualLeadFormFieldId;
  error?: string;
}) {
  if (!error) {
    return null;
  }

  return (
    <p id={`${id}-error`} className="text-xs leading-5 text-destructive">
      {error}
    </p>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving..." : label}
    </Button>
  );
}
