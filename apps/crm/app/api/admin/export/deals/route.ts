import { NextResponse } from "next/server";
import { requireRole, requireCompanyId } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging } from "@/lib/server/observability";
import { generateCSV } from "@/lib/server/csvExport";

export const runtime = "nodejs";

/**
 * GET /api/admin/export/deals
 * Export deals as CSV
 */
export const GET = withRequestLogging(async function GET() {
  // RBAC guard
  try {
    await requireRole("admin");
  } catch {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 }
    );
  }

  let companyId: string;
  try {
    companyId = await requireCompanyId();
  } catch {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 }
    );
  }

  const prisma = getPrisma();

  try {
    // Fetch all deals for the company
    const deals = await prisma.deal.findMany({
      where: { companyId },
      include: {
        stage: {
          select: {
            name: true,
          },
        },
        contact: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        client: {
          select: {
            name: true,
          },
        },
        owner: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Transform to export format
    const exportData = deals.map((deal) => ({
      Title: deal.title,
      Value: deal.value,
      "Probability (%)": deal.probability || "",
      Stage: deal.stage?.name || "",
      "Contact Name": deal.contact
        ? `${deal.contact.firstName} ${deal.contact.lastName}`
        : "",
      "Contact Email": deal.contact?.email || "",
      "Client/Company": deal.client?.name || "",
      "Owner Name": deal.owner?.name || "",
      "Owner Email": deal.owner?.email || "",
      "Expected Close Date": deal.expectedCloseDate
        ? deal.expectedCloseDate.toISOString().split("T")[0]
        : "",
      "Closed At": deal.closedAt
        ? deal.closedAt.toISOString().split("T")[0]
        : "",
      "Lost Reason": deal.lostReason || "",
      Source: deal.source || "",
      Notes: deal.notes || "",
      "Created At": deal.createdAt.toISOString(),
    }));

    const csv = generateCSV(exportData);

    const headers = new Headers();
    headers.set("Content-Type", "text/csv; charset=utf-8");
    headers.set(
      "Content-Disposition",
      `attachment; filename="deals-${new Date().toISOString().split("T")[0]}.csv"`
    );

    return new NextResponse(csv, {
      status: 200,
      headers,
    });
  } catch (error: any) {
    console.error("[export/deals] Error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to export deals" },
      { status: 500 }
    );
  }
});
