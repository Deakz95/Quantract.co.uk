import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { TimesheetActions } from "./timesheetActions";
import { requestBaseUrl } from "@/lib/server/requestBaseUrl";

type TimesheetEntry = {
  id?: string;
  jobId?: string;
  startedAtISO?: string;
  endedAtISO?: string;
  breakMinutes?: number;
  status?: string;
};

type Timesheet = {
  id: string;
  engineerEmail?: string;
  engineerId?: string;
  weekStartISO: string;
  status: string;
  entries?: TimesheetEntry[];
};

async function loadTimesheet(id: string): Promise<Timesheet | null> {
  try {
    const base = requestBaseUrl();
    const res = await fetch(`${base}/api/admin/timesheets/${id}`, { cache: "no-store" });
    if (!res.ok) return null;
    const j = await res.json();
    // API returns { item: sheet }
    return j.item ?? j.timesheet ?? null;
  } catch {
    return null;
  }
}

type Props = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Page({ params }: Props) {
  const { id } = await params;
  if (!id) {
    throw new Error("Missing id");
  }
  const sheet = await loadTimesheet(id);
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
