import { describe, expect, it, vi } from "vitest";

import { ProfileNotProvisionedError } from "@/lib/account/errors";
import {
  ensureProfile,
  mapProfileRow,
  type ProfileRow
} from "@/lib/account/profile";

const profileRow: ProfileRow = {
  id: "user-1",
  email: "name@example.com",
  display_name: "Scout User",
  avatar_url: null,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-02T00:00:00.000Z"
};

function createProfileClient(data: ProfileRow | null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data, error: null });
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));

  return {
    client: { from } as unknown as Parameters<typeof ensureProfile>[0],
    eq,
    from,
    maybeSingle,
    select
  };
}

describe("mapProfileRow", () => {
  it("maps a profiles row to the Profile contract", () => {
    expect(mapProfileRow(profileRow)).toEqual({
      id: "user-1",
      email: "name@example.com",
      displayName: "Scout User",
      avatarUrl: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z"
    });
  });
});

describe("ensureProfile", () => {
  it("returns a mapped profile when the row exists", async () => {
    const { client, eq, from } = createProfileClient(profileRow);

    await expect(ensureProfile(client, { id: "user-1" })).resolves.toEqual(
      mapProfileRow(profileRow)
    );

    expect(from).toHaveBeenCalledWith("profiles");
    expect(eq).toHaveBeenCalledWith("id", "user-1");
  });

  it("throws when the profile row is missing", async () => {
    const { client } = createProfileClient(null);

    await expect(ensureProfile(client, { id: "user-1" })).rejects.toThrow(
      ProfileNotProvisionedError
    );
  });
});
