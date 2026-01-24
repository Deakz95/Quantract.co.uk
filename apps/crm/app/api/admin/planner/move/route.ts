export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { requireCapability } from "@/lib/serverAuth";
import { p } from "@/lib/server/prisma";

type Body = {
  scheduleEntryId: string;
  engineerId: string;
  start: string;
  end: string;
};

export async function POST(req: Request) {
  const ctx = await requireCapability("planner.manage");
  const prisma = p();
  const body = (await req.json()) as Body;

  if (!body?.scheduleEntryId || !body?.engineerId || !body?.start || !body?.end) {
    return NextResponse.json(
      { ok: false, error: { code: "BAD_REQUEST", message: "scheduleEntryId, engineerId, start, end are required" } },
      { status: 400 }
    );
  }

  const existing = await prisma.scheduleEntry.findFirst({
    where: { id: body.scheduleEntryId, companyId: ctx.companyId }
  });

  if (!existing) {
    return NextResponse.json(
      { ok: false, error: { code: "NOT_FOUND", message: "Schedule entry not found" } },
      { status: 404 }
    );
  }

  const start = new Date(body.start);
  const end = new Date(body.end);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
    return NextResponse.json(
      { ok: false, error: { code: "BAD_REQUEST", message: "Invalid start/end" } },
      { status: 400 }
    );
  }

  // Basic conflict signal: if the engineer already has an overlapping booking, return 409
  const conflict = await prisma.scheduleEntry.findFirst({
    where: {
      companyId: ctx.companyId,
      engineerId: body.engineerId,
      id: { not: existing.id },
      OR: [
        { start: { lt: end }, end: { gt: start } }
      ]
    }
  });

  if (conflict) {
    return NextResponse.json(
      { ok: false, error: { code: "CONFLICT", message: "Booking conflict for engineer" } },
      { status: 409 }
    );
  }

  const updated = await prisma.scheduleEntry.update({
    where: { id: existing.id },
    data: {
      engineerId: body.engineerId,
      start,
      end
    }
  });

  return NextResponse.json({ ok: true, data: updated });
}
