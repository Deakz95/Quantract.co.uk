import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging, logError } from "@/lib/server/observability";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

export const runtime = "nodejs";

export const GET = withRequestLogging(async function GET() {
  try {
    const authCtx = await getAuthContext();
    if (!authCtx) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }

    if (authCtx.role !== "admin") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    if (!authCtx.companyId) {
      return NextResponse.json({ error: "no_company" }, { status: 401 });
    }

    const client = getPrisma();
    if (!client) {
      return NextResponse.json({ error: "service_unavailable" }, { status: 503 });
    }

    // IMPORTANT: return the array directly (UI + Playwright expect an array)
    const jobs = await client.job.findMany({
      where: { companyId: authCtx.companyId },
      orderBy: { createdAt: "desc" },
      include: {
        client: { select: { id: true, name: true, email: true } },
        site: { select: { id: true, name: true, address1: true, city: true, postcode: true } },
        quote: { select: { id: true, quoteNumber: true, total: true } },
        assignedEngineer: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(jobs || []);
  } catch (error) {
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
    const authCtx = await getAuthContext();
    if (!authCtx) {
      return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    }

    if (authCtx.role !== "admin") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    if (!authCtx.companyId) {
      return NextResponse.json({ ok: false, error: "no_company" }, { status: 401 });
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
      title?: string;
      description?: string;
    };

    // Generate job number
    const jobCount = await client.job.count({ where: { companyId: authCtx.companyId } });
    const jobNumber = `JOB-${String(jobCount + 1).padStart(5, "0")}`;

    // Manual job creation
    if (body?.manual) {
      const clientId = String(body?.clientId ?? "").trim();
      const siteId = String(body?.siteId ?? "").trim();
      const title = String(body?.title ?? "").trim();

      if (!clientId) {
        return NextResponse.json({ ok: false, error: "missing_client_id" }, { status: 400 });
      }
      if (!siteId) {
        return NextResponse.json({ ok: false, error: "missing_site_id" }, { status: 400 });
      }
      if (!title) {
        return NextResponse.json({ ok: false, error: "missing_title" }, { status: 400 });
      }

      // Verify client and site belong to this company
      const clientRecord = await client.client.findFirst({
        where: { id: clientId, companyId: authCtx.companyId },
      });
      if (!clientRecord) {
        return NextResponse.json({ ok: false, error: "client_not_found" }, { status: 404 });
      }

      const site = await client.site.findFirst({
        where: { id: siteId, companyId: authCtx.companyId },
      });
      if (!site) {
        return NextResponse.json({ ok: false, error: "site_not_found" }, { status: 404 });
      }

      const job = await client.job.create({
        data: {
          companyId: authCtx.companyId,
          jobNumber,
          clientId,
          siteId,
          title,
          description: body?.description || null,
          status: "pending",
        },
        include: {
          client: { select: { id: true, name: true } },
          site: { select: { id: true, name: true, address1: true } },
        },
      });

      return NextResponse.json({ ok: true, job });
    }

    // From quote
    const quoteId = String(body?.quoteId ?? "").trim();

    if (!quoteId) {
      return NextResponse.json({ ok: false, error: "missing_quote_id" }, { status: 400 });
    }

    // Check if job already exists for this quote
    const existingJob = await client.job.findFirst({
      where: { quoteId, companyId: authCtx.companyId },
    });

    if (existingJob) {
      return NextResponse.json({ ok: true, job: existingJob });
    }

    // Get the quote
    const quote = await client.quote.findFirst({
      where: { id: quoteId, companyId: authCtx.companyId },
    });

    if (!quote) {
      return NextResponse.json({ ok: false, error: "quote_not_found" }, { status: 404 });
    }

    if (!quote.siteId) {
      return NextResponse.json({ ok: false, error: "quote_missing_site" }, { status: 400 });
    }

    const job = await client.job.create({
      data: {
        companyId: authCtx.companyId,
        jobNumber,
        quoteId,
        clientId: quote.clientId,
        siteId: quote.siteId,
        title: `Job from Quote ${quote.quoteNumber || quoteId}`,
        status: "pending",
        budgetSubtotal: quote.subtotal,
        budgetVat: quote.vat,
        budgetTotal: quote.total,
      },
      include: {
        client: { select: { id: true, name: true } },
        site: { select: { id: true, name: true, address1: true } },
        quote: { select: { id: true, quoteNumber: true } },
      },
    });

    return NextResponse.json({ ok: true, job });
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError) {
      logError(error, { route: "/api/admin/jobs", action: "create" });
      return NextResponse.json({ ok: false, error: "database_error", code: error.code }, { status: 409 });
    }
    logError(error, { route: "/api/admin/jobs", action: "create" });
    return NextResponse.json({ ok: false, error: "create_failed" }, { status: 500 });
  }
});
