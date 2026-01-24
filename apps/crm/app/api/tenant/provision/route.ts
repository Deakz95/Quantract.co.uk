import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    ok: true,
    data: { message: "Tenant provisioning is handled automatically on first Neon Auth sign-in." }
  });
}
