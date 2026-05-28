import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="theme-landing flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
      <section className="w-full max-w-3xl">
        <Badge variant="secondary" className="tracking-[0.18em] uppercase">
          MoggingLabs
        </Badge>
        <h1 className="mt-4 text-5xl font-semibold leading-tight sm:text-6xl">
          Scout
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
          Prospecting intelligence and CRM foundations for focused home
          improvement sales workflows.
        </p>
        <div className="mt-10">
          <Link href="/login" className={buttonVariants({ size: "lg" })}>
            Sign in
          </Link>
        </div>
      </section>
    </main>
  );
}
