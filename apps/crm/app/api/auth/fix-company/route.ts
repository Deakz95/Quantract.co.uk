import { NextResponse } from "next/server";
import { p } from "@/lib/server/prisma";
import { neonAuth, setSession, setCompanyId, setProfileComplete, setUserEmail } from "@/lib/serverAuth";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

/**
 * POST /api/auth/fix-company
 *
 * Creates a company for users who don't have one and links them.
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
    const companyName = body.companyName?.trim() || "My Company";

    const email = (user.email || "").toLowerCase();

    // Find existing user
    let dbUser = await prisma.user.findFirst({
      where: {
        OR: [
          { neonAuthUserId: user.id },
          ...(email ? [{ email }] : []),
        ],
      },
    });

    if (!dbUser) {
      return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
    }

    // If user already has a company, just return success
    if (dbUser.companyId) {
      await setSession(dbUser.role as "admin" | "client" | "engineer");
      await setUserEmail(dbUser.email);
      await setCompanyId(dbUser.companyId);
      await setProfileComplete(Boolean(dbUser.profileComplete));

      return NextResponse.json({
        ok: true,
        message: "User already has a company",
        companyId: dbUser.companyId,
      });
    }

    // Create company for user
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
        updatedAt: new Date(),
      },
    });

    // Update user with company
    dbUser = await prisma.user.update({
      where: { id: dbUser.id },
      data: {
        companyId: companyId,
        neonAuthUserId: user.id,
        profileComplete: true,
      },
    });

    // Set session cookies
    await setSession(dbUser.role as "admin" | "client" | "engineer");
    await setUserEmail(dbUser.email);
    await setCompanyId(companyId);
    await setProfileComplete(true);

    return NextResponse.json({
      ok: true,
      message: "Company created and linked to user",
      companyId: companyId,
      redirectTo: "/admin",
    });
  } catch (error) {
    console.error("Fix company error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
