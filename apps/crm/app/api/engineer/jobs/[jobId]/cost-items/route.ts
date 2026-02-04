import { NextResponse } from "next/server";
import { requireRole, getUserEmail, getAuthContext } from "@/lib/serverAuth";
import * as repo from "@/lib/server/repo";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging } from "@/lib/server/observability";

const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export const GET = withRequestLogging(async function GET(
  _req: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    await requireRole("engineer");
    const email = await getUserEmail();
    if (!email)
      return NextResponse.json({ ok: false, error: "Missing engineer email" }, { status: 401 });

    const { jobId } = await params;
    const job = await repo.getJobForEngineer(jobId, email);
    if (!job)
      return NextResponse.json({ ok: false, error: "Job not found or not assigned to you" }, { status: 404 });

    const items = await repo.listCostItems(jobId);
    return NextResponse.json({ ok: true, costItems: items });
  } catch (e: any) {
    if (e?.status === 401) return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    console.error("[GET /api/engineer/jobs/[jobId]/cost-items]", e);
    return NextResponse.json({ ok: false, error: "Something went wrong." }, { status: 500 });
  }
});

export const POST = withRequestLogging(async function POST(
  req: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    await requireRole("engineer");
    const email = await getUserEmail();
    if (!email)
      return NextResponse.json({ ok: false, error: "Missing engineer email" }, { status: 401 });

    const { jobId } = await params;
    const job = await repo.getJobForEngineer(jobId, email);
    if (!job)
      return NextResponse.json({ ok: false, error: "Job not found or not assigned to you" }, { status: 404 });

    const idempotencyKey = req.headers.get("idempotency-key")?.trim() || null;

    // Check idempotency key if provided
    if (idempotencyKey) {
      const ctx = await getAuthContext();
      if (ctx?.companyId && ctx?.userId) {
        const prisma = getPrisma();
        if (prisma) {
          const existing = await prisma.idempotencyKey.findUnique({
            where: {
              companyId_userId_key: {
                companyId: ctx.companyId,
                userId: ctx.userId,
                key: idempotencyKey,
              },
            },
          }).catch(() => null);

          if (existing) {
            if (Date.now() - existing.createdAt.getTime() < IDEMPOTENCY_TTL_MS) {
              return NextResponse.json(existing.responseJson as any);
            }
            await prisma.idempotencyKey.delete({ where: { id: existing.id } }).catch(() => {});
          }
        }
      }
    }

    const body = (await req.json().catch(() => null)) as any;
    const description = String(body?.description ?? "").trim();
    const type = String(body?.type ?? "material").trim();
    if (!description)
      return NextResponse.json({ ok: false, error: "Missing description" }, { status: 400 });

    const item = await repo.addCostItem({
      jobId,
      type: type as any,
      supplier: typeof body?.supplier === "string" ? body.supplier : undefined,
      description,
      quantity: typeof body?.quantity === "number" ? body.quantity : undefined,
      unitCost: typeof body?.unitCost === "number" ? body.unitCost : undefined,
      source: "engineer",
    });
    if (!item)
      return NextResponse.json({ ok: false, error: "Could not create cost item" }, { status: 500 });

    const responseBody = { ok: true, item };

    // Store idempotency key
    if (idempotencyKey) {
      const ctx = await getAuthContext();
      if (ctx?.companyId && ctx?.userId) {
        const prisma = getPrisma();
        if (prisma) {
          await prisma.idempotencyKey.create({
            data: {
              companyId: ctx.companyId,
              userId: ctx.userId,
              key: idempotencyKey,
              responseJson: responseBody as any,
            },
          }).catch((e: any) => {
            if (e?.code !== "P2002") {
              console.error("[idempotency] store failed", e?.message);
            }
          });
        }
      }
    }

    return NextResponse.json(responseBody);
  } catch (e: any) {
    if (e?.status === 401) return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    console.error("[POST /api/engineer/jobs/[jobId]/cost-items]", e);
    return NextResponse.json({ ok: false, error: "Something went wrong." }, { status: 500 });
  }
});
