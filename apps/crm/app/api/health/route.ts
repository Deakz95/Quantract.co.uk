import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/server/prisma";

export async function GET() {
  try {
    const db = getPrisma();
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      app: "crm",
      database: "connected",
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        database: "disconnected",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503 }
    );
  }
}
