import type { User } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SupabaseEnvMissingError } from "@/lib/env";
import type { Membership, MembershipRole } from "@/lib/types/membership";
import type { Profile } from "@/lib/types/profile";
import type { Tenant } from "@/lib/types/tenant";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn()
}));

vi.mock("@/lib/account/profile", () => ({
  ensureProfile: vi.fn()
}));

vi.mock("@/lib/account/membership", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/account/membership")>();

  return {
    ...actual,
    resolveMembership: vi.fn()
  };
});

import {
  getAppContext,
  resolveAppContext,
  type AppContext
} from "@/lib/account/context";
import { ProfileNotProvisionedError } from "@/lib/account/errors";
import { resolveMembership } from "@/lib/account/membership";
import { ensureProfile } from "@/lib/account/profile";
import { createClient } from "@/lib/supabase/server";

const user = {
  id: "user-1",
  email: "name@example.com"
} as User;

const profile: Profile = {
  id: "user-1",
  email: "name@example.com",
  displayName: "Scout User",
  avatarUrl: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z"
};

const tenant: Tenant = {
  id: "tenant-1",
  name: "Tenant One",
  slug: "tenant-one",
  status: "active",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z"
};

const membership: Membership = {
  id: "membership-1",
  tenantId: "tenant-1",
  profileId: "user-1",
  role: "admin",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z"
};

const createClientMock = vi.mocked(createClient);
const ensureProfileMock = vi.mocked(ensureProfile);
const resolveMembershipMock = vi.mocked(resolveMembership);

function createSupabaseAuthClient(authUser: User | null) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: authUser },
        error: null
      })
    }
  };
}

describe("resolveAppContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns supabase-missing when the server client cannot be configured", async () => {
    createClientMock.mockRejectedValue(new SupabaseEnvMissingError());

    await expect(resolveAppContext()).resolves.toEqual({
      kind: "supabase-missing"
    });
    expect(ensureProfileMock).not.toHaveBeenCalled();
  });

  it("returns unauthenticated when there is no signed-in user", async () => {
    createClientMock.mockResolvedValue(
      createSupabaseAuthClient(null) as unknown as Awaited<
        ReturnType<typeof createClient>
      >
    );

    await expect(resolveAppContext()).resolves.toEqual({
      kind: "unauthenticated"
    });
    expect(ensureProfileMock).not.toHaveBeenCalled();
  });

  it("exposes getAppContext as the cached server helper", async () => {
    createClientMock.mockResolvedValue(
      createSupabaseAuthClient(null) as unknown as Awaited<
        ReturnType<typeof createClient>
      >
    );

    await expect(getAppContext()).resolves.toEqual({
      kind: "unauthenticated"
    });
  });

  it("returns no-membership when the profile has no active tenant", async () => {
    createClientMock.mockResolvedValue(
      createSupabaseAuthClient(user) as unknown as Awaited<
        ReturnType<typeof createClient>
      >
    );
    ensureProfileMock.mockResolvedValue(profile);
    resolveMembershipMock.mockResolvedValue(null);

    await expect(resolveAppContext()).resolves.toEqual({
      kind: "no-membership",
      user,
      profile
    });
  });

  it("returns no-membership when the profile has not been provisioned", async () => {
    createClientMock.mockResolvedValue(
      createSupabaseAuthClient(user) as unknown as Awaited<
        ReturnType<typeof createClient>
      >
    );
    ensureProfileMock.mockRejectedValue(
      new ProfileNotProvisionedError(user.id)
    );

    await expect(resolveAppContext()).resolves.toEqual({
      kind: "no-membership",
      user,
      profile: null
    });
    expect(resolveMembershipMock).not.toHaveBeenCalled();
  });

  it("returns ready with the resolved role when profile and membership exist", async () => {
    createClientMock.mockResolvedValue(
      createSupabaseAuthClient(user) as unknown as Awaited<
        ReturnType<typeof createClient>
      >
    );
    ensureProfileMock.mockResolvedValue(profile);
    resolveMembershipMock.mockResolvedValue({ tenant, membership });

    const context: AppContext = await resolveAppContext();

    if (context.kind !== "ready") {
      throw new Error(`Expected ready context, received ${context.kind}.`);
    }

    const role: MembershipRole = context.role;

    expect(role).toBe("admin");
    expect(context).toEqual({
      kind: "ready",
      user,
      profile,
      tenant,
      membership,
      role: "admin"
    });
  });
});
