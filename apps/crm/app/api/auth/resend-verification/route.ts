import { NextResponse } from "next/server";
import { createAuthClient } from "@neondatabase/auth/next";
import { requireAuth } from "@/lib/serverAuth";

export const runtime = "nodejs";

export async function POST() {
  try {
    let ctx;
    try {
      ctx = await requireAuth();
    } catch (e: any) {
      return NextResponse.json(
        { ok: false, error: e?.message || "Not authenticated" },
        { status: e?.status || 401 }
      );
    }

    if (!ctx.email) {
      return NextResponse.json(
        { ok: false, error: "No email found for user" },
        { status: 401 }
      );
    }

    const authClient = createAuthClient();

    // Send verification email
    const { error } = await authClient.sendVerificationEmail({
      email: ctx.email,
    });

    if (error) {
      console.error("[resend-verification] Error:", error);
      return NextResponse.json(
        { ok: false, error: "Failed to send verification email" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Verification email sent",
    });
  } catch (error) {
    const err = error as any;
    if (err?.status === 401 || err?.status === 403) {
      return NextResponse.json({ ok: false, error: err.message || "forbidden" }, { status: err.status });
    }
    console.error("[resend-verification] Unexpected error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to send verification email" },
      { status: 500 }
    );
  }
}
