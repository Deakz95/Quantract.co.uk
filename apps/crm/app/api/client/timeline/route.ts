import { NextResponse } from "next/server";
import { requireRole, getUserEmail } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging } from "@/lib/server/observability";
import { isFeatureEnabled } from "@/lib/server/featureFlags";

export const runtime = "nodejs";

type TimelineItem = {
  id: string;
  ts: string;
  type: "job" | "quote" | "invoice" | "certificate" | "activity";
  title: string;
  description?: string;
  href?: string;
  meta?: Record<string, unknown>;
};

/**
 * GET /api/client/timeline
 * Aggregates jobs, quotes, invoices, certificates, and activities for the logged-in client.
 */
export const GET = withRequestLogging(async function GET() {
  try {
    await requireRole("client");
    const email = ((await getUserEmail()) || "").trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ ok: false, error: "Missing email" }, { status: 400 });
    }

    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });
    }

    // Find the client record by email to get companyId + clientId
    const client = await prisma.client.findFirst({
      where: { email },
      select: { id: true, companyId: true, name: true },
    });

    if (!client) {
      return NextResponse.json({ ok: true, items: [] });
    }

    const { id: clientId, companyId } = client;

    // Feature flag check
    const company = await prisma.company.findUnique({ where: { id: companyId }, select: { plan: true } });
    if (!isFeatureEnabled(company?.plan, "portal_timeline")) {
      return NextResponse.json({ ok: false, error: "feature_not_available" }, { status: 403 });
    }

    const items: TimelineItem[] = [];

    // Jobs linked to this client
    const jobs = await prisma.job.findMany({
      where: { companyId, clientId },
      select: { id: true, title: true, status: true, createdAt: true, updatedAt: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }).catch(() => []);

    for (const j of jobs) {
      items.push({
        id: `job-${j.id}`,
        ts: j.createdAt.toISOString(),
        type: "job",
        title: `Job: ${j.title || j.id.slice(0, 8)}`,
        description: `Status: ${j.status}`,
        href: `/client/jobs/${j.id}`,
        meta: { jobId: j.id, status: j.status },
      });
    }

    // Quotes linked to this client (by email)
    const quotes = await prisma.quote.findMany({
      where: { companyId, clientEmail: email },
      select: { id: true, status: true, createdAtISO: true, clientName: true, token: true },
      orderBy: { createdAtISO: "desc" },
      take: 50,
    }).catch(() => []);

    for (const q of quotes) {
      items.push({
        id: `quote-${q.id}`,
        ts: q.createdAtISO,
        type: "quote",
        title: `Quote received`,
        description: `Status: ${q.status}`,
        href: q.token ? `/client/quotes/${q.token}` : undefined,
        meta: { quoteId: q.id, status: q.status },
      });
    }

    // Invoices linked to this client (by email)
    const invoices = await prisma.invoice.findMany({
      where: { companyId, clientEmail: email },
      select: { id: true, status: true, total: true, createdAtISO: true, invoiceNumber: true, token: true },
      orderBy: { createdAtISO: "desc" },
      take: 50,
    }).catch(() => []);

    for (const inv of invoices) {
      items.push({
        id: `inv-${inv.id}`,
        ts: inv.createdAtISO,
        type: "invoice",
        title: `Invoice ${inv.invoiceNumber || inv.id.slice(0, 8)}`,
        description: `£${(inv.total / 100).toFixed(2)} — ${inv.status}`,
        href: inv.token ? `/client/invoices/${inv.token}` : undefined,
        meta: { invoiceId: inv.id, status: inv.status },
      });
    }

    // Certificates
    const certs = await prisma.certificate.findMany({
      where: { companyId, job: { clientId } },
      select: { id: true, type: true, status: true, certificateNumber: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }).catch(() => []);

    for (const c of certs) {
      items.push({
        id: `cert-${c.id}`,
        ts: c.createdAt.toISOString(),
        type: "certificate",
        title: `${c.type} Certificate ${c.certificateNumber || ""}`.trim(),
        description: `Status: ${c.status}`,
        meta: { certificateId: c.id },
      });
    }

    // Activities linked to this client
    const activities = await prisma.activity.findMany({
      where: { companyId, clientId },
      select: { id: true, type: true, subject: true, description: true, occurredAt: true },
      orderBy: { occurredAt: "desc" },
      take: 50,
    }).catch(() => []);

    for (const a of activities) {
      items.push({
        id: `act-${a.id}`,
        ts: a.occurredAt.toISOString(),
        type: "activity",
        title: a.subject,
        description: a.description || undefined,
        meta: { activityType: a.type },
      });
    }

    // Sort all items by timestamp descending
    items.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());

    return NextResponse.json({ ok: true, items: items.slice(0, 100) });
  } catch (e: any) {
    if (e?.status === 401) return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    if (e?.status === 403) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    console.error("[GET /api/client/timeline]", e);
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }
});
