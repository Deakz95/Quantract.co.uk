import { NextResponse } from "next/server";
import { createAuthClient } from "@neondatabase/auth/next";

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

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { ok: false, error: "Invalid email address" },
        { status: 400 }
      );
    }

    // Use Neon Auth to send password reset email
    const authClient = createAuthClient();
    const { error } = await authClient.forgetPassword.emailOtp({
      email,
    });

    if (error) {
      console.error("[forgot-password] Error:", error);
      // Don't reveal if the email exists or not for security
      // Always return success to prevent email enumeration
    }

    // Always return success to prevent email enumeration attacks
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
