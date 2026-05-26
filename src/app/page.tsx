import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <section className="w-full max-w-3xl">
        <p className="mb-4 text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
          MoggingLabs
        </p>
        <h1 className="text-5xl font-semibold leading-tight sm:text-6xl">
          Scout
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
          Prospecting intelligence and CRM foundations for focused home
          improvement sales workflows.
        </p>
        <div className="mt-10">
          <Link
            href="/login"
            className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Sign in
          </Link>
        </div>
      </section>
    </main>
  );
}
