import { NextResponse } from "next/server";
import { requireRole, getUserEmail } from "@/lib/serverAuth";
import * as repo from "@/lib/server/repo";
import { withRequestLogging } from "@/lib/server/observability";
export const GET = withRequestLogging(async function GET() {
  await requireRole("client");
  const email = (await getUserEmail()) || "";
  if (!email) return NextResponse.json({
    ok: false,
    error: "Missing email"
  }, {
    status: 400
  });
  const certificates = await repo.listIssuedCertificatesForClientEmail(email);
  return NextResponse.json({
    ok: true,
    certificates
  });
});
