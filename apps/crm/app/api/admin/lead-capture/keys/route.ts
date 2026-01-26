import { NextResponse } from "next/server";
import { randomUUID, randomBytes, createHmac } from "crypto";
import { requireRole, requireCompanyId } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging } from "@/lib/server/observability";

export const runtime = "nodejs";

const KEY_SECRET = process.env.INBOUND_KEY_SECRET || "qt-inbound-key-secret";

/**
 * Generate a new API key.
 * Format: qt_live_[32 random hex chars]
 */
function generateApiKey(): { key: string; hash: string; prefix: string } {
  const randomPart = randomBytes(16).toString("hex");
  const key = `qt_live_${randomPart}`;
  const hash = createHmac("sha256", KEY_SECRET).update(key).digest("hex");
  const prefix = key.slice(0, 16); // "qt_live_" + first 8 hex chars

  return { key, hash, prefix };
}

/**
 * GET /api/admin/lead-capture/keys
 * List all integration keys.
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

  const keys = await client.inboundIntegrationKey.findMany({
    where: { companyId },
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      permissions: true,
      isActive: true,
      expiresAt: true,
      lastUsedAt: true,
      usageCount: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ ok: true, keys });
});

/**
 * POST /api/admin/lead-capture/keys
 * Create a new integration key.
 * Returns the actual key only once - it cannot be retrieved later.
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

  const name = String(body.name ?? "").trim();
  if (!name) {
    return NextResponse.json({ ok: false, error: "missing_name" }, { status: 400 });
  }

  // Check for duplicate name
  const existing = await client.inboundIntegrationKey.findFirst({
    where: { companyId, name },
  });
  if (existing) {
    return NextResponse.json({ ok: false, error: "duplicate_name" }, { status: 400 });
  }

  // Generate the key
  const { key, hash, prefix } = generateApiKey();

  // Parse optional expiration
  let expiresAt: Date | null = null;
  if (body.expiresAt) {
    expiresAt = new Date(body.expiresAt);
    if (isNaN(expiresAt.getTime())) {
      return NextResponse.json({ ok: false, error: "invalid_expiration_date" }, { status: 400 });
    }
  }

  const integrationKey = await client.inboundIntegrationKey.create({
    data: {
      id: randomUUID(),
      companyId,
      name,
      keyHash: hash,
      keyPrefix: prefix,
      permissions: body.permissions || "enquiry:create",
      isActive: true,
      expiresAt,
      updatedAt: new Date(),
    },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      permissions: true,
      isActive: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  // Return the actual key only this one time
  return NextResponse.json(
    {
      ok: true,
      key: integrationKey,
      secret: key, // This is the only time the full key is shown
      warning: "Save this key securely. It cannot be retrieved later.",
    },
    { status: 201 }
  );
});
