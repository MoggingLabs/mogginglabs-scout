import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CSV_IMPORT_ACCEPT,
  CSV_IMPORT_MAX_FILE_SIZE_MB,
  CSV_IMPORT_WIZARD_STEPS
} from "@/lib/imports/wizard";
import { LEAD_IMPORT_FIELDS } from "@/lib/imports/csv";

export default function ImportsPage() {
  return (
    <div className="flex flex-1 flex-col gap-8">
      <header className="flex flex-col gap-3 border-b pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Lead Data Core
          </p>
          <h1 className="mt-2 text-3xl font-semibold">CSV import wizard</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            Stage tenant-owned CSV files, map columns, validate rows, and review
            import readiness before committing validated rows as leads.
          </p>
        </div>
        <Badge variant="secondary">M2 foundation</Badge>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card>
          <CardHeader>
            <CardTitle>Upload source file</CardTitle>
            <CardDescription>
              Parser, column-mapping, validation, and deduplication helpers are
              defined for the import preview foundation, and valid-row commit
              mapping now targets leads. File persistence and live commit
              controls remain disabled until storage/API integration lands.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="csv-file">CSV file</Label>
              <Input
                id="csv-file"
                type="file"
                accept={CSV_IMPORT_ACCEPT}
                disabled
              />
              <p className="text-xs leading-5 text-muted-foreground">
                CSV only, up to {CSV_IMPORT_MAX_FILE_SIZE_MB} MB. Keep real lead
                files out of the repository; previews use local or Vercel
                environment storage only when that phase is approved.
              </p>
            </div>
            <div className="rounded-md border bg-muted/40 p-4 text-sm text-muted-foreground">
              CSV parsing, suggested column mapping, validation, and
              deduplication are implemented as local helpers for this milestone,
              with a commit helper that writes only valid validated rows. No
              file is uploaded or persisted yet, and this route still has no
              live commit control.
            </div>
            <Button disabled>Preview column mapping</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Wizard steps</CardTitle>
            <CardDescription>
              The full import path is visible now; each behavior lands in order.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-4">
              {CSV_IMPORT_WIZARD_STEPS.map((step, index) => (
                <li key={step.id} className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{step.title}</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lead field mapping</CardTitle>
            <CardDescription>
              Row validation, deduplication, and valid-row commit mapping target
              the existing lead data model.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3">
              {LEAD_IMPORT_FIELDS.map((field) => (
                <div key={field.id} className="rounded-md border p-3">
                  <dt className="flex items-center justify-between gap-3 text-sm font-medium">
                    {field.label}
                    {field.required ? (
                      <Badge variant="destructive">Required</Badge>
                    ) : (
                      <Badge variant="outline">Optional</Badge>
                    )}
                  </dt>
                  <dd className="mt-1 text-xs leading-5 text-muted-foreground">
                    {field.description}
                  </dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
