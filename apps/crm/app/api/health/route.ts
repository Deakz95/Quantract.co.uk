import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/server/prisma";

const BUILD_SHA =
  process.env.RENDER_GIT_COMMIT ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  "dev";

export async function GET() {
  const timestamp = new Date().toISOString();
  let dbOk = false;

  try {
    const db = getPrisma();
    await db.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch {
    // db check failed
  }

  const healthy = dbOk;

  return NextResponse.json(
    {
      status: healthy ? "healthy" : "unhealthy",
      version: BUILD_SHA,
      timestamp,
      database: dbOk ? "connected" : "disconnected",
    },
    { status: healthy ? 200 : 503 },
  );
}
