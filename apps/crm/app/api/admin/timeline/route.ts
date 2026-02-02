import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const authCtx = await requireCompanyContext();
    const role = getEffectiveRole(authCtx);
    if (role !== "admin" && role !== "office") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");
    const clientId = searchParams.get("clientId");

    if (!jobId && !clientId) {
      return NextResponse.json({ ok: false, error: "jobId or clientId required" }, { status: 400 });
    }

    const companyId = authCtx.companyId;

    const events = await prisma.auditEvent.findMany({
      where: {
        companyId,
        ...(jobId ? { jobId } : {}),
        ...(clientId ? { OR: [
          { quote: { clientId } },
          { invoice: { clientId } },
          { job: { clientId } },
          { certificate: { clientId } },
        ] } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: {
        id: true,
        action: true,
        entityType: true,
        createdAt: true,
        meta: true,
        quote: { select: { id: true, clientName: true } },
        invoice: { select: { id: true, invoiceNumber: true, clientName: true } },
        job: { select: { id: true, title: true } },
        certificate: { select: { id: true, certificateNumber: true } },
      },
    });

    const ACTION_LABELS: Record<string, string> = {
      "created": "Created",
      "updated": "Updated",
      "sent": "Sent",
      "viewed": "Viewed",
      "accepted": "Accepted",
      "rejected": "Rejected",
      "completed": "Completed",
      "paid": "Marked paid",
      "unpaid": "Marked unpaid",
      "cancelled": "Cancelled",
      "deleted": "Deleted",
      "issued": "Issued",
      "voided": "Voided",
      "scheduled": "Scheduled",
      "assigned": "Assigned",
      "invoice.created": "Invoice created",
      "invoice.sent": "Invoice sent",
      "invoice.paid": "Invoice paid",
      "invoice.unpaid": "Invoice unpaid",
      "invoice.viewed": "Invoice viewed",
      "quote.sent": "Quote sent",
      "quote.accepted": "Quote accepted",
      "quote.rejected": "Quote rejected",
      "quote.viewed": "Quote viewed",
      "job.created": "Job created",
      "job.completed": "Job completed",
      "job.scheduled": "Job scheduled",
      "certificate.issued": "Certificate issued",
      "certificate.voided": "Certificate voided",
      "payment.link.created": "Payment link created",
      "site.created": "Site created",
      "site.updated": "Site updated",
    };

    function formatAction(action: string): string {
      if (ACTION_LABELS[action]) return ACTION_LABELS[action];
      // Fallback: "invoice.viewed" → "Invoice viewed", "some_thing" → "Some thing"
      return action
        .replace(/[._]/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
    }

    const items = events.map((e: any) => {
      const label = formatAction(e.action);
      let description = `${e.entityType} — ${label}`;
      if (e.entityType === "job" && e.job) {
        description = `${e.job.title ?? "Job"} — ${label}`;
      } else if (e.entityType === "quote" && e.quote) {
        description = `Quote to ${e.quote.clientName ?? "client"} — ${label}`;
      } else if (e.entityType === "invoice" && e.invoice) {
        description = `Invoice #${e.invoice.invoiceNumber ?? ""} — ${label}`;
      } else if (e.entityType === "certificate" && e.certificate) {
        description = `Certificate #${e.certificate.certificateNumber ?? ""} — ${label}`;
      }

      return {
        id: e.id,
        entityType: e.entityType,
        action: e.action,
        description,
        timestamp: e.createdAt.toISOString(),
      };
    });

    return NextResponse.json({ ok: true, items });
  } catch (err: any) {
    if (err?.status === 401 || err?.status === 403) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: err.status });
    }
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }
}
