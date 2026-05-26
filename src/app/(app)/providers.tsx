"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import {
  AppContextProvider,
  type ClientAppContext
} from "@/components/app-context-provider";

export function AppProviders({
  children,
  value
}: Readonly<{
  children: ReactNode;
  value: ClientAppContext;
}>) {
  return <AppContextProvider value={value}>{children}</AppContextProvider>;
}

export function NoMembershipRedirect({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (pathname !== "/no-access") {
      router.replace("/no-access");
    }
  }, [pathname, router]);

  if (pathname !== "/no-access") {
    return null;
  }

  return <>{children}</>;
}
