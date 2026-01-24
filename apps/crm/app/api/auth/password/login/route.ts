import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { withRequestLogging } from "@/lib/server/observability";
import { getPrisma } from "@/lib/server/prisma";
import { findUserByRoleEmail, createSession } from "@/lib/server/authDb";
import { setSession, setUserEmail, setCompanyId, setProfileComplete } from "@/lib/serverAuth";
import { rateLimitPasswordLogin, createRateLimitResponse } from "@/lib/server/rateLimitMiddleware";

const schema = z.object({
  role: z.enum(["admin", "engineer", "client"]),
  email: z.string().email(),
  password: z.string().min(6),
  rememberMe: z.boolean().optional().default(false),
});

/**
 * Production-safe admin bootstrap.
 * - Creates the first admin user once, using Render env vars.
 * - Idempotent: will never overwrite an existing admin.
 * - Only runs when QT_USE_PRISMA === "1" to match this codebase.
 */
async function bootstrapAdminIfNeeded() {
  if (process.env.QT_USE_PRISMA !== "1") return;

  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) return;

  const db = getPrisma();

  const existing = await db.user.findUnique({
    where: { role_email: { role: "admin", email } },
    select: { id: true },
  });

  if (existing) return;

  const passwordHash = await bcrypt.hash(password, 12);

  // Create company first
  const companyName = process.env.ADMIN_NAME ?? "My Company";
  const slug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now();

  const crypto = await import("crypto");
  const company = await db.company.create({
    data: {
      id: crypto.randomUUID(),
      name: companyName,
      slug,
      brandName: companyName,
      brandTagline: "",
      themePrimary: "#0f172a",
      themeAccent: "#38bdf8",
      themeBg: "#ffffff",
      themeText: "#0f172a",
      updatedAt: new Date(),
    },
  });

  // Create admin user with company
  await db.user.create({
    data: {
      role: "admin",
      email,
      name: process.env.ADMIN_NAME ?? "Admin",
      passwordHash,
      companyId: company.id,
      profileComplete: false,
    },
  });
}

export const POST = withRequestLogging(async function POST(req: Request) {
  // ✅ Run once per request, safe + idempotent
  await bootstrapAdminIfNeeded();

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  const role = parsed.data.role;
  const email = parsed.data.email.trim().toLowerCase();
  const password = parsed.data.password;
  const rememberMe = parsed.data.rememberMe;

  // Apply brute force protection
  const rl = rateLimitPasswordLogin(req as NextRequest, email);
  if (!rl.ok) {
    return createRateLimitResponse({ error: rl.error!, resetAt: rl.resetAt! });
  }

  // Normal production login path
  const user = await findUserByRoleEmail(role, email);

  if (!user || !user.passwordHash) {
    return NextResponse.json({ ok: false, error: "Invalid email or password" }, { status: 401 });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);

  if (!ok) {
    return NextResponse.json({ ok: false, error: "Invalid email or password" }, { status: 401 });
  }

  const session = await createSession(user.id, rememberMe);

  await setSession(role, { sessionId: session.id });
  await setUserEmail(user.email);
  if (user.companyId) await setCompanyId(user.companyId);
  await setProfileComplete(Boolean((user as any).profileComplete));

  return NextResponse.json({ ok: true });
});
