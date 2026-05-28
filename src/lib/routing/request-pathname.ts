import { headers } from "next/headers";

import { REQUEST_PATHNAME_HEADER } from "./constants";

// The proxy injects REQUEST_PATHNAME_HEADER on every app route, including
// /no-access. The app layout depends on this invariant: it redirects
// no-membership users until the pathname reads back as /no-access, so a missing
// header (which falls back to "/") would never match and loop the redirect.
export async function readRequestPathname() {
  const headerStore = await headers();

  return headerStore.get(REQUEST_PATHNAME_HEADER) ?? "/";
}
