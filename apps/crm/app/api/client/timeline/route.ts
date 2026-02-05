import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging } from "@/lib/server/observability";
import { requireClientOrPortalSession } from "@/lib/server/portalAuth";

export const runtime = "nodejs";

type TimelineItem = {
  id: string;
  ts: string;
  type: "job" | "job_completed" | "invoice" | "invoice_paid" | "certificate" | "quote";
  title: string;
  subtitle?: string;
  status: string;
  amountPence?: number;
  currency?: "GBP";
  href?: string;
  pdfHref?: string;
  certType?: string;
  issuedDate?: string;
  expiryDate?: string;
  subtotal?: number;
  vat?: number;
  total?: number;
  siteName?: string;
};

const CERT_LABELS: Record<string, string> = {
  EIC: "Electrical Installation Certificate",
  EICR: "Electrical Condition Report",
  MWC: "Minor Works Certificate",
  BS7671: "BS 7671 Certificate",
};

/**
 * GET /api/client/timeline
 * Unified timeline feed: Jobs, Invoices (non-draft), Certificates (issued), Quotes.
 */
export const GET = withRequestLogging(async function GET() {
  try {
    const ctx = await requireClientOrPortalSession();
    const { clientId, companyId } = ctx;
    const email = ctx.clientEmail;

    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });
    }
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
        updatedAt: true,
        site: { select: { name: true, address1: true, city: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }).catch(() => []);

    for (const j of jobs) {
      const location = [j.site?.name, j.site?.address1, j.site?.city].filter(Boolean).join(", ");
      const jobTitle = j.title || (j.jobNumber ? `Job #${j.jobNumber}` : "Job");

      // Always add the job creation event
      items.push({
        id: `job-${j.id}`,
        ts: j.createdAt.toISOString(),
        type: "job",
        title: jobTitle,
        subtitle: location || undefined,
        status: j.status,
        siteName: j.site?.name || undefined,
      });

      // If completed, add a separate completion event
      if (j.status === "completed" || j.status === "closed") {
        items.push({
          id: `job-done-${j.id}`,
          ts: j.updatedAt.toISOString(),
          type: "job_completed",
          title: "Work Completed",
          subtitle: jobTitle + (location ? ` — ${j.site?.name}` : ""),
          status: "completed",
          siteName: j.site?.name || undefined,
        });
      }
    }

    // ── Invoices (exclude drafts) ──
    const invoices = await prisma.invoice.findMany({
      where: { companyId, clientEmail: email, status: { not: "draft" }, deletedAt: null },
      select: {
        id: true,
        invoiceNumber: true,
        status: true,
        subtotal: true,
        vat: true,
        total: true,
        token: true,
        createdAtISO: true,
        paidAt: true,
      },
      orderBy: { createdAtISO: "desc" },
      take: 50,
    }).catch(() => []);

    for (const inv of invoices) {
      // Invoice issued event
      items.push({
        id: `inv-${inv.id}`,
        ts: inv.createdAtISO,
        type: "invoice",
        title: inv.invoiceNumber ? `Invoice ${inv.invoiceNumber}` : "Invoice",
        status: inv.status,
        amountPence: Math.round(inv.total * 100),
        currency: "GBP",
        subtotal: inv.subtotal,
        vat: inv.vat,
        total: inv.total,
        href: inv.token ? `/client/invoices/${inv.token}` : undefined,
        pdfHref: inv.token ? `/api/client/invoices/${inv.token}/pdf` : undefined,
      });

      // If paid, add a separate payment event
      if (inv.status === "paid" && inv.paidAt) {
        items.push({
          id: `inv-paid-${inv.id}`,
          ts: inv.paidAt.toISOString(),
          type: "invoice_paid",
          title: "Payment Received",
          subtitle: inv.invoiceNumber ? `Invoice ${inv.invoiceNumber}` : "Invoice",
          status: "paid",
          amountPence: Math.round(inv.total * 100),
          currency: "GBP",
          total: inv.total,
          href: inv.token ? `/client/invoices/${inv.token}` : undefined,
        });
      }
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
        issuedAt: true,
        job: { select: { title: true, site: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }).catch(() => []);

    for (const c of certs) {
      const friendlyType = CERT_LABELS[c.type] || `${c.type} Certificate`;
      const siteName = c.job?.site?.name;
      items.push({
        id: `cert-${c.id}`,
        ts: (c.issuedAt || c.createdAt).toISOString(),
        type: "certificate",
        title: friendlyType,
        subtitle: siteName || c.job?.title || undefined,
        status: c.status,
        certType: c.type,
        issuedDate: (c.issuedAt || c.createdAt).toISOString(),
        pdfHref: `/api/client/certificates/${c.id}/pdf`,
        siteName: siteName || undefined,
      });
    }

    // ── Quotes (sent/accepted only) ──
    const quotes = await prisma.quote.findMany({
      where: {
        companyId,
        clientEmail: email,
        status: { in: ["sent", "accepted"] },
        deletedAt: null,
      },
      select: {
        id: true,
        quoteNumber: true,
        status: true,
        token: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }).catch(() => []);

    for (const q of quotes) {
      items.push({
        id: `quote-${q.id}`,
        ts: q.createdAt.toISOString(),
        type: "quote",
        title: q.quoteNumber ? `Quote ${q.quoteNumber}` : "Quote",
        status: q.status,
        href: q.token ? `/client/quotes/${q.token}` : undefined,
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
