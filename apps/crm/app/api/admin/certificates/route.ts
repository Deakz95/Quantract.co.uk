import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging, logError } from "@/lib/server/observability";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

export const GET = withRequestLogging(async function GET(req: Request) {
  try {
    const authCtx = await requireCompanyContext();
    const effectiveRole = getEffectiveRole(authCtx);
    if (effectiveRole !== "admin" && effectiveRole !== "office") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const client = getPrisma();
    if (!client) {
      return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });
    }

    const url = new URL(req.url);
    const jobId = String(url.searchParams.get("jobId") ?? "").trim();
    if (!jobId) return NextResponse.json({ ok: true, certificates: [] });

    const certificates = await client.certificate.findMany({
      where: { jobId, companyId: authCtx.companyId },
      orderBy: { createdAt: "desc" },
      include: {
        job: { select: { id: true, title: true } },
      },
    });

    return NextResponse.json({ ok: true, certificates: certificates || [] });
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError) {
      logError(error, { route: "/api/admin/certificates", action: "list" });
      return NextResponse.json({ ok: false, error: "database_error", code: error.code }, { status: 409 });
    }
    const err = error as any;
    if (err?.status === 401 || err?.status === 403) {
      return NextResponse.json({ ok: false, error: err.message || "forbidden" }, { status: err.status });
    }
    logError(error, { route: "/api/admin/certificates", action: "list" });
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }
});

export const POST = withRequestLogging(async function POST(req: Request) {
  try {
    const authCtx = await requireCompanyContext();
    const effectiveRole = getEffectiveRole(authCtx);
    if (effectiveRole !== "admin" && effectiveRole !== "office") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const client = getPrisma();
    if (!client) {
      return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });
    }

    const body = (await req.json().catch(() => null)) as any;
    const jobId = String(body?.jobId ?? "").trim();
    const type = String(body?.type ?? "").trim();

    if (!jobId) return NextResponse.json({ ok: false, error: "missing_job_id" }, { status: 400 });
    if (!type) return NextResponse.json({ ok: false, error: "missing_type" }, { status: 400 });

    // Verify the job belongs to this company
    const job = await client.job.findFirst({
      where: { id: jobId, companyId: authCtx.companyId },
    });

    if (!job) {
      return NextResponse.json({ ok: false, error: "job_not_found" }, { status: 404 });
    }

    // Get or generate certificate number
    const company = await client.company.findUnique({
      where: { id: authCtx.companyId },
      select: { certificateNumberPrefix: true, nextCertificateNumber: true },
    });

    const prefix = company?.certificateNumberPrefix || "CERT-";
    const num = company?.nextCertificateNumber || 1;
    const certificateNumber = `${prefix}${String(num).padStart(5, "0")}`;

    // Increment next certificate number
    await client.company.update({
      where: { id: authCtx.companyId },
      data: { nextCertificateNumber: num + 1 },
    });

    const certificate = await client.certificate.create({
      data: {
        id: randomUUID(),
        companyId: authCtx.companyId,
        jobId,
        type,
        certificateNumber,
        status: "draft",
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true, certificate });
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError) {
      logError(error, { route: "/api/admin/certificates", action: "create" });
      return NextResponse.json({ ok: false, error: "database_error", code: error.code }, { status: 409 });
    }
    const err = error as any;
    if (err?.status === 401 || err?.status === 403) {
      return NextResponse.json({ ok: false, error: err.message || "forbidden" }, { status: err.status });
    }
    logError(error, { route: "/api/admin/certificates", action: "create" });
    return NextResponse.json({ ok: false, error: "create_failed" }, { status: 500 });
  }
});
