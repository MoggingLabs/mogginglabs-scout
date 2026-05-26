export default function NoAccessPage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b pb-6">
        <p className="text-sm font-medium text-muted-foreground">
          MoggingLabs Scout
        </p>
        <h1 className="mt-2 text-3xl font-semibold">No tenant access</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          Your account is signed in, but it is not attached to an active tenant.
        </p>
      </header>
    </div>
  );
}
