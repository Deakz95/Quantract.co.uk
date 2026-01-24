
import { NextResponse } from "next/server";
import { rateLimit, getClientIp } from "@/lib/server/rateLimit";

export async function GET(req:Request){
  const ip = getClientIp(req as any);
  const rl = rateLimit({ key: `geo-autocomplete:${ip}`, limit: 60, windowMs: 60 * 1000 });
  if (!rl.ok) {
    return NextResponse.json({ ok:false, error:{ code:"RATE_LIMITED", message:"Too many requests." } }, { status:429, headers:{"retry-after": String(Math.ceil((rl.resetAt - Date.now())/1000))} });
  }
  const q=new URL(req.url).searchParams.get("q");
  if(!q) return NextResponse.json({ok:true,data:[]});
  // proxy placeholder
  return NextResponse.json({ok:true,data:[{description:q,placeId:"mock"}]});
}
