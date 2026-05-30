import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { ManualLeadForm } from "@/components/leads/manual-lead-form";
import { createManualLeadFormState } from "@/lib/leads/manual";

import { createManualLeadAction } from "../actions";

export default function NewLeadPage() {
  return (
    <div className="flex flex-1 flex-col gap-8">
      <header className="flex flex-col gap-3 border-b pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Lead Data Core
          </p>
          <h1 className="mt-2 text-3xl font-semibold">Create lead</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            Add company, location, and contact details for the active tenant.
          </p>
        </div>
        <Badge variant="secondary">Manual entry</Badge>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Lead details</CardTitle>
          <CardDescription>
            Core business fields for a manually entered lead.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ManualLeadForm
            action={createManualLeadAction}
            initialState={createManualLeadFormState()}
            submitLabel="Create lead"
          />
        </CardContent>
      </Card>
    </div>
  );
}
