import { NextResponse } from "next/server";
import { requireRole, requireCompanyId } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging } from "@/lib/server/observability";
import { generateCSV } from "@/lib/server/csvExport";

export const runtime = "nodejs";

/**
 * GET /api/admin/export/contacts
 * Export contacts as CSV
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
    // Fetch all contacts for the company
    const contacts = await prisma.contact.findMany({
      where: { companyId },
      include: {
        client: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Transform to export format
    const exportData = contacts.map((contact) => ({
      "First Name": contact.firstName,
      "Last Name": contact.lastName,
      Email: contact.email || "",
      Phone: contact.phone || "",
      Mobile: contact.mobile || "",
      "Job Title": contact.jobTitle || "",
      "Client/Company": contact.client?.name || "",
      "Is Primary": contact.isPrimary ? "Yes" : "No",
      "Preferred Channel": contact.preferredChannel || "",
      Notes: contact.notes || "",
      "Created At": contact.createdAt.toISOString(),
    }));

    const csv = generateCSV(exportData);

    const headers = new Headers();
    headers.set("Content-Type", "text/csv; charset=utf-8");
    headers.set(
      "Content-Disposition",
      `attachment; filename="contacts-${new Date().toISOString().split("T")[0]}.csv"`
    );

    return new NextResponse(csv, {
      status: 200,
      headers,
    });
  } catch (error: any) {
    console.error("[export/contacts] Error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to export contacts" },
      { status: 500 }
    );
  }
});
