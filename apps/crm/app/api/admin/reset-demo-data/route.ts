import { NextResponse } from "next/server";
import { requireRole, requireCompanyId } from "@/lib/serverAuth";
import { prisma } from "@/lib/server/prisma";
import { withRequestLogging } from "@/lib/server/observability";

export const runtime = "nodejs";

/**
 * POST /api/admin/reset-demo-data
 * Wipes all data for the current company - USE WITH CAUTION!
 */
export const POST = withRequestLogging(async function POST(req: Request) {
  try {
    await requireRole("admin");
  } catch {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let companyId: string;
  try {
    companyId = await requireCompanyId();
  } catch {
    return NextResponse.json({ ok: false, error: "No company" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  
  // Require confirmation
  if (body.confirm !== "DELETE_ALL_DATA") {
    return NextResponse.json({ 
      ok: false, 
      error: "Must send { confirm: 'DELETE_ALL_DATA' } to proceed" 
    }, { status: 400 });
  }

  try {
    // Delete in order to respect foreign keys
    // Order matters - delete children before parents

    // 1. Delete audit events
    await prisma.auditEvent.deleteMany({ where: { companyId } });

    // 2. Delete invoice-related
    await prisma.invoiceChase.deleteMany({ where: { companyId } });
    await prisma.invoicePayment.deleteMany({ where: { companyId } });
    await prisma.invoiceAttachment.deleteMany({ where: { companyId } });
    await prisma.invoiceVariation.deleteMany({ where: { companyId } });
    await prisma.invoice.deleteMany({ where: { companyId } });

    // 3. Delete certificates
    await prisma.certificate.deleteMany({ where: { companyId } });

    // 4. Delete variations
    await prisma.variationAttachment.deleteMany({ where: { companyId } });
    await prisma.variation.deleteMany({ where: { companyId } });

    // 5. Delete time entries and timesheets
    await prisma.timeEntry.deleteMany({ where: { companyId } });
    await prisma.timesheet.deleteMany({ where: { companyId } });

    // 6. Delete supplier bills
    await prisma.supplierBill.deleteMany({ where: { companyId } });

    // 7. Delete job-related
    await prisma.jobSchedule.deleteMany({ where: { companyId } });
    await prisma.jobStage.deleteMany({ where: { companyId } });
    await prisma.jobEngineer.deleteMany({ where: { companyId } });
    await prisma.job.deleteMany({ where: { companyId } });

    // 8. Delete agreements
    await prisma.agreement.deleteMany({ where: { companyId } });

    // 9. Delete quote revisions and quotes
    await prisma.quoteRevision.deleteMany({ where: { companyId } });
    await prisma.quote.deleteMany({ where: { companyId } });

    // 10. Delete sites
    await prisma.site.deleteMany({ where: { companyId } });

    // 11. Delete clients
    await prisma.client.deleteMany({ where: { companyId } });

    // 12. Delete rate cards
    await prisma.rateCard.deleteMany({ where: { companyId } });

    // 13. Delete engineers
    await prisma.engineer.deleteMany({ where: { companyId } });

    // 14. Delete invites
    await prisma.invite.deleteMany({ where: { companyId } });

    // 15. Reset company counters
    await prisma.company.update({
      where: { id: companyId },
      data: {
        nextInvoiceNumber: 1,
        nextCertificateNumber: 1,
      },
    });

    return NextResponse.json({ 
      ok: true, 
      message: "All data has been deleted. Company settings preserved." 
    });

  } catch (error) {
    console.error("Reset demo data error:", error);
    return NextResponse.json({ 
      ok: false, 
      error: error instanceof Error ? error.message : "Failed to reset data" 
    }, { status: 500 });
  }
});
