import { NextResponse } from "next/server";
import { neonAuth } from "@neondatabase/auth/next/server";
import { p } from "@/lib/server/prisma";
import { setSession, setCompanyId, setProfileComplete, setUserEmail } from "@/lib/serverAuth";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

/**
 * POST /api/auth/session-sync
 *
 * Bridges Neon Auth session to the app's cookie-based session.
 * After Neon Auth sign-up/sign-in, this endpoint:
 * 1. Validates the Neon Auth JWT
 * 2. Creates or links the user in our database
 * 3. Sets the app's session cookies (qt_session_v1, qt_company_id, qt_profile_complete)
 * 4. Returns the redirect URL (onboarding if profile incomplete, dashboard otherwise)
 */
export async function POST(req: Request) {
  try {
    const prisma = p();
    const { user } = await neonAuth();

    if (!user) {
      return NextResponse.json({ ok: false, error: "Not authenticated with Neon Auth" }, { status: 401 });
    }

    const email = (user.email || "").toLowerCase();

    // Find or create user
    let dbUser = await prisma.user.findFirst({
      where: {
        OR: [
          { neonAuthUserId: user.id },
          ...(email ? [{ email }] : []),
        ],
      },
    });

    if (!dbUser) {
      // Create company for new user
      const companyId = randomUUID();
      const companySlug = `company-${companyId.slice(0, 8)}`;
      const company = await prisma.company.create({
        data: {
          id: companyId,
          name: user.name || "New Company",
          slug: companySlug,
          brandName: user.name || "New Company",
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
          companyId: company.id,
          role: "admin",
          neonAuthUserId: user.id,
          profileComplete: false,
        },
      });
    } else if (!dbUser.neonAuthUserId) {
      // Link existing user to Neon Auth
      dbUser = await prisma.user.update({
        where: { id: dbUser.id },
        data: { neonAuthUserId: user.id },
      });
    }

    // Set app session cookies
    await setSession(dbUser.role as "admin" | "client" | "engineer");
    if (dbUser.email) await setUserEmail(dbUser.email);
    if (dbUser.companyId) await setCompanyId(dbUser.companyId);
    await setProfileComplete(Boolean(dbUser.profileComplete));

    // Determine redirect based on profile completion
    const role = dbUser.role || "admin";
    const redirectTo = dbUser.profileComplete
      ? `/${role}`
      : `/${role}/onboarding`;

    return NextResponse.json({
      ok: true,
      redirectTo,
      user: {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        role: dbUser.role,
        profileComplete: dbUser.profileComplete,
      }
    });
  } catch (error) {
    console.error("Session sync error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

/**
 * GET /api/auth/session-sync
 *
 * Same as POST but for redirect-based flows.
 * Redirects directly to the appropriate page.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const next = url.searchParams.get("next");

  try {
    const prisma = p();
    const { user } = await neonAuth();

    if (!user) {
      // Not authenticated, redirect to sign-in
      return NextResponse.redirect(new URL("/auth/sign-in", req.url));
    }

    const email = (user.email || "").toLowerCase();

    // Find or create user
    let dbUser = await prisma.user.findFirst({
      where: {
        OR: [
          { neonAuthUserId: user.id },
          ...(email ? [{ email }] : []),
        ],
      },
    });

    if (!dbUser) {
      // Create company for new user
      const companyId = randomUUID();
      const companySlug = `company-${companyId.slice(0, 8)}`;
      const company = await prisma.company.create({
        data: {
          id: companyId,
          name: user.name || "New Company",
          slug: companySlug,
          brandName: user.name || "New Company",
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
          companyId: company.id,
          role: "admin",
          neonAuthUserId: user.id,
          profileComplete: false,
        },
      });
    } else if (!dbUser.neonAuthUserId) {
      // Link existing user to Neon Auth
      dbUser = await prisma.user.update({
        where: { id: dbUser.id },
        data: { neonAuthUserId: user.id },
      });
    }

    // Set app session cookies
    await setSession(dbUser.role as "admin" | "client" | "engineer");
    if (dbUser.email) await setUserEmail(dbUser.email);
    if (dbUser.companyId) await setCompanyId(dbUser.companyId);
    await setProfileComplete(Boolean(dbUser.profileComplete));

    // Determine redirect
    const role = dbUser.role || "admin";
    let redirectTo: string;

    if (dbUser.profileComplete && next) {
      redirectTo = next;
    } else if (dbUser.profileComplete) {
      redirectTo = `/${role}`;
    } else {
      redirectTo = `/${role}/onboarding`;
    }

    return NextResponse.redirect(new URL(redirectTo, req.url));
  } catch (error) {
    console.error("Session sync error:", error);
    // On error, redirect to home with error param
    return NextResponse.redirect(new URL("/?error=session_sync_failed", req.url));
  }
}
