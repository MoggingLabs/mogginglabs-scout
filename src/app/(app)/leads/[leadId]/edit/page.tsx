import { notFound } from "next/navigation";

import { ManualLeadForm } from "@/components/leads/manual-lead-form";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { getAppContext } from "@/lib/account/context";
import {
  createManualLeadFormState,
  isValidLeadId,
  mapLeadRowToManualLeadFormValues
} from "@/lib/leads/manual";
import { createClient } from "@/lib/supabase/server";

import { updateManualLeadAction } from "../../actions";

type EditLeadPageProps = {
  params: Promise<{
    leadId: string;
  }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function EditLeadPage({
  params,
  searchParams
}: EditLeadPageProps) {
  const { leadId } = await params;

  if (!isValidLeadId(leadId)) {
    notFound();
  }

  const context = await getAppContext();
  if (context.kind !== "ready") {
    return <LeadEditUnavailable />;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("id", leadId)
    .eq("tenant_id", context.tenant.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    notFound();
  }

  const message = getSaveMessage(await searchParams);
  const action = updateManualLeadAction.bind(null, leadId);

  return (
    <div className="flex flex-1 flex-col gap-8">
      <header className="flex flex-col gap-3 border-b pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Lead Data Core
          </p>
          <h1 className="mt-2 text-3xl font-semibold">Edit lead</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            {data.company_name}
          </p>
        </div>
        <Badge variant="secondary">Manual entry</Badge>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Lead details</CardTitle>
          <CardDescription>Keep the company profile current.</CardDescription>
        </CardHeader>
        <CardContent>
          <ManualLeadForm
            action={action}
            initialState={createManualLeadFormState({
              kind: message ? "success" : "idle",
              message,
              values: mapLeadRowToManualLeadFormValues(data)
            })}
            submitLabel="Save lead"
          />
        </CardContent>
      </Card>
    </div>
  );
}

function LeadEditUnavailable() {
  return (
    <div className="flex flex-1 flex-col gap-8">
      <header className="border-b pb-6">
        <p className="text-sm font-medium text-muted-foreground">
          Lead Data Core
        </p>
        <h1 className="mt-2 text-3xl font-semibold">Edit lead</h1>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Lead details unavailable</CardTitle>
          <CardDescription>
            Authenticated tenant context is required before a lead can be
            loaded.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

function getSaveMessage(
  searchParams: Record<string, string | string[] | undefined> | undefined
): string | null {
  if (getSearchParam(searchParams, "created") === "1") {
    return "Lead created.";
  }

  if (getSearchParam(searchParams, "saved") === "1") {
    return "Lead saved.";
  }

  return null;
}

function getSearchParam(
  searchParams: Record<string, string | string[] | undefined> | undefined,
  key: string
): string | undefined {
  const value = searchParams?.[key];
  return Array.isArray(value) ? value[0] : value;
}
