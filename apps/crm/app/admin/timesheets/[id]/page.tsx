import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { TimesheetActions } from "./timesheetActions";
import { getTimesheetById } from "@/lib/server/repo";

type Props = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Page({ params }: Props) {
  const { id } = await params;
  if (!id) {
    throw new Error("Missing id");
  }

  // Call repo directly — avoids the Server Component self-fetch anti-pattern
  // which fails because cookies aren't forwarded in the request.
  const sheet = await getTimesheetById(id);

  if (!sheet) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Timesheet</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-[var(--muted-foreground)]">Not found.</div>
        </CardContent>
      </Card>
    );
  }

  const breadcrumbItems = [
    { label: "Dashboard", href: "/admin" },
    { label: "Timesheets", href: "/admin/timesheets" },
    { label: `Timesheet: ${sheet.engineerEmail || sheet.engineerId || id.slice(0, 8)}` },
  ];

  return (
      <div className="space-y-4">
      <Breadcrumbs items={breadcrumbItems} />
      <Card>
        <CardHeader>
          <CardTitle>Timesheet Review</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-[var(--foreground)]">{sheet.engineerEmail || (sheet.engineerId ? `Engineer #${sheet.engineerId.slice(0, 8)}` : "Unknown engineer")}</div>
              <div className="mt-0.5 text-xs text-[var(--muted-foreground)]">Week starting: {new Date(sheet.weekStartISO).toLocaleDateString()}</div>
              <div className="mt-0.5 text-xs text-[var(--muted-foreground)]">Status: {sheet.status}</div>
            </div>
            <TimesheetActions id={sheet.id} status={sheet.status} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Entries</CardTitle>
        </CardHeader>
        <CardContent>
          {!sheet.entries || sheet.entries.length === 0 ? (
            <div className="text-sm text-[var(--muted-foreground)] py-4 text-center">
              No time entries recorded for this timesheet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead>Break</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sheet.entries.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.jobId ? e.jobId.slice(0, 8) : "—"}</TableCell>
                    <TableCell>{e.startedAtISO ? new Date(e.startedAtISO).toLocaleString() : "—"}</TableCell>
                    <TableCell>{e.endedAtISO ? new Date(e.endedAtISO).toLocaleString() : "—"}</TableCell>
                    <TableCell>{typeof e.breakMinutes === "number" ? e.breakMinutes : "—"}</TableCell>
                    <TableCell>{e.status || "draft"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      </div>
  );
}
