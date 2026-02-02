import { NextResponse } from "next/server";

/** Liveness probe — process is running, always 200. */
export function GET() {
  return NextResponse.json({ status: "alive" });
}
