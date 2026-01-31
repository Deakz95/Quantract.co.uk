import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { validateMagicLink } from "@/lib/server/authDb";
import { getPrisma } from "@/lib/server/prisma";

export const runtime = "nodejs";

const schema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid request" },
        { status: 400 }
      );
    }

    const { token, newPassword } = parsed.data;

    const result = await validateMagicLink(token);

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    const db = getPrisma();

    await db.user.update({
      where: { id: result.user.id },
      data: { passwordHash },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[reset-password] Unexpected error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to reset password. Please try again." },
      { status: 500 }
    );
  }
}
