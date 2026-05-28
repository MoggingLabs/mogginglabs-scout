import { describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  headers: vi.fn()
}));

import { headers } from "next/headers";

import { REQUEST_PATHNAME_HEADER } from "@/lib/routing/constants";
import { readRequestPathname } from "@/lib/routing/request-pathname";

const headersMock = vi.mocked(headers);

function mockHeaderStore(pathname: string | null) {
  headersMock.mockResolvedValue({
    get: vi.fn((name: string) =>
      name === REQUEST_PATHNAME_HEADER ? pathname : null
    )
  } as unknown as Awaited<ReturnType<typeof headers>>);
}

describe("readRequestPathname", () => {
  it("returns the pathname injected via REQUEST_PATHNAME_HEADER", async () => {
    mockHeaderStore("/accounts");

    await expect(readRequestPathname()).resolves.toBe("/accounts");
  });

  it("falls back to the root path when the header is absent", async () => {
    mockHeaderStore(null);

    await expect(readRequestPathname()).resolves.toBe("/");
  });
});
