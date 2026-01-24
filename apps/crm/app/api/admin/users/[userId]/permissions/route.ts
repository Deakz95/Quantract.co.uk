import { NextRequest, NextResponse } from "next/server";
import { requireCapability } from "@/lib/serverAuth";
import { p } from "@/lib/server/prisma";

function errStatus(message: string) {
  return message === "Forbidden" ? 403 : 500;
}
function errType(message: string) {
  return message === "Forbidden" ? "Forbidden" : "Internal error";
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const ctx = await requireCapability("users.manage");
    if (!ctx?.companyId) return NextResponse.json({ ok: true, data: [] });

    const prisma = p();
    const userId = (await params).userId;

    const perms = await prisma.userPermission.findMany({
      where: { companyId: ctx.companyId, userId },
      orderBy: { key: "asc" }
    });

    return NextResponse.json({ ok: true, data: perms });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { ok: false, error: errType(message), message, route: "/api/admin/users/[userId]/permissions" },
      { status: errStatus(message) }
    );
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const ctx = await requireCapability("users.manage");
    const prisma = p();
    const body = await req.json();
    const userId = (await params).userId;

    const keys: string[] = Array.isArray(body?.keys) ? body.keys : [];
    const enabledKeys = new Set(keys);

    await prisma.userPermission.updateMany({
      where: { companyId: ctx.companyId, userId },
      data: { enabled: false }
    });

    for (const key of enabledKeys) {
      await prisma.userPermission.upsert({
        where: { companyId_userId_key: { companyId: ctx.companyId, userId, key } },
        update: { enabled: true },
        create: { companyId: ctx.companyId, userId, key, enabled: true }
      });
    }

    const perms = await prisma.userPermission.findMany({
      where: { companyId: ctx.companyId, userId, enabled: true }
    });

    return NextResponse.json({ ok: true, data: perms });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { ok: false, error: errType(message), message, route: "/api/admin/users/[userId]/permissions" },
      { status: errStatus(message) }
    );
  }
}