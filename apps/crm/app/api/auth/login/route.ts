import { NextResponse } from "next/server";
import { setSession, setUserEmail, setCompanyId, type Role } from "@/lib/serverAuth";
import { ensureCompanyForAdmin, ensureCompanyForEngineer, ensureCompanyForClient } from "@/lib/server/tenancy";
import { withRequestLogging } from "@/lib/server/observability";
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

  // Demo password gate (replace with real auth later)
  if (body?.password !== "demo123") {
    return NextResponse.json({
      ok: false,
      error: "Invalid password"
    }, {
      status: 401
    });
  }
  const email = String(body?.email || (role === "admin" ? process.env.QT_ADMIN_EMAIL || "admin@demo.com" : "")).trim().toLowerCase();

  // Set session cookies (httpOnly)
  await setSession(role);
  if (email && (role === "client" || role === "engineer")) {
    await setUserEmail(email);
  }

  // Resolve active companyId for this session
  let companyId: string | null = null;
  try {
    if (role === "admin") companyId = await ensureCompanyForAdmin(email || process.env.QT_ADMIN_EMAIL || "admin@demo.com");
    if (role === "engineer") companyId = await ensureCompanyForEngineer(email);
    if (role === "client") companyId = await ensureCompanyForClient(email);
  } catch {
    // If Prisma isn't configured, we keep sessions working in fileDb mode.
    companyId = null;
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
