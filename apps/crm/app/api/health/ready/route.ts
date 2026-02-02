import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/server/prisma";

/** Readiness probe — returns 200 only when all critical dependencies are reachable. */
export async function GET() {
  try {
    const db = getPrisma();
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ready" });
  } catch {
    return NextResponse.json({ status: "not_ready" }, { status: 503 });
  }
}
