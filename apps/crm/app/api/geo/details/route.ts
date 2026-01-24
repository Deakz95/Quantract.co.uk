
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";

export async function GET(req:Request){
  const ip = (req.headers.get('x-forwarded-for') || 'local').split(',')[0].trim();
  const rl = rateLimit({ key: `geo:${ip}`, limit: 60, windowMs: 60_000 });
  if (!rl.ok) return NextResponse.json({ ok:false, error:{ code:'RATE_LIMIT', message:'Too many requests' }},{ status:429 });
  const id=new URL(req.url).searchParams.get("placeId");
  return NextResponse.json({ok:true,data:{placeId:id}});
}
