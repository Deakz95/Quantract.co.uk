import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging } from "@/lib/server/observability";
import { getRouteParams } from "@/lib/server/routeParams";
import { rateLimit, getClientIp } from "@/lib/server/rateLimit";

export const runtime = "nodejs";

/**
 * Simple polling-based signalling for WebRTC.
 * Both peers POST their signals and GET the other's signals.
 * Token-authenticated (no login required for client side).
 */

export const GET = withRequestLogging(async function GET(req: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  try {
    // Rate limit polling: 60/min per IP
    const ip = getClientIp(req);
    const rl = rateLimit({ key: `assist-poll:${ip}`, limit: 60, windowMs: 60_000 });
    if (!rl.ok) return NextResponse.json({ ok: false, error: "rate_limit_exceeded" }, { status: 429 });

    const { sessionId } = await getRouteParams(ctx);
    const prisma = getPrisma();
    if (!prisma) return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });

    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    const role = url.searchParams.get("role"); // "engineer" or "client"

    const session = await prisma.remoteAssistSession.findFirst({
      where: { id: sessionId, ...(token ? { token } : {}) },
    });

    if (!session) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    if (new Date() > session.expiresAt) return NextResponse.json({ ok: false, error: "expired" }, { status: 410 });

    const signals = (session.signals as any) || {};
    const otherRole = role === "engineer" ? "client" : "engineer";

    return NextResponse.json({
      ok: true,
      data: {
        status: session.status,
        signals: signals[otherRole] || [],
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }
});

export const POST = withRequestLogging(async function POST(req: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  try {
    // Rate limit signalling: 30/min per IP
    const ip = getClientIp(req);
    const rl = rateLimit({ key: `assist-signal:${ip}`, limit: 30, windowMs: 60_000 });
    if (!rl.ok) return NextResponse.json({ ok: false, error: "rate_limit_exceeded" }, { status: 429 });

    const { sessionId } = await getRouteParams(ctx);
    const prisma = getPrisma();
    if (!prisma) return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });

    const body = await req.json().catch(() => null);
    if (!body?.role || !body?.signal) {
      return NextResponse.json({ ok: false, error: "role and signal required" }, { status: 400 });
    }

    const session = await prisma.remoteAssistSession.findFirst({
      where: { id: sessionId, ...(body.token ? { token: body.token } : {}) },
    });

    if (!session) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    if (new Date() > session.expiresAt) return NextResponse.json({ ok: false, error: "expired" }, { status: 410 });

    const signals = (session.signals as any) || {};
    const roleSignals = signals[body.role] || [];
    roleSignals.push(body.signal);
    // Keep only last 50 signals per role
    if (roleSignals.length > 50) roleSignals.splice(0, roleSignals.length - 50);
    signals[body.role] = roleSignals;

    await prisma.remoteAssistSession.update({
      where: { id: sessionId },
      data: {
        signals,
        status: session.status === "waiting" ? "connected" : session.status,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "signal_failed" }, { status: 500 });
  }
});
