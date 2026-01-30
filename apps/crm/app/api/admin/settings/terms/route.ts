import { NextResponse } from "next/server";
import { requireRole, requireCompanyId } from "@/lib/serverAuth";
import { prisma } from "@/lib/server/prisma";

export async function GET() {
  try {
    const session = await requireRole("admin");
    if (!session) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    
    const companyId = await requireCompanyId();
    if (!companyId) return NextResponse.json({ ok: false, error: "No company" }, { status: 400 });

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        defaultPaymentTermsDays: true,
        autoChaseEnabled: true,
        autoChaseFirstDays: true,
        autoChaseSecondDays: true,
        autoChaseThirdDays: true,
        quoteValidityDays: true,
        defaultVatRate: true,
        invoiceNumberPrefix: true,
        termsAndConditions: true,
      },
    });

    return NextResponse.json({
      ok: true,
      settings: {
        paymentTermsDays: company?.defaultPaymentTermsDays ?? 30,
        enableAutoChase: company?.autoChaseEnabled ?? true,
        autoChaseFirstDays: company?.autoChaseFirstDays ?? 7,
        autoChaseSecondDays: company?.autoChaseSecondDays ?? 14,
        autoChaseThirdDays: company?.autoChaseThirdDays ?? 21,
        quoteValidityDays: company?.quoteValidityDays ?? 30,
        defaultVatRate: company?.defaultVatRate ?? 0.2,
        invoiceNumberPrefix: company?.invoiceNumberPrefix ?? "INV-",
        termsAndConditions: company?.termsAndConditions ?? "",
      },
    });
  } catch (error) {
    console.error("GET /api/admin/settings/terms error:", error);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireRole("admin");
    if (!session) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    
    const companyId = await requireCompanyId();
    if (!companyId) return NextResponse.json({ ok: false, error: "No company" }, { status: 400 });

    const body = await req.json();

    const updateData: any = {};
    
    if (typeof body.paymentTermsDays === "number") {
      updateData.defaultPaymentTermsDays = Math.max(1, Math.min(365, body.paymentTermsDays));
    }
    if (typeof body.enableAutoChase === "boolean") {
      updateData.autoChaseEnabled = body.enableAutoChase;
    }
    if (typeof body.autoChaseFirstDays === "number") {
      updateData.autoChaseFirstDays = Math.max(1, Math.min(90, body.autoChaseFirstDays));
    }
    if (typeof body.autoChaseSecondDays === "number") {
      updateData.autoChaseSecondDays = Math.max(1, Math.min(90, body.autoChaseSecondDays));
    }
    if (typeof body.autoChaseThirdDays === "number") {
      updateData.autoChaseThirdDays = Math.max(1, Math.min(90, body.autoChaseThirdDays));
    }
    if (typeof body.quoteValidityDays === "number") {
      updateData.quoteValidityDays = Math.max(1, Math.min(365, body.quoteValidityDays));
    }
    if (typeof body.defaultVatRate === "number") {
      updateData.defaultVatRate = Math.max(0, Math.min(1, body.defaultVatRate));
    }
    if (typeof body.invoiceNumberPrefix === "string") {
      updateData.invoiceNumberPrefix = body.invoiceNumberPrefix.slice(0, 20);
    }
    if (typeof body.termsAndConditions === "string") {
      updateData.termsAndConditions = body.termsAndConditions.slice(0, 50000); // Limit size
    }

    await prisma.company.update({
      where: { id: companyId },
      data: updateData,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/admin/settings/terms error:", error);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
