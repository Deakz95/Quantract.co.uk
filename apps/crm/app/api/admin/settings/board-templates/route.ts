import { NextResponse } from "next/server";
import { requireRole, requireCompanyId } from "@/lib/serverAuth";
import { prisma } from "@/lib/server/prisma";

interface BoardTemplateCircuit {
  circuitNum: string;
  description?: string;
  phase?: string;
  deviceType?: string;
  rating?: string;
  cableType?: string;
  cableMm2?: string;
  cpcMm2?: string;
}

interface BoardTemplate {
  id: string;
  name: string;
  boardType: string;
  numWays: number;
  manufacturer?: string;
  model?: string;
  mainSwitchType?: string;
  mainSwitchRating?: string;
  circuits: BoardTemplateCircuit[];
  createdAt: string;
}

export async function GET() {
  try {
    const session = await requireRole("admin");
    if (!session) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const companyId = await requireCompanyId();
    if (!companyId) return NextResponse.json({ ok: false, error: "No company" }, { status: 400 });

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { boardTemplates: true },
    });

    const templates: BoardTemplate[] = Array.isArray(company?.boardTemplates)
      ? (company.boardTemplates as unknown as BoardTemplate[])
      : [];

    return NextResponse.json({ ok: true, templates });
  } catch (error) {
    console.error("GET /api/admin/settings/board-templates error:", error);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireRole("admin");
    if (!session) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const companyId = await requireCompanyId();
    if (!companyId) return NextResponse.json({ ok: false, error: "No company" }, { status: 400 });

    const body = await req.json();

    // Validate required fields
    if (!body.name || typeof body.name !== "string") {
      return NextResponse.json({ ok: false, error: "Name is required" }, { status: 400 });
    }
    if (!body.boardType || typeof body.boardType !== "string") {
      return NextResponse.json({ ok: false, error: "Board type is required" }, { status: 400 });
    }
    if (typeof body.numWays !== "number" || body.numWays < 1) {
      return NextResponse.json({ ok: false, error: "Number of ways must be a positive number" }, { status: 400 });
    }
    if (!Array.isArray(body.circuits)) {
      return NextResponse.json({ ok: false, error: "Circuits must be an array" }, { status: 400 });
    }

    // Read existing templates
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { boardTemplates: true },
    });

    const existing: BoardTemplate[] = Array.isArray(company?.boardTemplates)
      ? (company.boardTemplates as unknown as BoardTemplate[])
      : [];

    // Build new template
    const newTemplate: BoardTemplate = {
      id: crypto.randomUUID(),
      name: body.name.slice(0, 200),
      boardType: body.boardType.slice(0, 50),
      numWays: Math.min(Math.max(1, body.numWays), 200),
      manufacturer: body.manufacturer?.slice(0, 100),
      model: body.model?.slice(0, 100),
      mainSwitchType: body.mainSwitchType?.slice(0, 50),
      mainSwitchRating: body.mainSwitchRating?.slice(0, 20),
      circuits: body.circuits.slice(0, 200).map((c: BoardTemplateCircuit) => ({
        circuitNum: String(c.circuitNum ?? "").slice(0, 10),
        description: c.description?.slice(0, 200),
        phase: c.phase?.slice(0, 10),
        deviceType: c.deviceType?.slice(0, 20),
        rating: c.rating?.slice(0, 20),
        cableType: c.cableType?.slice(0, 50),
        cableMm2: c.cableMm2?.slice(0, 20),
        cpcMm2: c.cpcMm2?.slice(0, 20),
      })),
      createdAt: new Date().toISOString(),
    };

    const updated = [...existing, newTemplate];

    await prisma.company.update({
      where: { id: companyId },
      data: { boardTemplates: updated as any },
    });

    return NextResponse.json({ ok: true, template: newTemplate });
  } catch (error) {
    console.error("POST /api/admin/settings/board-templates error:", error);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await requireRole("admin");
    if (!session) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const companyId = await requireCompanyId();
    if (!companyId) return NextResponse.json({ ok: false, error: "No company" }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const templateId = searchParams.get("id");

    if (!templateId) {
      return NextResponse.json({ ok: false, error: "Template id is required" }, { status: 400 });
    }

    // Read existing templates
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { boardTemplates: true },
    });

    const existing: BoardTemplate[] = Array.isArray(company?.boardTemplates)
      ? (company.boardTemplates as unknown as BoardTemplate[])
      : [];

    const filtered = existing.filter((t) => t.id !== templateId);

    if (filtered.length === existing.length) {
      return NextResponse.json({ ok: false, error: "Template not found" }, { status: 404 });
    }

    await prisma.company.update({
      where: { id: companyId },
      data: { boardTemplates: filtered.length > 0 ? (filtered as any) : null },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/admin/settings/board-templates error:", error);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
