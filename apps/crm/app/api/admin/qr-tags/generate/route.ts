import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging } from "@/lib/server/observability";

export const runtime = "nodejs";

export const POST = withRequestLogging(
  async function POST(req: Request) {
    try {
      const authCtx = await requireCompanyContext();
      const role = getEffectiveRole(authCtx);
      if (role !== "admin" && role !== "office") {
        return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
      }

      const prisma = getPrisma();
      if (!prisma) {
        return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });
      }

      const body = await req.json().catch(() => ({}));
      const count = Math.min(Math.max(Number(body.count) || 1, 1), 100);
      const labelPrefix = typeof body.labelPrefix === "string" ? body.labelPrefix.trim() : "";

      const tags = Array.from({ length: count }, (_, i) => ({
        companyId: authCtx.companyId,
        code: randomBytes(16).toString("hex"),
        label: labelPrefix ? `${labelPrefix}-${String(i + 1).padStart(3, "0")}` : null,
        status: "available",
      }));

      await prisma.qrTag.createMany({ data: tags });

      // Return tag IDs and labels only (not full codes) to reduce leakage surface
      const created = await prisma.qrTag.findMany({
        where: {
          companyId: authCtx.companyId,
          code: { in: tags.map((t) => t.code) },
        },
        select: { id: true, code: true, label: true, status: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      });

      return NextResponse.json({ ok: true, tags: created, count: created.length });
    } catch (e: any) {
      if (e?.status === 401) return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
      if (e?.status === 403) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
      console.error("POST /api/admin/qr-tags/generate error:", e);
      return NextResponse.json({ ok: false, error: "generate_failed" }, { status: 500 });
    }
  },
);
