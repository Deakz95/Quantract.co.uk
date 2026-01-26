import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging, logError } from "@/lib/server/observability";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

export const runtime = "nodejs";

async function hashPassword(password: string): Promise<string> {
  const bcrypt = await import("bcryptjs");
  return bcrypt.hash(password, 12);
}

function normEmail(email?: string) {
  return String(email || "").trim().toLowerCase();
}

type UserRow = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: Date;
};

export const GET = withRequestLogging(async function GET() {
  try {
    const authCtx = await getAuthContext();
    if (!authCtx) {
      return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    }

    if (authCtx.role !== "admin") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const client = getPrisma();
    if (!client) {
      return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });
    }

    const rows = await client.user.findMany({
      where: { role: "engineer" },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      ok: true,
      data: (rows as UserRow[]).map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        createdAt: u.createdAt,
      })),
    });
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError) {
      logError(error, { route: "/api/admin/users", action: "list" });
      return NextResponse.json({ ok: false, error: "database_error", code: error.code }, { status: 409 });
    }
    logError(error, { route: "/api/admin/users", action: "list" });
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }
});

export const POST = withRequestLogging(async function POST(req: Request) {
  try {
    const authCtx = await getAuthContext();
    if (!authCtx) {
      return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    }

    if (authCtx.role !== "admin") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const client = getPrisma();
    if (!client) {
      return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });
    }

    const body = (await req.json().catch(() => null)) as null | {
      email?: string;
      name?: string;
      password?: string;
    };

    const email = normEmail(body?.email);
    const name = body?.name ? String(body.name).trim() : null;
    const password = String(body?.password || "");

    if (!email || !email.includes("@")) {
      return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
    }

    if (!password || password.length < 8) {
      return NextResponse.json(
        { ok: false, error: "password_too_short" },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);

    const user = await client.user.upsert({
      where: { email } as any,
      update: {
        role: "engineer",
        name,
        passwordHash,
      },
      create: {
        role: "engineer",
        email,
        name,
        passwordHash,
      },
    });

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError) {
      logError(error, { route: "/api/admin/users", action: "create" });
      return NextResponse.json({ ok: false, error: "database_error", code: error.code }, { status: 409 });
    }
    logError(error, { route: "/api/admin/users", action: "create" });
    return NextResponse.json({ ok: false, error: "create_failed" }, { status: 500 });
  }
});

