import { z } from "zod";

const optionalNonEmpty = z
  .string()
  .trim()
  .min(1, "must not be empty")
  .optional();

const optionalUrl = z.string().trim().url().optional();

export const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  NEXT_PUBLIC_APP_URL: optionalUrl,
  NEXT_PUBLIC_SUPABASE_URL: optionalUrl,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: optionalNonEmpty,
  SUPABASE_SERVICE_ROLE_KEY: optionalNonEmpty,
  AI_PROVIDER: optionalNonEmpty,
  AI_BASE_URL: optionalUrl,
  AI_API_KEY: optionalNonEmpty,
  AI_MODEL: optionalNonEmpty,
  MAP_PROVIDER: optionalNonEmpty,
  EMAIL_PROVIDER: optionalNonEmpty
});

const publicSupabaseEnvSchema = envSchema.required({
  NEXT_PUBLIC_SUPABASE_URL: true,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: true
});

const publicSupabaseEnvKeys = new Set([
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
]);

type EnvInput = Record<string, string | undefined>;

export type AppEnv = z.infer<typeof envSchema>;
export type PublicSupabaseEnv = z.infer<typeof publicSupabaseEnvSchema>;

export class SupabaseEnvMissingError extends Error {
  constructor() {
    super(
      "Supabase environment is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable auth."
    );
    this.name = "SupabaseEnvMissingError";
  }
}

export class SupabaseEnvInvalidError extends Error {
  constructor(message: string) {
    super(`Supabase environment is invalid: ${message}`);
    this.name = "SupabaseEnvInvalidError";
  }
}

export function parseEnv(input: EnvInput): AppEnv {
  return envSchema.parse(input);
}

export function isSupabaseEnvMissingError(
  error: unknown
): error is SupabaseEnvMissingError {
  return error instanceof SupabaseEnvMissingError;
}

export function getPublicSupabaseEnv(
  input: EnvInput = process.env
): PublicSupabaseEnv {
  const parsed = publicSupabaseEnvSchema.safeParse(input);

  if (
    input.NEXT_PUBLIC_SUPABASE_URL === undefined &&
    input.NEXT_PUBLIC_SUPABASE_ANON_KEY === undefined &&
    !parsed.success &&
    parsed.error.issues.every((issue) =>
      publicSupabaseEnvKeys.has(String(issue.path[0]))
    )
  ) {
    throw new SupabaseEnvMissingError();
  }

  if (!parsed.success) {
    throw new SupabaseEnvInvalidError(z.prettifyError(parsed.error));
  }

  return parsed.data;
}
