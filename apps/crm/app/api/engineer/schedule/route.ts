import { NextResponse } from "next/server";
import { requireRoles, getUserEmail } from "@/lib/serverAuth";
import * as repo from "@/lib/server/repo";

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && bStart < aEnd;
}

function parseDateParam(value: string | null, fallback: Date): Date {
  if (!value) return fallback;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? fallback : d;
}

export async function GET(req: Request) {
  const session = await requireRoles("engineer");
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const email = await getUserEmail();
  if (!email) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const now = new Date();
  const from = parseDateParam(url.searchParams.get("from"), new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
  const to = parseDateParam(url.searchParams.get("to"), new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7));
  const entries = await repo.listScheduleEntriesForEngineer(email, from.toISOString(), to.toISOString());
  const clashes: Array<{ aId: string; bId: string }> = [];
  const sorted = [...entries].sort((a, b) => (a.startAtISO > b.startAtISO ? 1 : -1));
  for (let i = 0; i < sorted.length; i += 1) {
    const a = sorted[i];
    const aS = new Date(a.startAtISO).getTime();
    const aE = new Date(a.endAtISO).getTime();
    if (!Number.isFinite(aS) || !Number.isFinite(aE)) continue;
    for (let j = i + 1; j < sorted.length; j += 1) {
      const b = sorted[j];
      const bS = new Date(b.startAtISO).getTime();
      const bE = new Date(b.endAtISO).getTime();
      if (!Number.isFinite(bS) || !Number.isFinite(bE)) continue;
      if (bS >= aE) break;
      if (overlaps(aS, aE, bS, bE)) {
        clashes.push({ aId: a.id, bId: b.id });
      }
    }
  }
  return NextResponse.json({ ok: true, from: from.toISOString(), to: to.toISOString(), entries, clashes });
}
