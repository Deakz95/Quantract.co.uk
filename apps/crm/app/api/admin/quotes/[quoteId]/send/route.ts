import { NextResponse } from "next/server";
import { requireRoles, getCompanyId } from "@/lib/serverAuth";
import { quoteTotals } from "@/lib/server/db";
import * as repo from "@/lib/server/repo";
import { sendQuoteEmail } from "@/lib/server/email";
import { logCriticalAction, addBusinessBreadcrumb } from "@/lib/server/observability";
import { getRouteParams } from "@/lib/server/routeParams";

export async function POST(_: Request, ctx: { params: Promise<{ quoteId: string }> }) {
  const session = await requireRoles("admin");
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { quoteId } = await getRouteParams(ctx);
  const q = await repo.getQuoteById(quoteId);
  if (!q) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  const shareUrl = `/client/quotes/${q.token}`;
  const origin = process.env.APP_ORIGIN || ""; // optional in dev; client UI also shows link
  const absolute = origin ? `${origin}${shareUrl}` : shareUrl;

  const totals = quoteTotals(q);
  const companyId = await getCompanyId();

  const result = await sendQuoteEmail({
    companyId: companyId || undefined,
    to: q.clientEmail,
    clientName: q.clientName,
    quoteId: q.id,
    shareLink: absolute,
    totals,
  });

  addBusinessBreadcrumb("quote.sent", { quoteId: q.id, clientEmail: q.clientEmail });

  // mark as sent (idempotent)
  if (q.status === "draft") await repo.updateQuoteStatusSent(q.id);

  logCriticalAction({
    name: "quote.sent",
    companyId,
    metadata: {
      quoteId: q.id,
      clientEmail: q.clientEmail,
      shareUrl: absolute,
    },
  });

  return NextResponse.json({ ok: true, delivery: result, shareUrl, shareUrlAbsolute: absolute });
}
