import { NextResponse } from "next/server";
import { randomUUID, randomBytes } from "crypto";
import { requireCompanyContext } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging } from "@/lib/server/observability";

export const POST = withRequestLogging(async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const authCtx = await requireCompanyContext();
    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json({ ok: false, error: "database_unavailable" }, { status: 503 });
    }

    const estimate = await prisma.aiEstimate.findFirst({
      where: { id: params.id, companyId: authCtx.companyId },
    });

    if (!estimate) {
      return NextResponse.json({ ok: false, error: "estimate_not_found" }, { status: 404 });
    }

    if (estimate.convertedToQuoteId) {
      return NextResponse.json({ ok: true, quoteId: estimate.convertedToQuoteId, alreadyConverted: true });
    }

    const est = estimate.estimateJson as any;
    if (!est?.lineItems?.length) {
      return NextResponse.json({ ok: false, error: "estimate_has_no_line_items" }, { status: 400 });
    }

    // Convert AI line items to quote items
    const items = est.lineItems.map((li: any) => ({
      id: randomUUID(),
      description: String(li.description || "Item"),
      qty: typeof li.qty === "number" ? li.qty : 1,
      unitPrice: Math.round(((li.labourCost || 0) + (li.materialCost || 0)) * 100) / 100,
    }));

    const vatRate = 0.2;
    const token = randomBytes(16).toString("hex");

    // Allocate quote number
    const co = await prisma.company.findUnique({
      where: { id: authCtx.companyId },
      select: { quoteNumberPrefix: true, nextQuoteNumber: true },
    });
    const prefix = co?.quoteNumberPrefix || "QUO-";
    const num = co?.nextQuoteNumber || 1;
    const quoteNumber = `${prefix}${String(num).padStart(6, "0")}`;
    await prisma.company.update({
      where: { id: authCtx.companyId },
      data: { nextQuoteNumber: num + 1 },
    });

    const quote = await prisma.quote.create({
      data: {
        id: randomUUID(),
        companyId: authCtx.companyId,
        token,
        quoteNumber,
        clientName: "TBC",
        clientEmail: "tbc@example.com",
        notes: `Generated from AI estimate: ${est.summary || ""}`.trim(),
        vatRate,
        items: items as any,
        status: "draft",
        updatedAt: new Date(),
      },
    });

    // Link estimate to quote
    await prisma.aiEstimate.update({
      where: { id: estimate.id },
      data: { convertedToQuoteId: quote.id },
    });

    return NextResponse.json({ ok: true, quoteId: quote.id });
  } catch (e: any) {
    if (e?.status === 401) return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    console.error("[POST /api/admin/ai/estimates/[id]/convert-to-quote]", e);
    return NextResponse.json({ ok: false, error: "conversion_failed" }, { status: 500 });
  }
});
