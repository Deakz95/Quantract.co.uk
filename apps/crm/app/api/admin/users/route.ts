import { NextResponse } from "next/server";
import { requireRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging } from "@/lib/server/observability";

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
  await requireRole("admin");
  const client = getPrisma();

  if (!client || process.env.QT_USE_PRISMA !== "1") {
    return NextResponse.json(
      {
        ok: false,
        error: "User management requires QT_USE_PRISMA=1 and DATABASE_URL",
      },
      { status: 503 }
    );
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
});

export const POST = withRequestLogging(async function POST(req: Request) {
  await requireRole("admin");
  const client = getPrisma();

  if (!client || process.env.QT_USE_PRISMA !== "1") {
    return NextResponse.json(
      {
        ok: false,
        error: "User management requires QT_USE_PRISMA=1 and DATABASE_URL",
      },
      { status: 503 }
    );
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
    return NextResponse.json({ ok: false, error: "Invalid email" }, { status: 400 });
  }

  if (!password || password.length < 8) {
    return NextResponse.json(
      { ok: false, error: "Password must be at least 8 characters" },
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
});

