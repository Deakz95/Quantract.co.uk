import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { TimesheetActions } from "./timesheetActions";

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
  const res = await fetch(`/api/admin/timesheets/${id}`, { cache: "no-store" });
  const j = (await res.json()) as { timesheet?: Timesheet | null };
  return j.timesheet ?? null;
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

  return (
      <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Timesheet Review</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-[var(--foreground)]">{sheet.engineerEmail || sheet.engineerId}</div>
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
              {(sheet.entries || []).map((e) => (
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
        </CardContent>
      </Card>
      </div>
  );
}
