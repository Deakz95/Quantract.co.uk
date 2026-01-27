import { NextResponse } from "next/server";
import { createAuthClient } from "@neondatabase/auth/next";
import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function POST() {
  try {
    const authClient = createAuthClient();

    // Get current session from cookies
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("auth-token")?.value;

    if (!sessionToken) {
      return NextResponse.json(
        { ok: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Get current user
    const session = await authClient.getSession({
      fetchOptions: {
        headers: {
          cookie: `auth-token=${sessionToken}`,
        },
      },
    });

    if (!session?.data?.user?.email) {
      return NextResponse.json(
        { ok: false, error: "No user found in session" },
        { status: 401 }
      );
    }

    // Send verification email
    const { error } = await authClient.sendVerificationEmail({
      email: session.data.user.email,
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
    console.error("[resend-verification] Unexpected error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to send verification email" },
      { status: 500 }
    );
  }
}
