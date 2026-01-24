import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/serverAuth";
import * as repo from "@/lib/server/repo";
import { withRequestLogging } from "@/lib/server/observability";
export const runtime = "nodejs";
function basicAuth(clientId: string, clientSecret: string) {
  return Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
}
export const GET = withRequestLogging(async function GET(req: NextRequest) {
  await requireRole("admin");
  const url = new URL(req.url);
  const code = url.searchParams.get("code") || "";
  const state = url.searchParams.get("state") || "";
  const expectedState = req.cookies.get("xero_oauth_state")?.value || "";
  const verifier = req.cookies.get("xero_oauth_verifier")?.value || "";
  if (!code || !state || state !== expectedState || !verifier) {
    return NextResponse.json({
      ok: false,
      error: "bad_oauth_state"
    }, {
      status: 400
    });
  }
  const clientId = process.env.XERO_CLIENT_ID || "";
  const clientSecret = process.env.XERO_CLIENT_SECRET || "";
  const redirectUri = process.env.XERO_REDIRECT_URI || "";
  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.json({
      ok: false,
      error: "missing_xero_env"
    }, {
      status: 400
    });
  }

  // Exchange code for token
  const tokenRes = await fetch("https://identity.xero.com/connect/token", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      authorization: `Basic ${basicAuth(clientId, clientSecret)}`
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      code_verifier: verifier
    })
  });
  const tokenJson = (await tokenRes.json().catch(() => null)) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  } | null;
  if (!tokenRes.ok || !tokenJson?.access_token) {
    return NextResponse.json({
      ok: false,
      error: "token_exchange_failed",
      details: tokenJson
    }, {
      status: 400
    });
  }
  const accessToken = String(tokenJson.access_token);
  const refreshToken = String(tokenJson.refresh_token || "");
  const expiresIn = Number(tokenJson.expires_in || 1800);
  const expiresAtISO = new Date(Date.now() + expiresIn * 1000).toISOString();

  // Fetch tenant connection
  const connRes = await fetch("https://api.xero.com/connections", {
    headers: {
      authorization: `Bearer ${accessToken}`
    }
  });
  const conns = (await connRes.json().catch(() => [])) as Array<{ tenantId?: string }>;
  const tenantId = Array.isArray(conns) && conns[0]?.tenantId ? String(conns[0].tenantId) : "";
  await repo.setCompanyXeroConnection({
    xeroConnected: true,
    xeroTenantId: tenantId || null,
    xeroAccessToken: accessToken,
    xeroRefreshToken: refreshToken || null,
    xeroTokenExpiresAtISO: expiresAtISO
  });
  const res = NextResponse.redirect(new URL("/admin/settings?xero=connected", req.url));
  res.cookies.set("xero_oauth_state", "", {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 0,
    path: "/"
  });
  res.cookies.set("xero_oauth_verifier", "", {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 0,
    path: "/"
  });
  return res;
});
