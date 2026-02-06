import { NextRequest, NextResponse } from "next/server";
import { createNeonAuth } from "@neondatabase/auth/next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = Record<string, string>;
type Ctx = { params: Promise<Params> };

type NeonHandlerObj = {
  GET?: (request: Request, ctx: { params: Promise<Params> }) => Promise<Response>;
  POST?: (request: Request, ctx: { params: Promise<Params> }) => Promise<Response>;
  PUT?: (request: Request, ctx: { params: Promise<Params> }) => Promise<Response>;
  DELETE?: (request: Request, ctx: { params: Promise<Params> }) => Promise<Response>;
  PATCH?: (request: Request, ctx: { params: Promise<Params> }) => Promise<Response>;
};

/**
 * Log auth request details for debugging origin issues.
 * Only logs non-sensitive headers (origin, host, referer).
 */
function logAuthRequest(method: string, req: NextRequest, path: string) {
  const origin = req.headers.get("origin") || "(none)";
  const host = req.headers.get("host") || "(none)";
  const referer = req.headers.get("referer") || "(none)";
  const trustedOrigins = process.env.BETTER_AUTH_TRUSTED_ORIGINS || "(not set)";

  console.log(`[Auth] ${method} /api/auth/${path}`, {
    origin,
    host,
    referer,
    trustedOrigins,
    neonAuthConfigured: Boolean(process.env.NEON_AUTH_BASE_URL),
  });
}

/**
 * Log auth response for debugging.
 */
function logAuthResponse(method: string, path: string, status: number) {
  if (status >= 400) {
    console.warn(`[Auth] ${method} /api/auth/${path} responded with ${status}`);
  }
}

let _handlers: NeonHandlerObj | null = null;

function getNeonHandlers(): NeonHandlerObj | null {
  if (_handlers) return _handlers;
  const baseUrl = process.env.NEON_AUTH_BASE_URL || process.env.NEON_AUTH_URL || "";
  const secret = process.env.NEON_AUTH_COOKIE_SECRET || "";
  if (!baseUrl || !secret) return null;
  const auth = createNeonAuth({ baseUrl, cookies: { secret } });
  _handlers = auth.handler() as NeonHandlerObj;
  return _handlers;
}

async function call(method: keyof NeonHandlerObj, req: NextRequest, ctx: Ctx) {
  const params = await ctx.params;
  const path = Array.isArray(params.path) ? params.path.join("/") : (params.path || "");

  // Log request details for debugging
  logAuthRequest(method, req, path);

  const handlers = getNeonHandlers();

  if (!handlers || !handlers[method]) {
    console.error(`[Auth] Neon Auth not configured - NEON_AUTH_BASE_URL or NEON_AUTH_COOKIE_SECRET missing`);
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "NEON_AUTH_NOT_CONFIGURED",
          message:
            "Neon Auth is not configured. Set NEON_AUTH_BASE_URL and NEON_AUTH_COOKIE_SECRET in your environment.",
        },
      },
      { status: 500 }
    );
  }

  try {
    const response = await handlers[method]!(req as any, { params: Promise.resolve(params) } as any);
    logAuthResponse(method, path, response.status);
    return response;
  } catch (error) {
    console.error(`[Auth] Error in ${method} /api/auth/${path}:`, error);
    throw error;
  }
}

export async function GET(req: NextRequest, ctx: Ctx) {
  return call("GET", req, ctx);
}
export async function POST(req: NextRequest, ctx: Ctx) {
  return call("POST", req, ctx);
}
export async function PUT(req: NextRequest, ctx: Ctx) {
  return call("PUT", req, ctx);
}
export async function DELETE(req: NextRequest, ctx: Ctx) {
  return call("DELETE", req, ctx);
}
export async function PATCH(req: NextRequest, ctx: Ctx) {
  return call("PATCH", req, ctx);
}
