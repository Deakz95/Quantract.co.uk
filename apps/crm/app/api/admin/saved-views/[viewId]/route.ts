import { NextResponse } from "next/server";
import { requireRoles, getCompanyId } from "@/lib/serverAuth";
import { prisma } from "@/lib/server/prisma";
import { getRouteParams } from "@/lib/server/routeParams";

export async function PATCH(req: Request, ctx: { params: Promise<{ viewId: string }> }) {
  const session = await requireRoles("admin");
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const companyId = await getCompanyId();
  if (!companyId) {
    return NextResponse.json({ ok: false, error: "Company not found" }, { status: 401 });
  }

  const { viewId } = await getRouteParams(ctx);

  const existing = await prisma.savedView.findFirst({
    where: {
      id: viewId,
      companyId,
      userId: session.userId,
    },
  });

  if (!existing) {
    return NextResponse.json({ ok: false, error: "View not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 });
  }

  const updateData: any = { updatedAt: new Date() };

  if (typeof body.name === "string" && body.name.trim()) {
    updateData.name = body.name.trim();
  }

  if (body.filters !== undefined) {
    updateData.filters = body.filters;
  }

  if (body.columns !== undefined) {
    updateData.columns = body.columns;
  }

  if (typeof body.sortBy === "string" || body.sortBy === null) {
    updateData.sortBy = body.sortBy;
  }

  if (typeof body.sortDir === "string" || body.sortDir === null) {
    updateData.sortDir = body.sortDir;
  }

  if (typeof body.isDefault === "boolean") {
    // If setting as default, unset other defaults for this entity type
    if (body.isDefault) {
      await prisma.savedView.updateMany({
        where: {
          companyId,
          userId: session.userId,
          entityType: existing.entityType,
          isDefault: true,
          id: { not: viewId },
        },
        data: { isDefault: false },
      });
    }
    updateData.isDefault = body.isDefault;
  }

  const view = await prisma.savedView.update({
    where: { id: viewId },
    data: updateData,
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

export async function DELETE(req: Request, ctx: { params: Promise<{ viewId: string }> }) {
  const session = await requireRoles("admin");
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const companyId = await getCompanyId();
  if (!companyId) {
    return NextResponse.json({ ok: false, error: "Company not found" }, { status: 401 });
  }

  const { viewId } = await getRouteParams(ctx);

  const existing = await prisma.savedView.findFirst({
    where: {
      id: viewId,
      companyId,
      userId: session.userId,
    },
  });

  if (!existing) {
    return NextResponse.json({ ok: false, error: "View not found" }, { status: 404 });
  }

  await prisma.savedView.delete({
    where: { id: viewId },
  });

  return NextResponse.json({ ok: true });
}
