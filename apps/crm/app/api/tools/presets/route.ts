export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireCompanyContext } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { toolPresetSchema } from "@/lib/tools/types";

/** GET /api/tools/presets?toolSlug=voltage-drop */
export async function GET(req: Request) {
  const ctx = await requireCompanyContext();
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });

  const { searchParams } = new URL(req.url);
  const toolSlug = searchParams.get("toolSlug");

  const where: Record<string, unknown> = {
    companyId: ctx.companyId,
    userId: ctx.userId,
  };
  if (toolSlug) where.toolSlug = toolSlug;

  const presets = await prisma.toolPreset.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ ok: true, presets });
}

/** POST /api/tools/presets — create a new preset */
export async function POST(req: Request) {
  const ctx = await requireCompanyContext();
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });

  const body = await req.json();
  const parsed = toolPresetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const preset = await prisma.toolPreset.create({
    data: {
      companyId: ctx.companyId,
      userId: ctx.userId,
      toolSlug: parsed.data.toolSlug,
      name: parsed.data.name,
      inputsJson: parsed.data.inputsJson,
    },
  });

  return NextResponse.json({ ok: true, preset }, { status: 201 });
}

/** DELETE /api/tools/presets?id=xxx */
export async function DELETE(req: Request) {
  const ctx = await requireCompanyContext();
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });

  // Ensure preset belongs to this user + company
  const preset = await prisma.toolPreset.findFirst({
    where: { id, companyId: ctx.companyId, userId: ctx.userId },
  });
  if (!preset) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  await prisma.toolPreset.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
