import { NextResponse } from "next/server";
import { requireRoles } from "@/lib/serverAuth";

export async function GET() {
  const session = await requireRoles("admin");
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  // Quote templates not yet implemented — return empty list
  return NextResponse.json({ ok: true, templates: [] });
}
