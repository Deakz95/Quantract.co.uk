import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { withRequestLogging } from "@/lib/server/observability";
import { getRouteParams } from "@/lib/server/routeParams";
import bcrypt from "bcryptjs";
import { upsertUserByRoleEmail } from "@/lib/server/authDb";

export const runtime = "nodejs";

function normEmail(email: string) {
  return email.trim().toLowerCase();
}

export const POST = withRequestLogging(async function POST(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await getRouteParams(ctx);
  const invite = await prisma.invite.findUnique({ where: { token } });
  if (!invite) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  if (invite.usedAt) return NextResponse.json({ ok: false, error: "Already used" }, { status: 410 });
  if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) return NextResponse.json({ ok: false, error: "Expired" }, { status: 410 });

  const body = (await req.json().catch(() => null)) as any;
  const name = String(body?.name || invite.name || "").trim();
  const phone = body?.phone ? String(body.phone).trim() : null;
  const password = body?.password ? String(body.password) : null;

  const email = normEmail(invite.email);

  if (invite.role === "client") {
    await prisma.client.upsert({
      where: { companyId_email: { companyId: invite.companyId, email } } as any,
      update: { name: name || undefined, phone: phone || undefined },
      create: { companyId: invite.companyId, email, name: name || email, phone },
    });
  } else if (invite.role === "engineer") {
    await prisma.engineer.upsert({
      where: { companyId_email: { companyId: invite.companyId, email } } as any,
      update: { name: name || undefined, phone: phone || undefined, isActive: true },
      create: { companyId: invite.companyId, email, name: name || email, phone, isActive: true },
    });
  } else {
    return NextResponse.json({ ok: false, error: "Invalid role" }, { status: 400 });
  }

  // Create/refresh an auth user for login
  const passwordHash = password ? await bcrypt.hash(password, 10) : null;
  if (invite.role === "client") {
    const client = await prisma.client.findUnique({ where: { companyId_email: { companyId: invite.companyId, email } } as any });
    await upsertUserByRoleEmail({
      role: "client",
      email,
      name: name || invite.name || null,
      companyId: invite.companyId,
      clientId: client?.id ?? null,
    });
    if (passwordHash) {
      await prisma.user.update({
        where: { role_email: { role: "client", email } } as any,
        data: { passwordHash },
      });
    }
  } else if (invite.role === "engineer") {
    const eng = await prisma.engineer.findUnique({ where: { companyId_email: { companyId: invite.companyId, email } } as any });
    await upsertUserByRoleEmail({
      role: "engineer",
      email,
      name: name || invite.name || null,
      companyId: invite.companyId,
      engineerId: eng?.id ?? null,
    });
    if (passwordHash) {
      await prisma.user.update({
        where: { role_email: { role: "engineer", email } } as any,
        data: { passwordHash },
      });
    }
  }

  await prisma.invite.update({ where: { id: invite.id }, data: { usedAt: new Date() } });

  return NextResponse.json({ ok: true });
});
