import { NextResponse } from "next/server";
import { getCompanyId, requireRoles } from "@/lib/serverAuth";
import * as repo from "@/lib/server/repo";
import { logCriticalAction } from "@/lib/server/observability";

function parseDateParam(value: string | null, fallback: Date): Date {
  if (!value) return fallback;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? fallback : d;
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aEnd > bStart && aStart < bEnd;
}

export async function GET(req: Request) {
  const session = await requireRoles("admin");
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const now = new Date();
  const from = parseDateParam(url.searchParams.get("from"), new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
  const to = parseDateParam(url.searchParams.get("to"), new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7));

  const entries = await repo.listScheduleEntries(from.toISOString(), to.toISOString());

  // Clash detection (per engineer)
  const clashes: Array<{ engineerEmail?: string; aId: string; bId: string }> = [];
  const byEngineer = new Map<string, typeof entries>();
  for (const e of entries) {
    const key = (e.engineerEmail || e.engineerId).toLowerCase();
    const list = byEngineer.get(key) ?? [];
    list.push(e);
    byEngineer.set(key, list);
  }
  for (const [key, list] of byEngineer.entries()) {
    const sorted = [...list].sort((a, b) => (a.startAtISO > b.startAtISO ? 1 : -1));
    for (let i = 0; i < sorted.length; i++) {
      const a = sorted[i];
      const aS = new Date(a.startAtISO).getTime();
      const aE = new Date(a.endAtISO).getTime();
      for (let j = i + 1; j < sorted.length; j++) {
        const b = sorted[j];
        const bS = new Date(b.startAtISO).getTime();
        const bE = new Date(b.endAtISO).getTime();
        if (!overlaps(aS, aE, bS, bE)) {
          // because sorted, once b starts after a ends we can break
          if (bS >= aE) break;
          continue;
        }
        clashes.push({ engineerEmail: sorted[i].engineerEmail, aId: a.id, bId: b.id });
      }
    }
  }

  return NextResponse.json({ ok: true, from: from.toISOString(), to: to.toISOString(), entries, clashes });
}

export async function POST(req: Request) {
  const session = await requireRoles("admin");
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const jobId = String(body.jobId || "").trim();
  const engineerEmail = String(body.engineerEmail || "").trim().toLowerCase();
  const startAtISO = String(body.startAtISO || "").trim();
  const endAtISO = String(body.endAtISO || "").trim();
  const notes = body.notes ? String(body.notes) : undefined;
  if (!jobId || !engineerEmail || !startAtISO || !endAtISO) {
    return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });
  }
  const entry = await repo.createScheduleEntry({ jobId, engineerEmail, startAtISO, endAtISO, notes });
  if (!entry) return NextResponse.json({ ok: false, error: "Could not create" }, { status: 400 });
  const companyId = await getCompanyId();
  logCriticalAction({
    name: "schedule.entry.created",
    companyId,
    metadata: {
      scheduleEntryId: entry.id,
      jobId,
      engineerEmail,
      startAtISO,
      endAtISO,
    },
  });
  return NextResponse.json({ ok: true, entry });
}
