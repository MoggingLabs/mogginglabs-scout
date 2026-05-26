import { redirect } from "next/navigation";

import { isSupabaseEnvMissingError } from "@/lib/env";
import { getUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  let user = null;

  try {
    user = await getUser();
  } catch (error) {
    if (!isSupabaseEnvMissingError(error)) {
      throw error;
    }

    // TODO: Remove this Phase 5 fallback when live Supabase auth is wired.
  }

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="theme-app min-h-screen bg-background text-foreground">
      <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-8">
        {children}
      </main>
    </div>
  );
}
