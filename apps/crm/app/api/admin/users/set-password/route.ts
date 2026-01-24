import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/serverAuth";
import { withRequestLogging } from "@/lib/server/observability";
import { upsertUserByRoleEmail } from "@/lib/server/authDb";
import { getPrisma } from "@/lib/server/prisma";

async function hashPassword(password: string): Promise<string> {
  const bcrypt = await import("bcryptjs");
  return bcrypt.hash(password, 12);
}

const schema = z.object({
  role: z.enum(["admin","engineer","client"]),
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
  engineerId: z.string().optional(),
  clientId: z.string().optional(),
});

export const POST = withRequestLogging(async function POST(req: Request) {
  const ctx = await requireRole("admin");
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });

  const db = getPrisma();
  if (!db || process.env.QT_USE_PRISMA !== "1") {
    return NextResponse.json({ ok: false, error: "prisma_unavailable" }, { status: 503 });
  }
  if (!ctx.companyId) {
    return NextResponse.json({ ok: false, error: "missing_company" }, { status: 400 });
  }

  const u = await upsertUserByRoleEmail({
    role: parsed.data.role,
    email: parsed.data.email,
    name: parsed.data.name ?? null,
    companyId: ctx.companyId,
    engineerId: parsed.data.engineerId ?? null,
    clientId: parsed.data.clientId ?? null,
  });

  const passwordHash = await hashPassword(parsed.data.password);
  await db.user.update({ where: { id: u.id }, data: { passwordHash } });

  return NextResponse.json({ ok: true });
});
