import { NextResponse } from "next/server";
import { neonAuth } from "@neondatabase/auth/next/server";
import { p } from "@/lib/server/prisma";
import { setSession, setCompanyId, setProfileComplete, setUserEmail } from "@/lib/serverAuth";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

/**
 * POST /api/auth/setup-account
 *
 * Called after Neon Auth sign-up to create the company and link everything together.
 * Expects: { companyName: string }
 */
export async function POST(req: Request) {
  try {
    const prisma = p();
    const { user } = await neonAuth();

    if (!user) {
      return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const companyName = body.companyName?.trim();

    if (!companyName) {
      return NextResponse.json({ ok: false, error: "Company name is required" }, { status: 400 });
    }

    const email = (user.email || "").toLowerCase();

    // Check if user already exists
    let dbUser = await prisma.user.findFirst({
      where: {
        OR: [
          { neonAuthUserId: user.id },
          ...(email ? [{ email }] : []),
        ],
      },
    });

    if (dbUser) {
      // User already exists - just set session and redirect
      await setSession(dbUser.role as "admin" | "client" | "engineer");
      if (dbUser.email) await setUserEmail(dbUser.email);
      if (dbUser.companyId) await setCompanyId(dbUser.companyId);
      await setProfileComplete(Boolean(dbUser.profileComplete));

      const role = dbUser.role || "admin";
      const redirectTo = dbUser.profileComplete ? `/${role}` : `/${role}/onboarding`;

      return NextResponse.json({ ok: true, redirectTo });
    }

    // Create company
    const companyId = randomUUID();
    const companySlug = `${companyName.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 30)}-${companyId.slice(0, 8)}`;

    await prisma.company.create({
      data: {
        id: companyId,
        name: companyName,
        slug: companySlug,
        brandName: companyName,
        brandTagline: "",
        themePrimary: "#0f172a",
        themeAccent: "#38bdf8",
        themeBg: "#ffffff",
        themeText: "#0f172a",
      },
    });

    // Create user with company
    const userId = randomUUID();
    dbUser = await prisma.user.create({
      data: {
        id: userId,
        email: email || `user-${user.id}@example.com`,
        name: user.name || null,
        companyId: companyId,
        role: "admin",
        neonAuthUserId: user.id,
        profileComplete: true, // Profile is complete since we collected company name
      },
    });

    // Set session cookies
    await setSession("admin");
    await setUserEmail(dbUser.email);
    await setCompanyId(companyId);
    await setProfileComplete(true);

    return NextResponse.json({
      ok: true,
      redirectTo: "/admin",
      user: {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        role: dbUser.role,
        companyId: companyId,
      },
    });
  } catch (error) {
    console.error("Setup account error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
