import { describe, expect, it, vi } from "vitest";

import {
  mapMembershipRow,
  mapTenantRow,
  resolveMembership,
  requireActiveMembership,
  selectActiveMembership,
  type MembershipWithTenantRow,
  type TenantRow
} from "@/lib/account/membership";
import { NoActiveMembershipError } from "@/lib/account/errors";
import type { MembershipRole } from "@/lib/types/membership";

function createTenant(overrides: Partial<TenantRow> = {}): TenantRow {
  return {
    id: "tenant-1",
    name: "Tenant One",
    slug: "tenant-one",
    status: "active",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides
  };
}

function createMembership(
  overrides: Partial<Omit<MembershipWithTenantRow, "tenants">> & {
    tenants?: MembershipWithTenantRow["tenants"];
  } = {}
): MembershipWithTenantRow {
  return {
    id: "membership-1",
    tenant_id: "tenant-1",
    profile_id: "user-1",
    role: "viewer",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    tenants: createTenant(),
    ...overrides
  };
}

function createMembershipClient(rows: MembershipWithTenantRow[]) {
  const eq = vi.fn().mockResolvedValue({ data: rows, error: null });
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));

  return {
    client: { from } as unknown as Parameters<typeof resolveMembership>[0],
    eq,
    from,
    select
  };
}

describe("mapping helpers", () => {
  it("maps tenant and membership rows to domain contracts", () => {
    const row = createMembership({
      role: "admin",
      tenants: createTenant({ id: "tenant-2", name: "Tenant Two" })
    });

    expect(mapMembershipRow(row)).toEqual({
      id: "membership-1",
      tenantId: "tenant-1",
      profileId: "user-1",
      role: "admin",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z"
    });
    expect(mapTenantRow(row.tenants as TenantRow)).toEqual({
      id: "tenant-2",
      name: "Tenant Two",
      slug: "tenant-one",
      status: "active",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z"
    });
  });
});

describe("selectActiveMembership", () => {
  it("returns null when there are no rows", () => {
    expect(selectActiveMembership([])).toBeNull();
  });

  it("returns the only active membership", () => {
    const row = createMembership();

    expect(selectActiveMembership([row])).toEqual({
      tenant: mapTenantRow(row.tenants as TenantRow),
      membership: mapMembershipRow(row)
    });
  });

  it("excludes archived tenants", () => {
    expect(
      selectActiveMembership([
        createMembership({
          tenants: createTenant({ status: "archived" })
        })
      ])
    ).toBeNull();
  });

  it("prefers the highest role rank", () => {
    const rows = [
      createMembership({ id: "viewer", role: "viewer" }),
      createMembership({ id: "admin", role: "admin" }),
      createMembership({ id: "owner", role: "owner" })
    ];

    expect(selectActiveMembership(rows)?.membership.id).toBe("owner");
  });

  it("tie-breaks equal roles by most recent update", () => {
    const rows = [
      createMembership({
        id: "older",
        role: "member",
        updated_at: "2026-01-01T00:00:00.000Z"
      }),
      createMembership({
        id: "newer",
        role: "member",
        updated_at: "2026-01-03T00:00:00.000Z"
      })
    ];

    expect(selectActiveMembership(rows)?.membership.id).toBe("newer");
  });

  it("tie-breaks equal roles and updates by tenant id", () => {
    const rows = [
      createMembership({
        id: "later-tenant",
        role: "admin",
        tenant_id: "tenant-b",
        tenants: createTenant({ id: "tenant-b" })
      }),
      createMembership({
        id: "earlier-tenant",
        role: "admin",
        tenant_id: "tenant-a",
        tenants: createTenant({ id: "tenant-a" })
      })
    ];

    expect(selectActiveMembership(rows)?.membership.id).toBe("earlier-tenant");
  });

  it("checks every role in the configured priority list", () => {
    const roles: MembershipRole[] = ["viewer", "member", "admin", "owner"];
    const rows = roles.map((role) => createMembership({ id: role, role }));

    expect(selectActiveMembership(rows)?.membership.role).toBe("owner");
  });
});

describe("resolveMembership", () => {
  it("queries memberships for the profile and selects the active result", async () => {
    const row = createMembership({ role: "admin" });
    const { client, eq, from } = createMembershipClient([row]);

    await expect(resolveMembership(client, "user-1")).resolves.toEqual({
      tenant: mapTenantRow(row.tenants as TenantRow),
      membership: mapMembershipRow(row)
    });

    expect(from).toHaveBeenCalledWith("memberships");
    expect(eq).toHaveBeenCalledWith("profile_id", "user-1");
  });

  it("returns null when no active tenant membership is available", async () => {
    const { client } = createMembershipClient([
      createMembership({ tenants: createTenant({ status: "archived" }) })
    ]);

    await expect(resolveMembership(client, "user-1")).resolves.toBeNull();
  });
});

describe("requireActiveMembership", () => {
  it("returns the resolved membership when one exists", () => {
    const row = createMembership({ role: "member" });
    const resolvedMembership = {
      tenant: mapTenantRow(row.tenants as TenantRow),
      membership: mapMembershipRow(row)
    };

    expect(requireActiveMembership(resolvedMembership, "user-1")).toBe(
      resolvedMembership
    );
  });

  it("throws when no active membership exists", () => {
    expect(() => requireActiveMembership(null, "user-1")).toThrow(
      NoActiveMembershipError
    );
  });
});
