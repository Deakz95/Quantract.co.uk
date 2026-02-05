import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/server/prisma";
import { getReminderQueue } from "@/lib/server/queue/queueConfig";
import { withRequestLogging } from "@/lib/server/observability";
import { trackCronRun } from "@/lib/server/cronTracker";

/**
 * Invoice Reminder Cron Handler
 *
 * CRITICAL: This handler ONLY enqueues jobs.
 * NO business logic here - all logic in processor.
 *
 * Triggered by external cron service (e.g., Vercel Cron, EasyCron)
 */

function jsonOk(data: Record<string, unknown>, status = 200) {
  return NextResponse.json({ ok: true, ...data }, { status });
}

function jsonErr(error: unknown, status = 400) {
  const msg = error instanceof Error ? error.message : String(error || "Request failed");
  return NextResponse.json({ ok: false, error: msg }, { status });
}

export const GET = withRequestLogging(async function GET() {
  try {
    const db = getPrisma();
    if (!db) {
      return jsonErr("Database not available", 503);
    }

    const result = await trackCronRun("invoice-reminders", async () => {
      const reminderQueue = getReminderQueue();
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Find overdue invoices
      const overdueInvoices = await db.invoice.findMany({
        where: {
          status: { not: "paid" },
          dueAt: { lt: today },
        },
        select: {
          id: true,
          companyId: true,
          dueAt: true,
          InvoiceChase: {
            orderBy: { sentAt: "desc" },
            take: 1,
          },
        },
      });

      const jobsEnqueued: string[] = [];

      for (const invoice of overdueInvoices) {
        const daysOverdue = Math.floor(
          (today.getTime() - new Date(invoice.dueAt).getTime()) / (1000 * 60 * 60 * 24)
        );

        let reminderType: "first" | "second" | "third" | null = null;

        if (daysOverdue >= 7 && daysOverdue < 14 && invoice.InvoiceChase.length === 0) {
          reminderType = "first";
        } else if (daysOverdue >= 14 && daysOverdue < 21 && invoice.InvoiceChase.length === 1) {
          reminderType = "second";
        } else if (daysOverdue >= 21 && invoice.InvoiceChase.length === 2) {
          reminderType = "third";
        }

        if (reminderType) {
          const idempotencyKey = `invoice-reminder-${invoice.id}-${reminderType}-${today.toISOString().split("T")[0]}`;

          await reminderQueue.add(
            "send-reminder",
            {
              invoiceId: invoice.id,
              companyId: invoice.companyId,
              reminderType,
              idempotencyKey,
            },
            { jobId: idempotencyKey }
          );

          jobsEnqueued.push(invoice.id);
        }
      }

      return {
        message: "Invoice reminder jobs enqueued",
        count: jobsEnqueued.length,
        invoiceIds: jobsEnqueued,
      };
    });

    return jsonOk(result);
  } catch (e: any) {
    console.error("[Cron: invoice-reminders] Error:", e);
    return jsonErr(e, 500);
  }
});
