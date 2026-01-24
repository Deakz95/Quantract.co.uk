import { NextResponse } from "next/server";
import * as repo from "@/lib/server/repo";
import { withRequestLogging } from "@/lib/server/observability";
import { getRouteParams } from "@/lib/server/routeParams";

export const POST = withRequestLogging(
  async function POST(req: Request, ctx: { params: Promise<{ token: string }> }) {
    const { token } = await getRouteParams(ctx);
  const body = (await req.json().catch(() => ({}))) as any;
  const decision = String(body?.decision || "").trim();
  if (decision !== "approved" && decision !== "rejected") {
    return NextResponse.json({
      ok: false,
      error: "invalid_decision"
    }, {
      status: 400
    });
  }
  const updated = await repo.decideVariationByToken(token, decision);
  if (!updated) return NextResponse.json({
    ok: false,
    error: "not_found"
  }, {
    status: 404
  });
  return NextResponse.json({
    ok: true,
    variation: updated
  });
});
