import { NextResponse } from "next/server";
import { findUserByEmail, createPasswordResetToken } from "@/lib/server/authDb";
import { sendPasswordResetEmail } from "@/lib/server/email";
import { absoluteUrl } from "@/lib/server/email";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body?.email || "").trim().toLowerCase();

    if (!email) {
      return NextResponse.json(
        { ok: false, error: "Email is required" },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { ok: false, error: "Invalid email address" },
        { status: 400 }
      );
    }

    const user = await findUserByEmail(email);

    if (user) {
      const ip = request.headers.get("x-forwarded-for") ?? null;
      const { raw } = await createPasswordResetToken(user.id, ip);
      const resetLink = absoluteUrl(`/auth/reset-password?token=${raw}`);
      await sendPasswordResetEmail({ to: email, resetLink });
    }

    // Always return success to prevent email enumeration
    return NextResponse.json({
      ok: true,
      message: "If an account with that email exists, a password reset link has been sent.",
    });
  } catch (error) {
    console.error("[forgot-password] Unexpected error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to process request. Please try again." },
      { status: 500 }
    );
  }
}
