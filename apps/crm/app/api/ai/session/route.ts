import { NextRequest, NextResponse } from "next/server";
import { requireCompanyContext } from "@/lib/serverAuth";
import { resolveAIPermissionContext } from "@/lib/ai/aiPermissionContext";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireCompanyContext();
    const permCtx = await resolveAIPermissionContext(ctx);
    return NextResponse.json({
      authenticated: true,
      session: {
        role: permCtx.effectiveRole,
        companyId: permCtx.companyId,
        userId: permCtx.userId,
        userEmail: permCtx.email,
      },
      allowedModes: permCtx.allowedModes,
      defaultMode: permCtx.resolvedMode,
      canSeeFinancials: permCtx.canSeeFinancials,
    });
  } catch {
    return NextResponse.json({ authenticated: false, session: null });
  }
}
