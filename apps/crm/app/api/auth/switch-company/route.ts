import { NextResponse } from "next/server";
import { p } from "@/lib/server/prisma";
import { neonAuth, setCompanyId } from "@/lib/serverAuth";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/switch-company
 *
 * Switch user to a different company (for fixing company mismatch issues).
 * Only switches if the target company exists and user has access.
 * Expects: { companyId: string }
 */
export async function POST(req: Request) {
  try {
    const prisma = p();
    const { user } = await neonAuth();

    if (!user) {
      return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const targetCompanyId = body.companyId?.trim();

    if (!targetCompanyId) {
      return NextResponse.json({ ok: false, error: "companyId is required" }, { status: 400 });
    }

    const email = (user.email || "").toLowerCase();

    // Find existing user
    const dbUser = await prisma.user.findFirst({
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

    // Verify target company exists
    const targetCompany = await prisma.company.findUnique({
      where: { id: targetCompanyId },
    });

    if (!targetCompany) {
      return NextResponse.json({ ok: false, error: "Target company not found" }, { status: 404 });
    }

    // Update user's company
    await prisma.user.update({
      where: { id: dbUser.id },
      data: { companyId: targetCompanyId },
    });

    // Update session cookie
    await setCompanyId(targetCompanyId);

    return NextResponse.json({
      ok: true,
      message: `Switched to company: ${targetCompany.name}`,
      companyId: targetCompanyId,
      companyName: targetCompany.name,
    });
  } catch (error) {
    console.error("Switch company error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

/**
 * GET /api/auth/switch-company
 *
 * List all companies (for admin to choose from).
 */
export async function GET() {
  try {
    const prisma = p();
    const { user } = await neonAuth();

    if (!user) {
      return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
    }

    // List all companies (admin only operation)
    const companies = await prisma.company.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        createdAt: true,
        _count: {
          select: {
            quotes: true,
            invoices: true,
            jobs: true,
            clients: true,
          }
        }
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      ok: true,
      companies: companies.map((c: any) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        createdAt: c.createdAt,
        quotesCount: c._count.quotes,
        invoicesCount: c._count.invoices,
        jobsCount: c._count.jobs,
        clientsCount: c._count.clients,
      })),
    });
  } catch (error) {
    console.error("List companies error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
