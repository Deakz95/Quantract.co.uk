import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging, logCriticalAction, logError } from "@/lib/server/observability";
import { sendInviteEmail, absoluteUrl } from "@/lib/server/email";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import crypto from "crypto";

export const runtime = "nodejs";

function normEmail(email: string) {
  return email.trim().toLowerCase();
}

export const GET = withRequestLogging(async function GET() {
  try {
    const authCtx = await requireCompanyContext();
    const effectiveRole = getEffectiveRole(authCtx);
    if (effectiveRole !== "admin" && effectiveRole !== "office") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });
    }

    const invites = await prisma.invite.findMany({
      where: { companyId: authCtx.companyId },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return NextResponse.json({ ok: true, invites: invites || [] });
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError) {
      logError(error, { route: "/api/admin/invites", action: "list" });
      return NextResponse.json({ ok: false, error: "database_error", code: error.code }, { status: 409 });
    }
    logError(error, { route: "/api/admin/invites", action: "list" });
    const err = error as any;
    if (err?.status === 401 || err?.status === 403) {
      return NextResponse.json({ ok: false, error: err.message || "forbidden" }, { status: err.status });
    }
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

    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });
    }

    const companyId = authCtx.companyId;

    const body = (await req.json().catch(() => null)) as any;
    const role = String(body?.role || "").toLowerCase();
    const email = normEmail(String(body?.email || ""));
    const name = body?.name ? String(body.name) : null;
    const sendEmail = body?.sendEmail !== false; // Default to true

    if (!email || !email.includes("@")) return NextResponse.json({ ok: false, error: "Invalid email" }, { status: 400 });
    const validRoles = ["client", "engineer", "admin", "office"];
    if (!validRoles.includes(role)) return NextResponse.json({ ok: false, error: "Invalid role" }, { status: 400 });

    // Only admins can invite admin/office roles
    if ((role === "admin" || role === "office") && effectiveRole !== "admin") {
      return NextResponse.json({ ok: false, error: "Only admins can invite admin or office users" }, { status: 403 });
    }

    const token = crypto.randomBytes(24).toString("hex");
    // ✅ MANDATORY: 7-day expiry for all invites (production requirement)
    const expiresAt = new Date(Date.now() + 7 * 86400000);

    const invite = await prisma.invite.create({
      data: { companyId, role, email, name, token, expiresAt },
    });

    // Get company name for email
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { brandName: true, name: true },
    });
    const companyName = company?.brandName || company?.name || "Quantract";

    const registerPaths: Record<string, string> = {
      client: `/client/register?token=${token}`,
      engineer: `/engineer/register?token=${token}`,
      admin: `/admin/register?token=${token}`,
      office: `/admin/register?token=${token}`,
    };
    const registerPath = registerPaths[role] || `/admin/register?token=${token}`;
    const registerLink = absoluteUrl(registerPath);

    // Send invite email
    let emailSent = false;
    if (sendEmail) {
      try {
        await sendInviteEmail({
          to: email,
          name: name || undefined,
          role: role as "client" | "engineer" | "admin" | "office",
          registerLink,
          companyName,
        });
        emailSent = true;
      } catch (emailError) {
        console.error("Failed to send invite email:", emailError);
        // Don't fail the request, just note email wasn't sent
      }
    }

    logCriticalAction({
      name: "user.invited",
      companyId,
      userId: authCtx.userId,
      actorId: authCtx.userId,
      metadata: { inviteId: invite.id, email, role, emailSent },
    });

    return NextResponse.json({
      ok: true,
      invite,
      emailSent,
      links: {
        register: registerPath,
      },
    });
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError) {
      logError(error, { route: "/api/admin/invites", action: "create" });
      return NextResponse.json({ ok: false, error: "database_error", code: error.code }, { status: 409 });
    }
    logError(error, { route: "/api/admin/invites", action: "create" });
    const err = error as any;
    if (err?.status === 401 || err?.status === 403) {
      return NextResponse.json({ ok: false, error: err.message || "forbidden" }, { status: err.status });
    }
    return NextResponse.json({ ok: false, error: "create_failed" }, { status: 500 });
  }
});
