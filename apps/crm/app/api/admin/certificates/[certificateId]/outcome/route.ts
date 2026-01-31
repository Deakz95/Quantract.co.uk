import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { getRouteParams } from "@/lib/server/routeParams";
import { computeOutcome, explainOutcome } from "@/lib/server/certs";

export const runtime = "nodejs";

/** GET: compute outcome without persisting */
export async function GET(_req: Request, ctx: { params: Promise<{ certificateId: string }> }) {
  try {
    const authCtx = await requireCompanyContext();
    const role = getEffectiveRole(authCtx);
    if (role !== "admin" && role !== "office") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }
    const prisma = getPrisma();
    if (!prisma) return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });

    const { certificateId } = await getRouteParams(ctx);
    const cert = await prisma.certificate.findFirst({ where: { id: certificateId, companyId: authCtx.companyId } });
    if (!cert) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

    const [observations, checklists, testResults] = await Promise.all([
      prisma.certificateObservation.findMany({ where: { certificateId, companyId: authCtx.companyId } }),
      prisma.certificateChecklist.findMany({ where: { certificateId, companyId: authCtx.companyId } }),
      prisma.certificateTestResult.findMany({ where: { certificateId, companyId: authCtx.companyId } }),
    ]);

    const outcome = computeOutcome(
      cert.type,
      observations.map((o: any) => ({ code: o.code, location: o.location, description: o.description, resolvedAt: o.resolvedAt })),
      checklists.map((c: any) => ({ section: c.section, question: c.question, answer: c.answer })),
      testResults.map((t: any) => ({ circuitRef: t.circuitRef, data: t.data as Record<string, unknown> })),
    );

    const explanation = explainOutcome(
      outcome,
      observations.map((o: any) => ({ code: o.code, location: o.location, description: o.description, resolvedAt: o.resolvedAt })),
    );

    return NextResponse.json({ ok: true, outcome: outcome.outcome, reason: outcome.reason, explanation, details: outcome.details });
  } catch (err: any) {
    if (err?.status === 401 || err?.status === 403) return NextResponse.json({ ok: false, error: "forbidden" }, { status: err.status });
    return NextResponse.json({ ok: false, error: "compute_failed" }, { status: 500 });
  }
}

/** POST: compute outcome and persist to certificate */
export async function POST(_req: Request, ctx: { params: Promise<{ certificateId: string }> }) {
  try {
    const authCtx = await requireCompanyContext();
    const role = getEffectiveRole(authCtx);
    if (role !== "admin" && role !== "office") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }
    const prisma = getPrisma();
    if (!prisma) return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });

    const { certificateId } = await getRouteParams(ctx);
    const cert = await prisma.certificate.findFirst({ where: { id: certificateId, companyId: authCtx.companyId } });
    if (!cert) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

    const [observations, checklists, testResults] = await Promise.all([
      prisma.certificateObservation.findMany({ where: { certificateId, companyId: authCtx.companyId } }),
      prisma.certificateChecklist.findMany({ where: { certificateId, companyId: authCtx.companyId } }),
      prisma.certificateTestResult.findMany({ where: { certificateId, companyId: authCtx.companyId } }),
    ]);

    const outcome = computeOutcome(
      cert.type,
      observations.map((o: any) => ({ code: o.code, location: o.location, description: o.description, resolvedAt: o.resolvedAt })),
      checklists.map((c: any) => ({ section: c.section, question: c.question, answer: c.answer })),
      testResults.map((t: any) => ({ circuitRef: t.circuitRef, data: t.data as Record<string, unknown> })),
    );

    const explanation = explainOutcome(
      outcome,
      observations.map((o: any) => ({ code: o.code, location: o.location, description: o.description, resolvedAt: o.resolvedAt })),
    );

    await prisma.certificate.update({
      where: { id: certificateId },
      data: { outcome: outcome.outcome, outcomeReason: explanation },
    });

    return NextResponse.json({ ok: true, outcome: outcome.outcome, reason: outcome.reason, explanation, details: outcome.details });
  } catch (err: any) {
    if (err?.status === 401 || err?.status === 403) return NextResponse.json({ ok: false, error: "forbidden" }, { status: err.status });
    return NextResponse.json({ ok: false, error: "apply_failed" }, { status: 500 });
  }
}
