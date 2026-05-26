"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { MembershipRole } from "@/lib/types/membership";

export type ClientAppContext = {
  role: MembershipRole;
  tenantId: string;
  tenantName: string;
  profileId: string;
  displayName: string | null;
};

const AppContext = createContext<ClientAppContext | null>(null);

export function AppContextProvider({
  children,
  value
}: Readonly<{
  children: ReactNode;
  value: ClientAppContext;
}>) {
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext(): ClientAppContext {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error("useAppContext must be used inside AppContextProvider.");
  }

  return context;
}
