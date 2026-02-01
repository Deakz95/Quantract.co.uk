import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging, logError } from "@/lib/server/observability";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

export const GET = withRequestLogging(async function GET() {
  try {
    // Use requireCompanyContext for company-scoped data access
    const ctx = await requireCompanyContext();
    const effectiveRole = getEffectiveRole(ctx);

    // Only admin and office roles can list all jobs
    if (effectiveRole !== "admin" && effectiveRole !== "office") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const client = getPrisma();
    if (!client) {
      return NextResponse.json({ error: "service_unavailable" }, { status: 503 });
    }

    // IMPORTANT: return the array directly (UI + Playwright expect an array)
    // companyId is guaranteed non-null by requireCompanyContext
    const jobs = await client.job.findMany({
      where: { companyId: ctx.companyId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: {
        client: { select: { id: true, name: true, email: true } },
        site: { select: { id: true, name: true, address1: true, city: true, postcode: true } },
        quote: { select: { id: true, token: true, status: true } },
        engineer: { select: { id: true, name: true, email: true } },
      },
    });

    // Add formatted jobNumber for UI display
    const mapped = (jobs || []).map((j: any) => ({
      ...j,
      jobNumber: j.jobNumber ? `J-${String(j.jobNumber).padStart(4, "0")}` : null,
      description: j.notes || j.title || null,
    }));

    return NextResponse.json(mapped);
  } catch (error: any) {
    // Handle auth errors with appropriate status codes
    if (error?.status === 401) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }
    if (error?.status === 403) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    if (error instanceof PrismaClientKnownRequestError) {
      logError(error, { route: "/api/admin/jobs", action: "list" });
      return NextResponse.json({ error: "database_error", code: error.code }, { status: 409 });
    }
    logError(error, { route: "/api/admin/jobs", action: "list" });
    return NextResponse.json({ error: "load_failed" }, { status: 500 });
  }
});

