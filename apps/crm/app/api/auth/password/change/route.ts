import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { withRequestLogging } from "@/lib/server/observability";
import { getAuthContext } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";

const schema = z.object({
  currentPassword: z.string().min(6).optional(),
  newPassword: z.string().min(8),
});

export const POST = withRequestLogging(async function POST(req: Request) {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }

  const db = getPrisma();
  if (!db || process.env.QT_USE_PRISMA !== "1") {
    return NextResponse.json({ ok: false, error: "prisma_unavailable" }, { status: 503 });
  }

  const user = await db.user.findUnique({ where: { id: ctx.userId }, select: { id: true, passwordHash: true }});
  if (!user) return NextResponse.json({ ok: false, error: "user_not_found" }, { status: 404 });

  if (user.passwordHash) {
    const current = parsed.data.currentPassword || "";
    const ok = await bcrypt.compare(current, user.passwordHash);
    if (!ok) return NextResponse.json({ ok: false, error: "wrong_password" }, { status: 400 });
  }

  const nextHash = await bcrypt.hash(parsed.data.newPassword, 12);
  await db.user.update({ where: { id: user.id }, data: { passwordHash: nextHash } });

  return NextResponse.json({ ok: true });
});
