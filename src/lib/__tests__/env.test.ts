import { describe, expect, it } from "vitest";

import {
  getPublicSupabaseEnv,
  parseEnv,
  SupabaseEnvInvalidError,
  SupabaseEnvMissingError
} from "@/lib/env";

const exampleEnv = {
  NODE_ENV: "development",
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  NEXT_PUBLIC_SUPABASE_URL: "https://your-project.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "your_publishable_or_anon_key",
  SUPABASE_SERVICE_ROLE_KEY: "server_only_placeholder_never_expose_client_side",
  AI_PROVIDER: "openai-compatible",
  AI_BASE_URL: "https://api.example.com/v1",
  AI_API_KEY: "server_only_placeholder",
  AI_MODEL: "placeholder-model",
  MAP_PROVIDER: "disabled",
  EMAIL_PROVIDER: "disabled"
};

describe("parseEnv", () => {
  it("accepts .env.example-shaped values", () => {
    expect(parseEnv(exampleEnv)).toMatchObject(exampleEnv);
  });

  it("defaults NODE_ENV to development", () => {
    expect(parseEnv({}).NODE_ENV).toBe("development");
  });

  it("allows optional fields to be absent", () => {
    expect(parseEnv({})).toEqual({ NODE_ENV: "development" });
  });

  it("rejects empty configured values", () => {
    expect(() =>
      parseEnv({ ...exampleEnv, NEXT_PUBLIC_SUPABASE_ANON_KEY: "" })
    ).toThrow();
  });

  it("rejects invalid optional URLs when configured", () => {
    expect(() => parseEnv({ AI_BASE_URL: "not-a-url" })).toThrow();
  });
});

describe("getPublicSupabaseEnv", () => {
  it("requires Supabase URL and anon key when helpers are used", () => {
    expect(() => getPublicSupabaseEnv({ NODE_ENV: "test" })).toThrow(
      SupabaseEnvMissingError
    );
  });

  it("rejects partially configured Supabase values as invalid", () => {
    expect(() =>
      getPublicSupabaseEnv({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co"
      })
    ).toThrow(SupabaseEnvInvalidError);
  });

  it("surfaces invalid optional values when Supabase values are absent", () => {
    expect(() => getPublicSupabaseEnv({ AI_BASE_URL: "not-a-url" })).toThrow(
      SupabaseEnvInvalidError
    );
  });
});
