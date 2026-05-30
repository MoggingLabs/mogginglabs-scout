import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";

export function LeadTableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Lead list</CardTitle>
        <CardDescription>Loading lead records.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 rounded-md border p-4">
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              className="grid gap-3 sm:grid-cols-[minmax(12rem,1fr)_8rem_10rem_12rem]"
            >
              <div className="h-4 rounded bg-muted" />
              <div className="h-4 rounded bg-muted" />
              <div className="h-4 rounded bg-muted" />
              <div className="h-4 rounded bg-muted" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function LeadErrorState({ message }: { message: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Lead data unavailable</CardTitle>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive-foreground">
          No lead rows were read for this request.
        </div>
      </CardContent>
    </Card>
  );
}
