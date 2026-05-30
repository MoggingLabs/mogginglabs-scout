"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAppContext } from "@/lib/account/context";
import { isSupabaseEnvMissingError } from "@/lib/env";
import {
  createManualLeadFormState,
  isValidLeadId,
  mapManualLeadValuesToLeadInsert,
  mapManualLeadValuesToLeadUpdate,
  validateManualLeadFormData,
  type ManualLeadFormState,
  type ManualLeadFormValues
} from "@/lib/leads/manual";
import { createClient } from "@/lib/supabase/server";

type ManualLeadActionContext =
  | {
      kind: "ready";
      tenantId: string;
      profileId: string;
      supabase: Awaited<ReturnType<typeof createClient>>;
    }
  | {
      kind: "unavailable";
      state: ManualLeadFormState;
    };

type SupabaseWriteError = {
  code?: string;
};

const INVALID_FORM_MESSAGE = "Fix the highlighted fields before saving.";
const UNAVAILABLE_MESSAGE =
  "Lead saving is unavailable until the authenticated app context is ready.";
const DUPLICATE_DOMAIN_MESSAGE =
  "A lead with this domain already exists for this tenant.";
const WRITE_BLOCKED_MESSAGE =
  "Lead saving is not permitted for the current tenant membership.";
const WRITE_FAILED_MESSAGE = "Lead saving failed. Try again.";

export async function createManualLeadAction(
  _state: ManualLeadFormState,
  formData: FormData
): Promise<ManualLeadFormState> {
  const validation = validateManualLeadFormData(formData);

  if (!validation.isValid) {
    return createManualLeadFormState({
      kind: "error",
      message: INVALID_FORM_MESSAGE,
      values: validation.values,
      errors: validation.errors
    });
  }

  const actionContext = await getManualLeadActionContext(validation.values);
  if (actionContext.kind === "unavailable") {
    return actionContext.state;
  }

  const payload = mapManualLeadValuesToLeadInsert(validation.values, {
    tenantId: actionContext.tenantId,
    createdBy: actionContext.profileId
  });

  const { data, error } = await actionContext.supabase
    .from("leads")
    .insert(payload)
    .select("id")
    .single();

  if (error) {
    return createManualLeadWriteErrorState(error, validation.values);
  }

  if (!data?.id) {
    return createManualLeadFormState({
      kind: "error",
      message: WRITE_FAILED_MESSAGE,
      values: validation.values,
      errors: { form: WRITE_FAILED_MESSAGE }
    });
  }

  revalidatePath(`/leads/${data.id}/edit`);
  redirect(`/leads/${data.id}/edit?created=1`);
}

export async function updateManualLeadAction(
  leadId: string,
  _state: ManualLeadFormState,
  formData: FormData
): Promise<ManualLeadFormState> {
  const validation = validateManualLeadFormData(formData);

  if (!validation.isValid) {
    return createManualLeadFormState({
      kind: "error",
      message: INVALID_FORM_MESSAGE,
      values: validation.values,
      errors: validation.errors
    });
  }

  if (!isValidLeadId(leadId)) {
    return createManualLeadFormState({
      kind: "error",
      message: "Lead could not be found.",
      values: validation.values,
      errors: { form: "Lead could not be found." }
    });
  }

  const actionContext = await getManualLeadActionContext(validation.values);
  if (actionContext.kind === "unavailable") {
    return actionContext.state;
  }

  const payload = mapManualLeadValuesToLeadUpdate(validation.values);

  const { data, error } = await actionContext.supabase
    .from("leads")
    .update(payload)
    .eq("id", leadId)
    .eq("tenant_id", actionContext.tenantId)
    .select("id")
    .maybeSingle();

  if (error) {
    return createManualLeadWriteErrorState(error, validation.values);
  }

  if (!data?.id) {
    return createManualLeadFormState({
      kind: "error",
      message: "Lead could not be found.",
      values: validation.values,
      errors: { form: "Lead could not be found." }
    });
  }

  revalidatePath(`/leads/${leadId}/edit`);
  redirect(`/leads/${leadId}/edit?saved=1`);
}

async function getManualLeadActionContext(
  values: ManualLeadFormValues
): Promise<ManualLeadActionContext> {
  const context = await getAppContext();

  if (context.kind !== "ready") {
    return {
      kind: "unavailable",
      state: createManualLeadFormState({
        kind: "error",
        message: UNAVAILABLE_MESSAGE,
        values,
        errors: { form: UNAVAILABLE_MESSAGE }
      })
    };
  }

  try {
    return {
      kind: "ready",
      tenantId: context.tenant.id,
      profileId: context.profile.id,
      supabase: await createClient()
    };
  } catch (error) {
    if (isSupabaseEnvMissingError(error)) {
      return {
        kind: "unavailable",
        state: createManualLeadFormState({
          kind: "error",
          message: UNAVAILABLE_MESSAGE,
          values,
          errors: { form: UNAVAILABLE_MESSAGE }
        })
      };
    }

    throw error;
  }
}

function createManualLeadWriteErrorState(
  error: SupabaseWriteError,
  values: ManualLeadFormValues
): ManualLeadFormState {
  if (error.code === "23505") {
    return createManualLeadFormState({
      kind: "error",
      message: DUPLICATE_DOMAIN_MESSAGE,
      values,
      errors: {
        domain: DUPLICATE_DOMAIN_MESSAGE
      }
    });
  }

  if (error.code === "42501") {
    return createManualLeadFormState({
      kind: "error",
      message: WRITE_BLOCKED_MESSAGE,
      values,
      errors: { form: WRITE_BLOCKED_MESSAGE }
    });
  }

  return createManualLeadFormState({
    kind: "error",
    message: WRITE_FAILED_MESSAGE,
    values,
    errors: { form: WRITE_FAILED_MESSAGE }
  });
}
