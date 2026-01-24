import { NextRequest, NextResponse } from "next/server";

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

async function getNeonHandlers(): Promise<NeonHandlerObj | null> {
  const baseUrl = process.env.NEON_AUTH_BASE_URL || process.env.NEON_AUTH_URL || "";
  if (!baseUrl) return null;

  // Lazy import so missing env never crashes build-time evaluation
  const mod = await import("@neondatabase/auth/next/server");
  const authApiHandler = (mod as any).authApiHandler as () => NeonHandlerObj;

  return authApiHandler();
}

async function call(method: keyof NeonHandlerObj, req: NextRequest, ctx: Ctx) {
  const handlers = await getNeonHandlers();

  if (!handlers || !handlers[method]) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "NEON_AUTH_NOT_CONFIGURED",
          message:
            "Neon Auth is not configured. Set NEON_AUTH_BASE_URL (or NEON_AUTH_URL) in your environment.",
        },
      },
      { status: 500 }
    );
  }

  return handlers[method]!(req as any, ctx as any);
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
