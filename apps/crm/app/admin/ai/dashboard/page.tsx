import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import { requireCompanyContext } from "@/lib/serverAuth";
import { getDigestDashboard } from "@/lib/ai/dashboardMetrics";

export const dynamic = "force-dynamic";

function pct(val: number | null): string {
  if (val === null) return "—";
  return `${(val * 100).toFixed(1)}%`;
}

export default async function DigestDashboardPage() {
  let ctx: Awaited<ReturnType<typeof requireCompanyContext>>;
  try {
    ctx = await requireCompanyContext();
  } catch {
    redirect("/login");
  }

  if (ctx.role !== "admin") {
    redirect("/admin");
  }

  const { kpis, topActions, weeklyTrend } = await getDigestDashboard(ctx.companyId);

  return (
    <AppShell role="admin" title="Smart Assistant" subtitle="Weekly Digest Funnel">
      <div className="space-y-6 max-w-5xl">
        {/* KPI cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard title="Digests sent" value={kpis.digestsSent} />
          <KpiCard title="Deep links opened" value={kpis.deepLinksOpened} sub={`Open rate: ${pct(kpis.openRate)}`} />
          <KpiCard title="Applies attributed" value={kpis.appliesAttributed} sub={`From opens: ${pct(kpis.applyRateFromOpens)}`} />
          <KpiCard title="Apply rate (from sent)" value={pct(kpis.applyRateFromSent)} />
        </div>

        {/* Time to value */}
        <Card>
          <CardHeader>
            <CardTitle>Time to value</CardTitle>
            <CardDescription>Median minutes from digest deep link to apply action</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[var(--foreground)]">
              {kpis.medianMinutesToApply !== null ? `${kpis.medianMinutesToApply} min` : "—"}
            </div>
          </CardContent>
        </Card>

        {/* Weekly trend */}
        {weeklyTrend.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Weekly trend</CardTitle>
              <CardDescription>Last 4 weeks</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Week of</TableHead>
                    <TableHead>Sent</TableHead>
                    <TableHead>Opened</TableHead>
                    <TableHead>Applied</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {weeklyTrend.map((w) => (
                    <TableRow key={w.weekStart}>
                      <TableCell>{w.weekStart}</TableCell>
                      <TableCell>{w.sent}</TableCell>
                      <TableCell>{w.opened}</TableCell>
                      <TableCell>{w.applied}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Top converting actions */}
        <Card>
          <CardHeader>
            <CardTitle>Top converting apply actions</CardTitle>
            <CardDescription>Grouped by action ID, sorted by apply count (last 30 days)</CardDescription>
          </CardHeader>
          <CardContent>
            {topActions.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">No attributed applies yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action ID</TableHead>
                    <TableHead>Applies</TableHead>
                    <TableHead>Unique users</TableHead>
                    <TableHead>Last applied</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topActions.map((a) => (
                    <TableRow key={a.actionId}>
                      <TableCell className="font-mono text-xs">{a.actionId}</TableCell>
                      <TableCell>{a.applies}</TableCell>
                      <TableCell>{a.uniqueUsers}</TableCell>
                      <TableCell>{a.lastAppliedAt.toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function KpiCard({ title, value, sub }: { title: string; value: string | number; sub?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-[var(--foreground)]">{value}</div>
        {sub && <p className="text-xs text-[var(--muted-foreground)] mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}
