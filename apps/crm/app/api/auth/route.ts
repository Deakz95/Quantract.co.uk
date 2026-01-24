import { NextResponse } from "next/server";
import { setSession, setUserEmail, setCompanyId, type Role } from "@/lib/serverAuth";
import { ensureCompanyForAdmin, ensureCompanyForEngineer, ensureCompanyForClient } from "@/lib/server/tenancy";
import { withRequestLogging } from "@/lib/server/observability";
import { upsertUserByRoleEmail, createSession } from "@/lib/server/authDb";
import { prisma } from "@/lib/server/prisma";
import bcrypt from "bcryptjs";

export const POST = withRequestLogging(async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as null | {
    role?: Role;
    email?: string;
    password?: string;
  };
  const role = body?.role;
  if (!role) return NextResponse.json({
    ok: false,
    error: "Missing role"
  }, {
    status: 400
  });

  const email = String(body?.email || (role === "admin" ? process.env.QT_ADMIN_EMAIL || "admin@demo.com" : "")).trim().toLowerCase();
  const password = body?.password || "";

  // Try to authenticate against database first
  let authenticated = false;
  let dbUser: any = null;
  
  try {
    dbUser = await prisma.user.findFirst({
      where: { email, role }
    });
    
    if (dbUser?.passwordHash) {
      // Verify against bcrypt hash
      authenticated = await bcrypt.compare(password, dbUser.passwordHash);
    }
  } catch (e) {
    // DB might not be available, fall through to demo check
    console.warn("Auth DB lookup failed:", e);
  }

  // Fallback: Accept demo123 for development/testing
  if (!authenticated && password === "demo123") {
    authenticated = true;
  }

  if (!authenticated) {
    return NextResponse.json({
      ok: false,
      error: "Invalid credentials"
    }, {
      status: 401
    });
  }

  // Resolve active companyId for this session
  let companyId: string | null = dbUser?.companyId || null;
  
  if (!companyId) {
    try {
      if (role === "admin") companyId = await ensureCompanyForAdmin(email || process.env.QT_ADMIN_EMAIL || "admin@demo.com");
      if (role === "engineer") companyId = await ensureCompanyForEngineer(email);
      if (role === "client") companyId = await ensureCompanyForClient(email);
    } catch (e) {
      // If Prisma isn't configured, we keep sessions working in fileDb mode.
      console.warn("Company provisioning warning:", e);
      companyId = null;
    }
  }

  // Create a proper session with session ID for API auth
  let sessionId: string | null = null;
  try {
    // Upsert user in database
    const user = await upsertUserByRoleEmail({
      role,
      email,
      companyId,
    });
    // Create session
    const session = await createSession(user.id);
    sessionId = session.id;
  } catch (e) {
    // If Prisma isn't configured, fall back to cookie-only auth
    console.warn("Demo login: couldn't create session, falling back to cookie-only auth", e);
  }

  // Set session cookies (httpOnly) - now with sessionId for proper auth
  await setSession(role, { sessionId });
  if (email) {
    await setUserEmail(email);
  }
  if (companyId) {
    await setCompanyId(companyId);
  }

  return NextResponse.json({
    ok: true,
    role,
    companyId
  });
});
