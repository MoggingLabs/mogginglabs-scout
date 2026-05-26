import { redirect } from "next/navigation";

import { getAppContext, type AppContext } from "@/lib/account/context";

import { AppProviders, NoMembershipRedirect } from "./providers";

export const dynamic = "force-dynamic";

function AppShell({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="theme-app min-h-screen bg-background text-foreground">
      <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-8">
        {children}
      </main>
    </div>
  );
}

function renderReadyContext(
  context: Extract<AppContext, { kind: "ready" }>,
  children: React.ReactNode
) {
  return (
    <AppProviders
      value={{
        role: context.role,
        tenantId: context.tenant.id,
        tenantName: context.tenant.name,
        profileId: context.profile.id,
        displayName: context.profile.displayName
      }}
    >
      {children}
    </AppProviders>
  );
}

export default async function AppLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const context: AppContext = await getAppContext();

  if (context.kind === "unauthenticated") {
    return redirect("/login");
  }

  if (context.kind === "no-membership") {
    return (
      <AppShell>
        <NoMembershipRedirect>{children}</NoMembershipRedirect>
      </AppShell>
    );
  }

  return (
    <AppShell>
      {context.kind === "ready"
        ? renderReadyContext(context, children)
        : children}
    </AppShell>
  );
}
