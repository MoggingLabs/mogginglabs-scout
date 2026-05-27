import type { User } from "@supabase/supabase-js";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((destination: string) => {
    throw new Error(`redirect:${destination}`);
  })
}));

vi.mock("@/lib/account/context", () => ({
  getAppContext: vi.fn()
}));

vi.mock("@/lib/routing/request-pathname", () => ({
  readRequestPathname: vi.fn()
}));

import { getAppContext } from "@/lib/account/context";
import { readRequestPathname } from "@/lib/routing/request-pathname";
import AppLayout from "../layout";

const getAppContextMock = vi.mocked(getAppContext);
const readRequestPathnameMock = vi.mocked(readRequestPathname);

const noMembershipUser = { id: "user-1" } as User;

describe("AppLayout no-membership routing", () => {
  it("redirects no-membership users to /no-access before rendering the app shell", async () => {
    getAppContextMock.mockResolvedValue({
      kind: "no-membership",
      user: noMembershipUser,
      profile: null
    });
    readRequestPathnameMock.mockResolvedValue("/dashboard");

    await expect(
      AppLayout({
        children: createElement("div", null, "Dashboard shell content")
      })
    ).rejects.toThrow("redirect:/no-access");
  });

  it("renders /no-access for no-membership users without redirecting again", async () => {
    getAppContextMock.mockResolvedValue({
      kind: "no-membership",
      user: noMembershipUser,
      profile: null
    });
    readRequestPathnameMock.mockResolvedValue("/no-access");

    await expect(
      AppLayout({ children: createElement("div", null, "No access page") })
    ).resolves.toBeTruthy();
  });
});
