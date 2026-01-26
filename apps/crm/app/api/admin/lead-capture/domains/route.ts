import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { requireRole, requireCompanyId } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging } from "@/lib/server/observability";

export const runtime = "nodejs";

/**
 * GET /api/admin/lead-capture/domains
 * List all allowed domains for lead capture.
 */
export const GET = withRequestLogging(async function GET() {
  try {
    await requireRole("admin");
  } catch {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const companyId = await requireCompanyId();
  const client = getPrisma();
  if (!client) {
    return NextResponse.json({ ok: false, error: "prisma_disabled" }, { status: 400 });
  }

  const domains = await client.allowedDomain.findMany({
    where: { companyId },
    orderBy: [{ isActive: "desc" }, { domain: "asc" }],
  });

  return NextResponse.json({ ok: true, domains });
});

/**
 * POST /api/admin/lead-capture/domains
 * Add a new allowed domain.
 */
export const POST = withRequestLogging(async function POST(req: Request) {
  try {
    await requireRole("admin");
  } catch {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const companyId = await requireCompanyId();
  const client = getPrisma();
  if (!client) {
    return NextResponse.json({ ok: false, error: "prisma_disabled" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));

  let domain = String(body.domain ?? "").trim().toLowerCase();
  if (!domain) {
    return NextResponse.json({ ok: false, error: "missing_domain" }, { status: 400 });
  }

  // Normalize domain - remove protocol and trailing slash
  domain = domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "");

  // Basic domain validation
  const domainRegex = /^(\*\.)?[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/;
  if (!domainRegex.test(domain)) {
    return NextResponse.json({ ok: false, error: "invalid_domain_format" }, { status: 400 });
  }

  // Check for duplicate
  const existing = await client.allowedDomain.findFirst({
    where: { companyId, domain },
  });
  if (existing) {
    return NextResponse.json({ ok: false, error: "duplicate_domain" }, { status: 400 });
  }

  const allowedDomain = await client.allowedDomain.create({
    data: {
      id: randomUUID(),
      companyId,
      domain,
      isActive: true,
      updatedAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true, domain: allowedDomain }, { status: 201 });
});
