import { Badge } from "@/components/ui/badge";
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
        <CardContent className="text-sm text-muted-foreground">
          Signed-in workspace rendered with the dark application theme.
        </CardContent>
      </Card>
    </div>
  );
}
