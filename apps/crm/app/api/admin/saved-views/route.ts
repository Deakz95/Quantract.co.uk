import { NextResponse } from "next/server";
import { requireRoles, getCompanyId } from "@/lib/serverAuth";
import { prisma } from "@/lib/server/prisma";
import { randomUUID } from "crypto";

export async function GET(req: Request) {
  const session = await requireRoles("admin");
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const companyId = await getCompanyId();
  if (!companyId) {
    return NextResponse.json({ ok: false, error: "Company not found" }, { status: 401 });
  }

  const url = new URL(req.url);
  const entityType = url.searchParams.get("entityType");

  const where: any = {
    companyId,
    userId: session.userId,
  };

  if (entityType) {
    where.entityType = entityType;
  }

  const views = await prisma.savedView.findMany({
    where,
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });

  return NextResponse.json({
    ok: true,
    views: views.map((v: typeof views[number]) => ({
      id: v.id,
      companyId: v.companyId,
      userId: v.userId,
      name: v.name,
      entityType: v.entityType,
      filters: v.filters,
      columns: v.columns,
      sortBy: v.sortBy,
      sortDir: v.sortDir,
      isDefault: v.isDefault,
      createdAt: v.createdAt.toISOString(),
      updatedAt: v.updatedAt.toISOString(),
    })),
  });
}

export async function POST(req: Request) {
  const session = await requireRoles("admin");
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const companyId = await getCompanyId();
  if (!companyId) {
    return NextResponse.json({ ok: false, error: "Company not found" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 });
  }

  const { name, entityType, filters, columns, sortBy, sortDir, isDefault } = body;

  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ ok: false, error: "Name is required" }, { status: 400 });
  }

  if (!entityType || typeof entityType !== "string") {
    return NextResponse.json({ ok: false, error: "Entity type is required" }, { status: 400 });
  }

  // If setting as default, unset other defaults for this entity type
  if (isDefault) {
    await prisma.savedView.updateMany({
      where: {
        companyId,
        userId: session.userId,
        entityType,
        isDefault: true,
      },
      data: { isDefault: false },
    });
  }

  const view = await prisma.savedView.create({
    data: {
      id: randomUUID(),
      companyId,
      userId: session.userId,
      name: name.trim(),
      entityType,
      filters: filters || {},
      columns: columns || null,
      sortBy: sortBy || null,
      sortDir: sortDir || null,
      isDefault: Boolean(isDefault),
      updatedAt: new Date(),
    },
  });

  return NextResponse.json({
    ok: true,
    view: {
      id: view.id,
      companyId: view.companyId,
      userId: view.userId,
      name: view.name,
      entityType: view.entityType,
      filters: view.filters,
      columns: view.columns,
      sortBy: view.sortBy,
      sortDir: view.sortDir,
      isDefault: view.isDefault,
      createdAt: view.createdAt.toISOString(),
      updatedAt: view.updatedAt.toISOString(),
    },
  });
}
