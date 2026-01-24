export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/serverAuth";
import { prisma } from "@/lib/server/prisma";

export async function GET(req: Request) {
  try {
    const ctx = await requireRole("admin");
    if (!ctx?.companyId) {
      return NextResponse.json({ ok: true, data: [] });
    }
    
    const url = new URL(req.url);
    const from = new Date(url.searchParams.get("from") || new Date());
    const to = new Date(url.searchParams.get("to") || new Date(Date.now() + 7 * 86400000));

    const entries = await prisma.scheduleEntry.findMany({
      where: {
        companyId: ctx.companyId,
        startAt: { gte: from, lte: to }
      },
      include: { engineer: true, job: true }
    });

    return NextResponse.json({
      ok: true,
      data: entries.map((e: any) => ({
        id: e.id,
        engineerId: e.engineerId,
        engineer: e.engineer?.name,
        jobId: e.jobId,
        job: e.job?.name || e.job?.title,
        startAt: e.startAt,
        endAt: e.endAt
      }))
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Unauthorized") {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { ok: false, error: "Internal error", message, route: "/api/admin/planner" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireRole("admin");
    if (!ctx?.companyId) {
      return NextResponse.json({ ok: false, error: "No company" }, { status: 400 });
    }
    
    const body = await req.json();
    
    const entry = await prisma.scheduleEntry.create({
      data: {
        companyId: ctx.companyId,
        engineerId: body.engineerId,
        jobId: body.jobId || null,
        startAt: new Date(body.startAt),
        endAt: new Date(body.endAt),
        notes: body.notes || null
      },
      include: { engineer: true, job: true }
    });
    
    return NextResponse.json({ ok: true, data: entry });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Unauthorized") {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { ok: false, error: "Internal error", message, route: "/api/admin/planner" },
      { status: 500 }
    );
  }
}
