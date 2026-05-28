import { headers } from "next/headers";

import { REQUEST_PATHNAME_HEADER } from "./constants";

export async function readRequestPathname() {
  const headerStore = await headers();

  return headerStore.get(REQUEST_PATHNAME_HEADER) ?? "/";
}
