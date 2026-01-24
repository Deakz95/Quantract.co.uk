import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { requireRole } from "@/lib/serverAuth";
import { withRequestLogging } from "@/lib/server/observability";
export const runtime = "nodejs";
function base64url(b: Buffer) {
  return b.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
export const GET = withRequestLogging(async function GET(_req: Request) {
  await requireRole("admin");
  const clientId = process.env.XERO_CLIENT_ID || "";
  const redirectUri = process.env.XERO_REDIRECT_URI || "";
  if (!clientId || !redirectUri) {
    return NextResponse.json({
      ok: false,
      error: "missing_xero_env"
    }, {
      status: 400
    });
  }
  const state = base64url(crypto.randomBytes(16));
  const verifier = base64url(crypto.randomBytes(32));
  const challenge = base64url(crypto.createHash("sha256").update(verifier).digest());
  const scopes = (process.env.XERO_SCOPES || "offline_access accounting.transactions accounting.contacts accounting.settings").trim();
  const url = new URL("https://login.xero.com/identity/connect/authorize");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", scopes);
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  const res = NextResponse.json({
    ok: true,
    url: url.toString()
  });
  // Store state + verifier in HttpOnly cookies (10 min) so callback can validate
  res.cookies.set("xero_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/"
  });
  res.cookies.set("xero_oauth_verifier", verifier, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/"
  });
  return res;
});
