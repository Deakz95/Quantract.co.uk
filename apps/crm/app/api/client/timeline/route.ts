import { NextResponse } from "next/server";
import { requireRole, getUserEmail } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging } from "@/lib/server/observability";

export const runtime = "nodejs";

type TimelineItem = {
  id: string;
  ts: string;
  type: "job" | "invoice" | "certificate";
  title: string;
  subtitle?: string;
  status: string;
  amountPence?: number;
  currency?: "GBP";
  href?: string;
  pdfHref?: string;
};

/**
 * GET /api/client/timeline
 * Unified timeline feed: Jobs, Invoices (non-draft), Certificates (issued).
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

    const client = await prisma.client.findFirst({
      where: { email },
      select: { id: true, companyId: true },
    });

    if (!client) {
      return NextResponse.json({ ok: true, items: [] });
    }

    const { id: clientId, companyId } = client;
    const items: TimelineItem[] = [];

    // ── Jobs ──
    const jobs = await prisma.job.findMany({
      where: { companyId, clientId, deletedAt: null },
      select: {
        id: true,
        title: true,
        jobNumber: true,
        status: true,
        createdAt: true,
        site: { select: { name: true, address1: true, city: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }).catch(() => []);

    for (const j of jobs) {
      const location = [j.site?.name, j.site?.address1, j.site?.city].filter(Boolean).join(", ");
      items.push({
        id: `job-${j.id}`,
        ts: j.createdAt.toISOString(),
        type: "job",
        title: j.title || (j.jobNumber ? `Job #${j.jobNumber}` : "Job"),
        subtitle: location || undefined,
        status: j.status,
      });
    }

    // ── Invoices (exclude drafts) ──
    const invoices = await prisma.invoice.findMany({
      where: { companyId, clientEmail: email, status: { not: "draft" }, deletedAt: null },
      select: {
        id: true,
        invoiceNumber: true,
        status: true,
        total: true,
        token: true,
        createdAtISO: true,
      },
      orderBy: { createdAtISO: "desc" },
      take: 50,
    }).catch(() => []);

    for (const inv of invoices) {
      items.push({
        id: `inv-${inv.id}`,
        ts: inv.createdAtISO,
        type: "invoice",
        title: inv.invoiceNumber ? `Invoice ${inv.invoiceNumber}` : "Invoice",
        subtitle: `£${inv.total.toFixed(2)}`,
        status: inv.status,
        amountPence: Math.round(inv.total * 100),
        currency: "GBP",
        href: inv.token ? `/client/invoices/${inv.token}` : undefined,
        pdfHref: inv.token ? `/api/client/invoices/${inv.token}/pdf` : undefined,
      });
    }

    // ── Certificates (issued with PDF) ──
    const certs = await prisma.certificate.findMany({
      where: { companyId, job: { clientId }, status: "issued", pdfKey: { not: null } },
      select: {
        id: true,
        type: true,
        certificateNumber: true,
        status: true,
        createdAt: true,
        job: { select: { title: true, site: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }).catch(() => []);

    for (const c of certs) {
      const siteName = c.job?.site?.name;
      items.push({
        id: `cert-${c.id}`,
        ts: c.createdAt.toISOString(),
        type: "certificate",
        title: `${c.type} Certificate${c.certificateNumber ? ` ${c.certificateNumber}` : ""}`,
        subtitle: siteName || c.job?.title || undefined,
        status: c.status,
        pdfHref: `/api/client/certificates/${c.id}/pdf`,
      });
    }

    // Sort descending by timestamp
    items.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());

    return NextResponse.json({ ok: true, items: items.slice(0, 100) });
  } catch (e: any) {
    if (e?.status === 401) return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    if (e?.status === 403) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }
});
