import { NextResponse } from "next/server";
import { requireRole, getCompanyId } from "@/lib/serverAuth";
import * as repo from "@/lib/server/repo";
import { sendVariationEmail, absoluteUrl } from "@/lib/server/email";
import { withRequestLogging } from "@/lib/server/observability";

type Ctx = { params: Promise<{ variationId: string }> };

export const POST = withRequestLogging(async function POST(_req: Request, ctx: Ctx) {
  await requireRole("admin");
  const companyId = await getCompanyId();

  const { variationId } = await ctx.params;

  const variation = await repo.sendVariation(variationId);
  if (!variation) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const clientLink = `/client/variations/${variation.token}`;

  // Prefer job client details if present, otherwise fall back to quote details.
  const job = variation.jobId ? await repo.getJobById(variation.jobId) : null;
  const quote = variation.quoteId ? await repo.getQuoteById(variation.quoteId) : null;

  const clientEmail = job?.clientEmail || quote?.clientEmail || "";
  const clientName = job?.clientName || quote?.clientName || "Client";

  if (clientEmail) {
    await sendVariationEmail({
      companyId: companyId || undefined,
      to: clientEmail,
      clientName,
      variationId: variation.id,
      
      shareLink: absoluteUrl(clientLink),
      totals: {
        subtotal: variation.subtotal,
        vat: variation.vat,
        total: variation.total,
      },
    });
  }

  return NextResponse.json({ ok: true, variation, clientLink });
});
