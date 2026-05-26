import type { User } from "@supabase/supabase-js";
import { cache } from "react";

import {
  NoActiveMembershipError,
  ProfileNotProvisionedError
} from "@/lib/account/errors";
import {
  requireActiveMembership,
  resolveMembership
} from "@/lib/account/membership";
import { ensureProfile } from "@/lib/account/profile";
import { isSupabaseEnvMissingError } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { Membership, MembershipRole } from "@/lib/types/membership";
import type { Profile } from "@/lib/types/profile";
import type { Tenant } from "@/lib/types/tenant";

export type AppContext =
  | {
      kind: "ready";
      user: User;
      profile: Profile;
      tenant: Tenant;
      membership: Membership;
      role: MembershipRole;
    }
  | { kind: "no-membership"; user: User; profile: Profile | null }
  | { kind: "unauthenticated" }
  | { kind: "supabase-missing" };

export async function resolveAppContext(): Promise<AppContext> {
  let supabase: Awaited<ReturnType<typeof createClient>>;

  try {
    supabase = await createClient();
  } catch (error) {
    if (isSupabaseEnvMissingError(error)) {
      return { kind: "supabase-missing" };
    }

    throw error;
  }

  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  if (!user) {
    return { kind: "unauthenticated" };
  }

  let profile: Profile;

  try {
    profile = await ensureProfile(supabase, user);
  } catch (error) {
    if (error instanceof ProfileNotProvisionedError) {
      return { kind: "no-membership", user, profile: null };
    }

    throw error;
  }

  try {
    const resolvedMembership = requireActiveMembership(
      await resolveMembership(supabase, profile.id),
      profile.id
    );

    return {
      kind: "ready",
      user,
      profile,
      tenant: resolvedMembership.tenant,
      membership: resolvedMembership.membership,
      role: resolvedMembership.membership.role
    };
  } catch (error) {
    if (error instanceof NoActiveMembershipError) {
      return { kind: "no-membership", user, profile };
    }

    throw error;
  }
}

export const getAppContext = cache(resolveAppContext);
