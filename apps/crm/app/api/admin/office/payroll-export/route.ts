export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging, logError } from "@/lib/server/observability";

export const runtime = "nodejs";

export const GET = withRequestLogging(async function GET(req: Request) {
  try {
    const authCtx = await requireCompanyContext();
    const effectiveRole = getEffectiveRole(authCtx);

    if (effectiveRole !== "admin" && effectiveRole !== "office") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const prisma = getPrisma();
    const cid = authCtx.companyId;
    const url = new URL(req.url);
    const weekStart = url.searchParams.get("weekStart"); // ISO date string

    // Fetch approved timesheets (optionally filtered by week)
    const timesheets = await prisma.timesheet.findMany({
      where: {
        companyId: cid,
        status: "approved",
        ...(weekStart ? { weekStart: new Date(weekStart) } : {}),
      },
      include: {
        engineer: { select: { id: true, name: true, email: true } },
        timeEntries: {
          select: {
            startedAt: true,
            endedAt: true,
            breakMinutes: true,
            jobId: true,
            job: { select: { id: true, title: true, jobNumber: true } },
          },
        },
      },
      orderBy: [{ weekStart: "desc" }, { engineer: { name: "asc" } }],
    });

    // Build CSV rows
    const rows: string[] = [];
    rows.push("Engineer Name,Engineer Email,Week Starting,Total Hours,Job Breakdown");

    for (const ts of timesheets) {
      const engineerName = (ts.engineer?.name || "Unknown").replace(/,/g, " ");
      const engineerEmail = (ts.engineer?.email || "").replace(/,/g, " ");
      const weekDate = new Date(ts.weekStart).toISOString().slice(0, 10);

      // Calculate total hours and per-job breakdown
      let totalHours = 0;
      const jobHours: Record<string, { label: string; hours: number }> = {};

      for (const entry of ts.timeEntries) {
        if (!entry.endedAt) continue;
        const ms = new Date(entry.endedAt).getTime() - new Date(entry.startedAt).getTime();
        const hours = ms / 3600000 - (entry.breakMinutes || 0) / 60;
        totalHours += hours;

        const jobKey = entry.jobId || "unassigned";
        if (!jobHours[jobKey]) {
          const job = (entry as any).job;
          jobHours[jobKey] = {
            label: job?.jobNumber ? `#${job.jobNumber}` : job?.title || "Unassigned",
            hours: 0,
          };
        }
        jobHours[jobKey].hours += hours;
      }

      const breakdown = Object.values(jobHours)
        .map((j) => `${j.label}: ${j.hours.toFixed(1)}h`)
        .join("; ");

      rows.push(`${engineerName},${engineerEmail},${weekDate},${totalHours.toFixed(2)},"${breakdown}"`);
    }

    const csv = rows.join("\r\n");
    const filename = `payroll-export-${new Date().toISOString().slice(0, 10)}.csv`;

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    if (error?.status === 401) {
      return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    }
    if (error?.status === 403) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }
    logError(error, { route: "/api/admin/office/payroll-export", action: "get" });
    return NextResponse.json({ ok: false, error: "export_failed" }, { status: 500 });
  }
});
