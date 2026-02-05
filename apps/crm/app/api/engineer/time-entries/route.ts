import { NextResponse } from "next/server";
import { requireRole, getUserEmail, getAuthContext } from "@/lib/serverAuth";
import { addTimeEntry, listTimeEntriesForEngineerWeek } from "@/lib/server/repo";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging } from "@/lib/server/observability";
import { rateLimitEngineerWrite, createRateLimitResponse } from "@/lib/server/rateLimitMiddleware";

export const runtime = "nodejs";

const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export const GET = withRequestLogging(async function GET(req: Request) {
  try {
    await requireRole("engineer");
    const email = await getUserEmail();
    if (!email) return NextResponse.json({ error: "Missing engineer email" }, { status: 401 });
    const url = new URL(req.url);
    const weekStart = url.searchParams.get("weekStart") || new Date().toISOString();
    const rows = await listTimeEntriesForEngineerWeek(email, weekStart);
    return NextResponse.json({ items: rows });
  } catch (err: any) {
    if (err?.status === 401) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    console.error("[engineer/time-entries]", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
});

export const POST = withRequestLogging(async function POST(req: Request) {
  try {
    await requireRole("engineer");
    const email = await getUserEmail();
    if (!email) return NextResponse.json({ error: "Missing engineer email" }, { status: 401 });

    // Rate limit by authenticated user
    const rl = rateLimitEngineerWrite(email);
    if (!rl.ok) return createRateLimitResponse({ error: rl.error!, resetAt: rl.resetAt! });

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
            // Check TTL — if expired, delete and proceed as new
            if (Date.now() - existing.createdAt.getTime() < IDEMPOTENCY_TTL_MS) {
              return NextResponse.json(existing.responseJson as any);
            }
            // Expired — clean up
            await prisma.idempotencyKey.delete({ where: { id: existing.id } }).catch(() => {});
          }
        }
      }
    }

    const body = await req.json().catch(() => ({}));
    const jobId = String(body.jobId || "").trim();
    const startedAtISO = String(body.startedAtISO || "").trim();
    const endedAtISO = body.endedAtISO ? String(body.endedAtISO) : undefined;
    const breakMinutes = Number(body.breakMinutes ?? 0);
    const notes = body.notes ? String(body.notes) : undefined;

    if (!jobId || !startedAtISO) {
      return NextResponse.json({ error: "jobId and startedAtISO are required" }, { status: 400 });
    }

    const created = await addTimeEntry({
      jobId,
      engineerEmail: email,
      startedAtISO,
      endedAtISO,
      breakMinutes,
      notes,
    });
    if (!created) {
      return NextResponse.json({ error: "Failed to create time entry" }, { status: 500 });
    }

    const responseBody = { item: created };

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
            // P2002 = race condition, another request stored it — safe to ignore
            if (e?.code !== "P2002") {
              console.error("[idempotency] store failed", e?.message);
            }
          });
        }
      }
    }

    return NextResponse.json(responseBody);
  } catch (err: any) {
    if (err?.status === 401) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    console.error("[engineer/time-entries]", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
});
