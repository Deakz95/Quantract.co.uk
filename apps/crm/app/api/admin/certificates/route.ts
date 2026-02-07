import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging, logError } from "@/lib/server/observability";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { randomUUID } from "crypto";
import { isValidCertType } from "@/lib/server/certs/types";
import { getDefaultChecklist } from "@/lib/server/certs/checklists";

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

    // When jobId is provided, scope to that job; otherwise return all certificates
    const where: Record<string, unknown> = { companyId: authCtx.companyId };
    if (jobId) where.jobId = jobId;

    const certificates = await client.certificate.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        job: { select: { id: true, title: true, jobNumber: true } },
        client: { select: { id: true, name: true } },
        site: { select: { id: true, name: true, address1: true, city: true } },
      },
      ...(!jobId ? { take: 500 } : {}),
    });

    // Flatten related data for the client
    const mapped = (certificates || []).map((cert: any) => ({
      ...cert,
      clientName:
        cert.client?.name ||
        (cert.data as any)?.overview?.clientName ||
        undefined,
      siteAddress:
        [cert.site?.address1, cert.site?.city].filter(Boolean).join(", ") ||
        (cert.data as any)?.overview?.installationAddress ||
        undefined,
      jobNumber:
        cert.job?.jobNumber ||
        (cert.job?.title ? `J-${cert.job.id.slice(0, 8)}` : undefined),
      issuedAtISO: cert.issuedAt?.toISOString() ?? undefined,
      completedAtISO: cert.completedAt?.toISOString() ?? undefined,
    }));

    return NextResponse.json({ ok: true, certificates: mapped });
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
    if (!isValidCertType(type)) return NextResponse.json({ ok: false, error: "invalid_type" }, { status: 400 });

    // Verify the job belongs to this company
    const job = await client.job.findFirst({
      where: { id: jobId, companyId: authCtx.companyId },
    });

    if (!job) {
      return NextResponse.json({ ok: false, error: "job_not_found" }, { status: 404 });
    }

    // Get or generate certificate number using {TYPE}-{YEAR}-{SEQ} format
    // Falls back to legacy prefix format if company has a custom prefix set
    const company = await client.company.findUnique({
      where: { id: authCtx.companyId },
      select: { certificateNumberPrefix: true, nextCertificateNumber: true, legalEntities: { where: { isDefault: true }, select: { certificateNumberPrefix: true, nextCertificateNumber: true }, take: 1 } },
    });

    const num = company?.nextCertificateNumber || 1;
    const year = new Date().getFullYear();
    const prefix = company?.certificateNumberPrefix || "CERT-";
    const isDefaultPrefix = !company?.certificateNumberPrefix || company.certificateNumberPrefix === "CERT-";
    const certificateNumber = isDefaultPrefix
      ? `${type}-${year}-${String(num).padStart(3, "0")}`
      : `${prefix}${String(num).padStart(5, "0")}`;

    // Increment next certificate number
    await client.company.update({
      where: { id: authCtx.companyId },
      data: { nextCertificateNumber: num + 1 },
    });

    const certId = randomUUID();
    const certificate = await client.certificate.create({
      data: {
        id: certId,
        companyId: authCtx.companyId,
        jobId,
        type,
        certificateNumber,
        status: "draft",
        updatedAt: new Date(),
      },
    });

    // Populate default checklists for the cert type
    const defaults = getDefaultChecklist(type);
    if (defaults.length > 0) {
      await client.certificateChecklist.createMany({
        data: defaults.map((item, i) => ({
          id: randomUUID(),
          companyId: authCtx.companyId,
          certificateId: certId,
          section: item.section,
          question: item.question,
          sortOrder: item.sortOrder ?? i,
          updatedAt: new Date(),
        })),
      });
    }

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
