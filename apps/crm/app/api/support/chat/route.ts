import { rateLimit, getClientIp } from "@/lib/server/rateLimit";

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/serverAuth";

export async function POST(req:Request){
  const ip = getClientIp(req as any);
  const rl = rateLimit({ key: `support-chat:${ip}`, limit: 30, windowMs: 5 * 60 * 1000 });
  if (!rl.ok) {
    return NextResponse.json({ ok:false, error:{ code:"RATE_LIMITED", message:"Too many messages. Try again shortly." } }, { status:429, headers:{"retry-after": String(Math.ceil((rl.resetAt - Date.now())/1000))} });
  }
  const ctx=await requireRole("admin");
  const body=await req.json();
  // forward to existing AI chat internally (simplified)
  return NextResponse.json({
    ok:true,
    data:{
      reply:"Support assistant placeholder",
      context:{companyId:ctx.companyId,role:ctx.role}
    }
  });
}
