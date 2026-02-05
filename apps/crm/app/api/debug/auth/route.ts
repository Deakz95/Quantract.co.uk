import { NextResponse } from "next/server";
import { p } from "@/lib/server/prisma";
import { neonAuth, getCompanyIdFromCookie, getEmailFromCookie, getRoleFromCookie } from "@/lib/serverAuth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const prisma = p();
    const { user: neonUser } = await neonAuth();

    // Get cookies
    const roleCookie = await getRoleFromCookie();
    const companyCookie = await getCompanyIdFromCookie();
    const emailCookie = await getEmailFromCookie();

    // Find user in database
    let dbUser = null;
    if (neonUser) {
      const email = (neonUser.email || "").toLowerCase();
      dbUser = await prisma.user.findFirst({
        where: {
          OR: [
            { neonAuthUserId: neonUser.id },
            ...(email ? [{ email }] : []),
          ],
        },
        include: {
          company: true,
        },
      });
    }

    return NextResponse.json({
      neonAuth: neonUser ? {
        id: neonUser.id,
        email: neonUser.email,
        name: neonUser.name,
      } : null,
      cookies: {
        role: roleCookie,
        companyId: companyCookie,
        email: emailCookie,
      },
      dbUser: dbUser ? {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        role: dbUser.role,
        companyId: dbUser.companyId,
        neonAuthUserId: dbUser.neonAuthUserId,
        company: dbUser.company ? {
          id: dbUser.company.id,
          name: dbUser.company.name,
          slug: dbUser.company.slug,
        } : null,
      } : null,
    });
  } catch (error) {
    console.error("Debug auth error:", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
