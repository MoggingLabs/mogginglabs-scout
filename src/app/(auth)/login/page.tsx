export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <section className="w-full max-w-sm rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
        <h1 className="text-2xl font-semibold">Sign in</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Authentication is not wired in Phase 5.
        </p>
        <div className="mt-6 space-y-4">
          <label className="block text-sm font-medium">
            Email
            <input
              type="email"
              placeholder="name@example.com"
              className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              disabled
            />
          </label>
          <button
            type="button"
            disabled
            className="h-10 w-full rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground opacity-60"
          >
            Continue
          </button>
        </div>
      </section>
    </main>
  );
}
