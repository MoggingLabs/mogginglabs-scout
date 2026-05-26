import type { SupabaseClient } from "@supabase/supabase-js";

import { NoActiveMembershipError } from "@/lib/account/errors";
import type { Database } from "@/lib/supabase/types";
import type { Membership, MembershipRole } from "@/lib/types/membership";
import type { Tenant } from "@/lib/types/tenant";

export type MembershipRow = Database["public"]["Tables"]["memberships"]["Row"];
export type TenantRow = Database["public"]["Tables"]["tenants"]["Row"];

export type MembershipWithTenantRow = MembershipRow & {
  tenants: TenantRow | null;
};

export type ResolvedMembership = {
  tenant: Tenant;
  membership: Membership;
};

const roleRanks: Record<MembershipRole, number> = {
  owner: 4,
  admin: 3,
  member: 2,
  viewer: 1
};

export function mapTenantRow(row: TenantRow): Tenant {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function mapMembershipRow(row: MembershipRow): Membership {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    profileId: row.profile_id,
    role: row.role,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function selectActiveMembership(
  rows: MembershipWithTenantRow[]
): ResolvedMembership | null {
  const candidates = rows
    .filter((row): row is MembershipWithTenantRow & { tenants: TenantRow } => {
      return row.tenants?.status === "active";
    })
    .map((row) => ({
      tenant: mapTenantRow(row.tenants),
      membership: mapMembershipRow(row)
    }));

  candidates.sort((left, right) => {
    const roleDelta =
      roleRanks[right.membership.role] - roleRanks[left.membership.role];

    if (roleDelta !== 0) {
      return roleDelta;
    }

    const updatedAtDelta =
      Date.parse(right.membership.updatedAt) -
      Date.parse(left.membership.updatedAt);

    if (updatedAtDelta !== 0) {
      return updatedAtDelta;
    }

    return left.tenant.id.localeCompare(right.tenant.id);
  });

  return candidates[0] ?? null;
}

export async function resolveMembership(
  supabase: Pick<SupabaseClient<Database>, "from">,
  profileId: string
): Promise<ResolvedMembership | null> {
  const { data, error } = await supabase
    .from("memberships")
    .select(
      "id, tenant_id, profile_id, role, created_at, updated_at, tenants!inner(id, name, slug, status, created_at, updated_at)"
    )
    .eq("profile_id", profileId);

  if (error) {
    throw error;
  }

  return selectActiveMembership((data ?? []) as MembershipWithTenantRow[]);
}

export function requireActiveMembership(
  resolvedMembership: ResolvedMembership | null,
  profileId: string
): ResolvedMembership {
  if (!resolvedMembership) {
    throw new NoActiveMembershipError(profileId);
  }

  return resolvedMembership;
}
