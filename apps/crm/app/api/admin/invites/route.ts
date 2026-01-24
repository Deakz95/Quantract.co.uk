import { NextResponse } from "next/server";
import { requireRole, requireCompanyId } from "@/lib/serverAuth";
import { prisma } from "@/lib/server/prisma";
import { withRequestLogging } from "@/lib/server/observability";
import { sendInviteEmail, absoluteUrl } from "@/lib/server/email";
import crypto from "crypto";

export const runtime = "nodejs";

function normEmail(email: string) {
  return email.trim().toLowerCase();
}

export const GET = withRequestLogging(async function GET() {
  try {
    const session = await requireRole("admin");
    if (!session) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    const companyId = await requireCompanyId();
    if (!companyId) return NextResponse.json({ ok: false, error: "No company" }, { status: 400 });

    const invites = await prisma.invite.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return NextResponse.json({ ok: true, invites });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { ok: false, error: "Internal error", message, route: "/api/admin/invites" },
      { status: 500 }
    );
  }
});

export const POST = withRequestLogging(async function POST(req: Request) {
  try {
    const session = await requireRole("admin");
    if (!session) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    const companyId = await requireCompanyId();
    if (!companyId) return NextResponse.json({ ok: false, error: "No company" }, { status: 400 });

    const body = (await req.json().catch(() => null)) as any;
    const role = String(body?.role || "").toLowerCase();
    const email = normEmail(String(body?.email || ""));
    const name = body?.name ? String(body.name) : null;
    const sendEmail = body?.sendEmail !== false; // Default to true

    if (!email || !email.includes("@")) return NextResponse.json({ ok: false, error: "Invalid email" }, { status: 400 });
    if (role !== "client" && role !== "engineer") return NextResponse.json({ ok: false, error: "Invalid role" }, { status: 400 });

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

    const registerPath = role === "client" ? `/client/register?token=${token}` : `/engineer/register?token=${token}`;
    const registerLink = absoluteUrl(registerPath);

    // Send invite email
    let emailSent = false;
    if (sendEmail) {
      try {
        await sendInviteEmail({
          to: email,
          name: name || undefined,
          role: role as "client" | "engineer",
          registerLink,
          companyName,
        });
        emailSent = true;
      } catch (emailError) {
        console.error("Failed to send invite email:", emailError);
        // Don't fail the request, just note email wasn't sent
      }
    }

    return NextResponse.json({
      ok: true,
      invite,
      emailSent,
      links: {
        register: registerPath,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { ok: false, error: "Internal error", message, route: "/api/admin/invites" },
      { status: 500 }
    );
  }
});
