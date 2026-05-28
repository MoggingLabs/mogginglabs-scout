import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { getPublicSupabaseEnv, isSupabaseEnvMissingError } from "@/lib/env";
import { REQUEST_PATHNAME_HEADER } from "@/lib/routing/constants";
import type { Database } from "@/lib/supabase/types";

export function buildPathnameRequestHeaders(
  headers: Headers,
  pathname: string
): Headers {
  const requestHeaders = new Headers(headers);
  requestHeaders.set(REQUEST_PATHNAME_HEADER, pathname);

  return requestHeaders;
}

export async function proxy(request: NextRequest) {
  const requestHeaders = buildPathnameRequestHeaders(
    request.headers,
    request.nextUrl.pathname
  );
  let response = NextResponse.next({
    request: {
      headers: requestHeaders
    }
  });

  try {
    const env = getPublicSupabaseEnv();
    const supabase = createServerClient<Database>(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            response = NextResponse.next({
              request: {
                headers: buildPathnameRequestHeaders(
                  request.headers,
                  request.nextUrl.pathname
                )
              }
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          }
        }
      }
    );

    await supabase.auth.getUser();
  } catch (error) {
    if (!isSupabaseEnvMissingError(error)) {
      throw error;
    }

    // Phase 5 does not wire a live Supabase project yet. Keep public shells bootable.
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|login|auth/callback|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"
  ]
};
