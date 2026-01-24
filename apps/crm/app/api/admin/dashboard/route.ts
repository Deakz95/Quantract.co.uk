export const dynamic = "force-dynamic";
export const revalidate = 0;


import { NextResponse } from "next/server";
import { requireRole } from "@/lib/serverAuth";
import { p } from "@/lib/server/prisma";

export async function GET() {
  const ctx = await requireRole("admin");
  const prisma = p();

  const [jobs, quotes, quotesList, invoices, timesheets] = await Promise.all([
    prisma.job.groupBy({ by: ["status"], where: { companyId: ctx.companyId }, _count: true }),
    prisma.quote.groupBy({ by: ["status"], where: { companyId: ctx.companyId }, _count: true }),
    prisma.quote.findMany({ where: { companyId: ctx.companyId, status: "sent" } }),
    prisma.invoice.findMany({ where: { companyId: ctx.companyId, status: "sent" } }),
    prisma.timesheet.count({ where: { companyId: ctx.companyId, status: "submitted" } })
  ]);

  // Calculate quote totals
  const pendingQuoteValue = quotesList.reduce((a: number, q: any) => a + Number(q.total || 0), 0);

  return NextResponse.json({
    ok: true,
    data: {
      counts: {
        jobs,
        quotes,
        timesheetsPendingApproval: timesheets
      },
      quotes: {
        pendingCount: quotesList.length,
        pendingValue: pendingQuoteValue
      },
      invoices: {
        overdueCount: invoices.filter((i: any) => i.dueDate && i.dueDate < new Date()).length,
        unpaidTotal: invoices.reduce((a: number, i: any)=>a + Number(i.total || 0),0)
      }
    }
  });
}
