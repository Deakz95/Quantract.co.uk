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
        metadata: true,
        quote: { select: { id: true, clientName: true } },
        invoice: { select: { id: true, invoiceNumber: true, clientName: true } },
        job: { select: { id: true, title: true } },
        certificate: { select: { id: true, certificateNumber: true } },
      },
    });

    const items = events.map((e: any) => {
      let description = `${e.entityType} ${e.action}`;
      if (e.entityType === "job" && e.job) {
        description = `${e.job.title ?? "Job"} — ${e.action}`;
      } else if (e.entityType === "quote" && e.quote) {
        description = `Quote to ${e.quote.clientName ?? "client"} — ${e.action}`;
      } else if (e.entityType === "invoice" && e.invoice) {
        description = `Invoice #${e.invoice.invoiceNumber ?? ""} — ${e.action}`;
      } else if (e.entityType === "certificate" && e.certificate) {
        description = `Certificate #${e.certificate.certificateNumber ?? ""} — ${e.action}`;
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
