import { NextResponse } from "next/server";
import { requireRoles, getCompanyId } from "@/lib/serverAuth";
import { prisma } from "@/lib/server/prisma";

export async function GET(req: Request) {
  const session = await requireRoles("admin");
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const companyId = await getCompanyId();
  if (!companyId) {
    return NextResponse.json({ ok: false, error: "Company not found" }, { status: 401 });
  }

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim().toLowerCase() || "";
  const typesParam = url.searchParams.get("types") || "client,quote,invoice,job,contact,deal";
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "20", 10), 100);

  if (!q) {
    return NextResponse.json({ ok: true, results: [], total: 0 });
  }

  const types = typesParam.split(",").map((t) => t.trim()).filter(Boolean);
  const results: Array<{ type: string; id: string; title: string; subtitle: string; url: string }> = [];

  // Search Clients
  if (types.includes("client")) {
    const clients = await prisma.client.findMany({
      where: {
        companyId,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { id: { contains: q, mode: "insensitive" } },
        ],
      },
      take: limit,
      orderBy: { updatedAt: "desc" },
    });

    for (const c of clients) {
      results.push({
        type: "client",
        id: c.id,
        title: c.name,
        subtitle: c.email,
        url: `/admin/clients/${c.id}`,
      });
    }
  }

  // Search Quotes
  if (types.includes("quote")) {
    const quotes = await prisma.quote.findMany({
      where: {
        companyId,
        OR: [
          { clientName: { contains: q, mode: "insensitive" } },
          { clientEmail: { contains: q, mode: "insensitive" } },
          { id: { contains: q, mode: "insensitive" } },
          { token: { contains: q, mode: "insensitive" } },
        ],
      },
      include: {
        client: { select: { name: true } },
      },
      take: limit,
      orderBy: { updatedAt: "desc" },
    });

    for (const quote of quotes) {
      results.push({
        type: "quote",
        id: quote.id,
        title: quote.clientName || quote.client?.name || `Quote ${quote.id.slice(0, 8)}`,
        subtitle: `${quote.status} - ${quote.clientEmail}`,
        url: `/admin/quotes/${quote.id}`,
      });
    }
  }

  // Search Invoices
  if (types.includes("invoice")) {
    const invoices = await prisma.invoice.findMany({
      where: {
        companyId,
        OR: [
          { clientName: { contains: q, mode: "insensitive" } },
          { clientEmail: { contains: q, mode: "insensitive" } },
          { invoiceNumber: { contains: q, mode: "insensitive" } },
          { id: { contains: q, mode: "insensitive" } },
          { token: { contains: q, mode: "insensitive" } },
        ],
      },
      include: {
        client: { select: { name: true } },
      },
      take: limit,
      orderBy: { updatedAt: "desc" },
    });

    for (const inv of invoices) {
      results.push({
        type: "invoice",
        id: inv.id,
        title: inv.invoiceNumber || `Invoice ${inv.id.slice(0, 8)}`,
        subtitle: `${inv.status} - ${inv.clientName || inv.client?.name || inv.clientEmail}`,
        url: `/admin/invoices/${inv.id}`,
      });
    }
  }

  // Search Jobs
  if (types.includes("job")) {
    const jobs = await prisma.job.findMany({
      where: {
        companyId,
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { id: { contains: q, mode: "insensitive" } },
        ],
      },
      include: {
        client: { select: { name: true } },
        site: { select: { name: true, postcode: true } },
      },
      take: limit,
      orderBy: { updatedAt: "desc" },
    });

    for (const j of jobs) {
      const siteInfo = j.site ? (j.site.name || j.site.postcode || "") : "";
      results.push({
        type: "job",
        id: j.id,
        title: j.title || `Job ${j.id.slice(0, 8)}`,
        subtitle: j.client?.name || siteInfo,
        url: `/admin/jobs/${j.id}`,
      });
    }
  }

  // Search Contacts
  if (types.includes("contact")) {
    const contacts = await prisma.contact.findMany({
      where: {
        companyId,
        OR: [
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { id: { contains: q, mode: "insensitive" } },
        ],
      },
      take: limit,
      orderBy: { updatedAt: "desc" },
    });

    for (const c of contacts) {
      results.push({
        type: "contact",
        id: c.id,
        title: `${c.firstName} ${c.lastName}`.trim(),
        subtitle: c.email || c.phone || "",
        url: `/admin/contacts/${c.id}`,
      });
    }
  }

  // Search Deals
  if (types.includes("deal")) {
    const deals = await prisma.deal.findMany({
      where: {
        companyId,
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { id: { contains: q, mode: "insensitive" } },
        ],
      },
      include: {
        client: { select: { name: true } },
        contact: { select: { firstName: true, lastName: true } },
      },
      take: limit,
      orderBy: { updatedAt: "desc" },
    });

    for (const d of deals) {
      const contactName = d.contact ? `${d.contact.firstName} ${d.contact.lastName}`.trim() : "";
      results.push({
        type: "deal",
        id: d.id,
        title: d.title,
        subtitle: d.client?.name || contactName || "",
        url: `/admin/deals/${d.id}`,
      });
    }
  }

  // Sort by relevance (exact matches first) and limit
  const sortedResults = results
    .sort((a, b) => {
      const aExact = a.title.toLowerCase() === q ? 0 : 1;
      const bExact = b.title.toLowerCase() === q ? 0 : 1;
      return aExact - bExact;
    })
    .slice(0, limit);

  return NextResponse.json({
    ok: true,
    results: sortedResults,
    total: sortedResults.length,
  });
}
