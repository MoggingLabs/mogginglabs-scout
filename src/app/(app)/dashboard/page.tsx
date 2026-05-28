import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";

export default function DashboardPage() {
  return (
    <div className="flex flex-1 flex-col gap-8">
      <header className="flex items-center justify-between border-b pb-6">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            MoggingLabs Scout
          </p>
          <h1 className="mt-2 text-3xl font-semibold">Dashboard</h1>
        </div>
        <Badge variant="secondary">Foundation</Badge>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Workspace ready</CardTitle>
          <CardDescription>
            The application shell and design system foundation are in place.
            Product surfaces arrive in later milestones.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>Signed-in workspace rendered with the dark application theme.</p>
          <Link
            href="/imports"
            className={buttonVariants({ variant: "outline" })}
          >
            Open CSV import wizard
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
