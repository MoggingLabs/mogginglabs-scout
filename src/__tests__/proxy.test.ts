import { createServerClient } from "@supabase/ssr";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { REQUEST_PATHNAME_HEADER } from "@/lib/routing/constants";
import { buildPathnameRequestHeaders, proxy } from "../proxy";

type CookieSetterOptions = {
  cookies: {
    setAll: (
      cookies: Array<{
        name: string;
        value: string;
        options?: { path?: string };
      }>
    ) => void;
  };
};

vi.mock("@/lib/env", () => ({
  getPublicSupabaseEnv: () => ({
    NEXT_PUBLIC_SUPABASE_URL: "https://supabase.example.com",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key"
  }),
  isSupabaseEnvMissingError: () => false
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn()
}));

const createServerClientMock = vi.mocked(createServerClient);

describe("proxy pathname forwarding", () => {
  beforeEach(() => {
    createServerClientMock.mockReset();
  });

  it("adds the current pathname to forwarded request headers", () => {
    const request = new Request("https://scout.example.com/accounts?tab=team", {
      headers: {
        accept: "text/html"
      }
    });

    const headers = buildPathnameRequestHeaders(request.headers, "/accounts");

    expect(headers.get("accept")).toBe("text/html");
    expect(headers.get(REQUEST_PATHNAME_HEADER)).toBe("/accounts");
  });

  it("preserves refreshed Supabase cookies when rebuilding forwarded request headers", async () => {
    createServerClientMock.mockImplementation((_url, _key, options) => {
      const cookieOptions = options as unknown as CookieSetterOptions;

      return {
        auth: {
          getUser: vi.fn(async () => {
            cookieOptions.cookies.setAll([
              {
                name: "sb-refresh-token",
                value: "fresh-token",
                options: { path: "/" }
              }
            ]);

            return { data: { user: null }, error: null };
          })
        }
      };
    });

    const request = new NextRequest("https://scout.example.com/dashboard", {
      headers: {
        cookie: "existing=1"
      }
    });

    const response = await proxy(request);

    expect(response.headers.get("x-middleware-request-cookie")).toContain(
      "sb-refresh-token=fresh-token"
    );
    expect(
      response.headers.get(`x-middleware-request-${REQUEST_PATHNAME_HEADER}`)
    ).toBe("/dashboard");
  });
});