export const POST = withRequestLogging(async function POST(req: Request) {
  try {
    // Use requireCompanyContext for company-scoped data access
    const ctx = await requireCompanyContext();
    const effectiveRole = getEffectiveRole(ctx);

    // Only admin can create jobs
    if (effectiveRole !== "admin") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const client = getPrisma();
    if (!client) {
      return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });
    }

    const body = (await req.json().catch(() => null)) as {
      quoteId?: string;
      manual?: boolean;
      clientId?: string;
      siteId?: string;
      siteAddress?: string;
      title?: string;
      description?: string;
    };

    // Manual job creation
    if (body?.manual) {
      const clientId = String(body?.clientId ?? "").trim();
      const siteIdInput = String(body?.siteId ?? "").trim();
      const title = String(body?.title ?? "").trim();
      const siteAddress = String(body?.siteAddress ?? "").trim();

      if (!clientId) {
        return NextResponse.json({ ok: false, error: "missing_client_id" }, { status: 400 });
      }
      if (!title) {
        return NextResponse.json({ ok: false, error: "missing_title" }, { status: 400 });
      }

      // Verify client belongs to this company
      const clientRecord = await client.client.findFirst({
        where: { id: clientId, companyId: ctx.companyId },
      });
      if (!clientRecord) {
        return NextResponse.json({ ok: false, error: "client_not_found" }, { status: 404 });
      }

      // Resolve siteId: use provided siteId, or find/create a site for the client
      let siteId = siteIdInput;
      if (!siteId) {
        // Try to find an existing site for this client
        const existingSite = await client.site.findFirst({
          where: { clientId, companyId: ctx.companyId },
          orderBy: { createdAt: "desc" },
        });
        if (existingSite) {
          siteId = existingSite.id;
        } else {
          // Create a default site from the address or client name
          const newSite = await client.site.create({
            data: {
              id: randomUUID(),
              companyId: ctx.companyId,
              clientId,
              name: siteAddress || `${clientRecord.name} - Default Site`,
              address1: siteAddress || "",
              updatedAt: new Date(),
            },
          });
          siteId = newSite.id;
        }
      } else {
        const site = await client.site.findFirst({
          where: { id: siteId, companyId: ctx.companyId },
        });
        if (!site) {
          return NextResponse.json({ ok: false, error: "site_not_found" }, { status: 404 });
        }
      }

      const job = await client.$transaction(async (tx: any) => {
        const co = await tx.company.update({
          where: { id: ctx.companyId },
          data: { nextJobNumber: { increment: 1 } },
          select: { nextJobNumber: true },
        });
        const num = co.nextJobNumber - 1; // value before increment
        return tx.job.create({
          data: {
            id: randomUUID(),
            companyId: ctx.companyId,
            jobNumber: num,
            clientId,
            siteId,
            title,
            notes: body?.description || null,
            status: "pending",
            updatedAt: new Date(),
          },
          include: {
            client: { select: { id: true, name: true } },
            site: { select: { id: true, name: true, address1: true } },
          },
        });
      });

      return NextResponse.json({ ok: true, job: { ...job, jobNumber: `J-${String(job.jobNumber).padStart(4, "0")}` } });
    }

    // From quote
    const quoteId = String(body?.quoteId ?? "").trim();

    if (!quoteId) {
      return NextResponse.json({ ok: false, error: "missing_quote_id" }, { status: 400 });
    }

    // Check if job already exists for this quote
    const existingJob = await client.job.findFirst({
      where: { quoteId, companyId: ctx.companyId },
    });

    if (existingJob) {
      return NextResponse.json({ ok: true, job: existingJob });
    }

    // Get the quote
    const quote = await client.quote.findFirst({
      where: { id: quoteId, companyId: ctx.companyId },
    });

    if (!quote) {
      return NextResponse.json({ ok: false, error: "quote_not_found" }, { status: 404 });
    }

    // Resolve siteId — auto-create if quote doesn't have one
    let quoteSiteId = quote.siteId;
    if (!quoteSiteId) {
      const clientId = quote.clientId;
      if (clientId) {
        const existingSite = await client.site.findFirst({
          where: { clientId, companyId: ctx.companyId },
          orderBy: { createdAt: "desc" },
        });
        if (existingSite) {
          quoteSiteId = existingSite.id;
        } else {
          const clientRecord = await client.client.findFirst({ where: { id: clientId } });
          const newSite = await client.site.create({
            data: {
              id: randomUUID(),
              companyId: ctx.companyId,
              clientId,
              name: `${clientRecord?.name || "Client"} - Default Site`,
              address1: "",
              updatedAt: new Date(),
            },
          });
          quoteSiteId = newSite.id;
        }
      } else {
        return NextResponse.json({ ok: false, error: "quote_missing_client_and_site" }, { status: 400 });
      }
    }

    const job = await client.$transaction(async (tx: any) => {
      const co = await tx.company.update({
        where: { id: ctx.companyId },
        data: { nextJobNumber: { increment: 1 } },
        select: { nextJobNumber: true },
      });
      const num = co.nextJobNumber - 1;
      return tx.job.create({
        data: {
          id: randomUUID(),
          companyId: ctx.companyId,
          jobNumber: num,
          quoteId,
          clientId: quote.clientId,
          siteId: quoteSiteId,
          title: quote.quoteNumber ? `Job — ${quote.quoteNumber}` : (quote.clientName || "Job"),
          status: "pending",
          budgetSubtotal: 0,
          budgetVat: 0,
          budgetTotal: 0,
          updatedAt: new Date(),
        },
        include: {
          client: { select: { id: true, name: true } },
          site: { select: { id: true, name: true, address1: true } },
          quote: { select: { id: true, token: true } },
        },
      });
    });

    return NextResponse.json({ ok: true, job: { ...job, jobNumber: `J-${String(job.jobNumber).padStart(4, "0")}` } });
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError) {
      logError(error, { route: "/api/admin/jobs", action: "create" });
      return NextResponse.json({ ok: false, error: "database_error", code: error.code }, { status: 409 });
    }
    logError(error, { route: "/api/admin/jobs", action: "create" });
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: "create_failed", detail: msg }, { status: 500 });
  }
});
