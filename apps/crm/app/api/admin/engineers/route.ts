import { NextResponse } from "next/server";
import { requireRoles } from "@/lib/serverAuth";
import * as repo from "@/lib/server/repo";

export async function GET() {
  const session = await requireRoles("admin");
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const engineers = await repo.listEngineers();
  return NextResponse.json({ ok: true, engineers });
}

export async function POST(req: Request) {
  const session = await requireRoles("admin");
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as any;
  if (!body) {
    return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 });
  }

  const email = String(body.email || "").trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ ok: false, error: "Email is required" }, { status: 400 });
  }

  const name = body.name ? String(body.name).trim() : undefined;
  const phone = body.phone ? String(body.phone).trim() : undefined;

  const engineer = await repo.createEngineer({ email, name, phone });
  if (!engineer) {
    return NextResponse.json({ ok: false, error: "Failed to create engineer" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, engineer });
}
