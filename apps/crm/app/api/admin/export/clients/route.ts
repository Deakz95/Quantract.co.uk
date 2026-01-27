import { NextResponse } from "next/server";
import { requireRole, requireCompanyId } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging } from "@/lib/server/observability";
import { generateCSV } from "@/lib/server/csvExport";

export const runtime = "nodejs";

/**
 * GET /api/admin/export/clients
 * Export clients as CSV
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
    // Fetch all clients for the company
    const clients = await prisma.client.findMany({
      where: { companyId },
      include: {
        _count: {
          select: {
            contacts: true,
            jobs: true,
            invoices: true,
            quotes: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Transform to export format
    const exportData = clients.map((client) => ({
      Name: client.name,
      Email: client.email,
      Phone: client.phone || "",
      "Address Line 1": client.address1 || "",
      "Address Line 2": client.address2 || "",
      City: client.city || "",
      County: client.county || "",
      Postcode: client.postcode || "",
      Country: client.country || "",
      Notes: client.notes || "",
      "Payment Terms (Days)": client.paymentTermsDays || "",
      "Disable Auto Chase": client.disableAutoChase ? "Yes" : "No",
      "Contact Count": client._count.contacts,
      "Job Count": client._count.jobs,
      "Invoice Count": client._count.invoices,
      "Quote Count": client._count.quotes,
      "Created At": client.createdAt.toISOString(),
    }));

    const csv = generateCSV(exportData);

    const headers = new Headers();
    headers.set("Content-Type", "text/csv; charset=utf-8");
    headers.set(
      "Content-Disposition",
      `attachment; filename="clients-${new Date().toISOString().split("T")[0]}.csv"`
    );

    return new NextResponse(csv, {
      status: 200,
      headers,
    });
  } catch (error: any) {
    console.error("[export/clients] Error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to export clients" },
      { status: 500 }
    );
  }
});
