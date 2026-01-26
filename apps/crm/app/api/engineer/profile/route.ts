import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging, logError } from "@/lib/server/observability";

export const runtime = "nodejs";

/**
 * GET /api/engineer/profile
 * Returns the logged-in engineer's profile information.
 */
export const GET = withRequestLogging(async function GET() {
  try {
    const authCtx = await getAuthContext();
    if (!authCtx) {
      return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    }

    // Engineers and admins can access this endpoint
    if (authCtx.role !== "engineer" && authCtx.role !== "admin") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const client = getPrisma();
    if (!client) {
      return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });
    }

    // Get user data
    const user = await client.user.findUnique({
      where: { id: authCtx.userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ ok: false, error: "user_not_found" }, { status: 404 });
    }

    // Get engineer record if linked
    let engineer = null;
    if (user.role === "engineer") {
      engineer = await client.engineer.findFirst({
        where: {
          OR: [
            { userId: authCtx.userId },
            { email: authCtx.email },
          ],
          companyId: authCtx.companyId,
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          hourlyRate: true,
          skills: true,
          certifications: true,
          notes: true,
          status: true,
          createdAt: true,
        },
      });
    }

    return NextResponse.json({
      ok: true,
      profile: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          role: user.role,
          createdAt: user.createdAt,
        },
        engineer: engineer || null,
      },
    });
  } catch (error) {
    logError(error, { route: "/api/engineer/profile", action: "get" });
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }
});

/**
 * PATCH /api/engineer/profile
 * Update the logged-in engineer's profile.
 */
export const PATCH = withRequestLogging(async function PATCH(req: Request) {
  try {
    const authCtx = await getAuthContext();
    if (!authCtx) {
      return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    }

    if (authCtx.role !== "engineer" && authCtx.role !== "admin") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const client = getPrisma();
    if (!client) {
      return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });
    }

    const body = await req.json().catch(() => ({}));

    // Update user record (limited fields for engineers)
    const updatedUser = await client.user.update({
      where: { id: authCtx.userId },
      data: {
        name: body.name ? String(body.name).trim() : undefined,
        phone: body.phone ? String(body.phone).trim() : undefined,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
      },
    });

    return NextResponse.json({ ok: true, user: updatedUser });
  } catch (error) {
    logError(error, { route: "/api/engineer/profile", action: "update" });
    return NextResponse.json({ ok: false, error: "update_failed" }, { status: 500 });
  }
});
