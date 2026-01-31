import { NextResponse } from "next/server";
import { requireRole, requireCompanyId } from "@/lib/serverAuth";
import { getCertAnalytics } from "@/lib/server/certs/analytics";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: Request) {
  try {
    await requireRole("admin");
  } catch {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let companyId: string;
  try {
    companyId = await requireCompanyId();
  } catch {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const fromParam = url.searchParams.get("from") || "";
  const toParam = url.searchParams.get("to") || "";

  if (!ISO_DATE_RE.test(fromParam) || !ISO_DATE_RE.test(toParam)) {
    return NextResponse.json(
      { ok: false, error: "from and to query params required in yyyy-mm-dd format" },
      { status: 400 },
    );
  }

  const from = new Date(`${fromParam}T00:00:00.000Z`);
  const to = new Date(`${toParam}T23:59:59.999Z`);

  if (isNaN(from.getTime()) || isNaN(to.getTime())) {
    return NextResponse.json({ ok: false, error: "Invalid date" }, { status: 400 });
  }

  try {
    const result = await getCertAnalytics({ companyId, from, to });
    return NextResponse.json({ ok: true, ...result });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Analytics failed" },
      { status: 500 },
    );
  }
}
