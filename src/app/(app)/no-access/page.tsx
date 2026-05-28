import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";

export default function NoAccessPage() {
  return (
    <div className="flex flex-1 flex-col gap-8">
      <header className="border-b pb-6">
        <p className="text-sm font-medium text-muted-foreground">
          MoggingLabs Scout
        </p>
        <h1 className="mt-2 text-3xl font-semibold">No tenant access</h1>
      </header>
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Membership required</CardTitle>
          <CardDescription>
            Your account is signed in, but it is not attached to an active
            tenant.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Contact a workspace owner or administrator to request access.
        </CardContent>
      </Card>
    </div>
  );
}
