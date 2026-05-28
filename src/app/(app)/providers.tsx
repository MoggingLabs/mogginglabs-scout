"use client";

import { type ReactNode } from "react";

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
