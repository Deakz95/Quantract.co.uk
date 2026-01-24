
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/serverAuth";
import { p } from "@/lib/server/prisma";

export async function POST(req:Request){
  const ctx=await requireRole("admin");
  const body=await req.json();
  const prisma=p();
  const row=await prisma.stockMovement.create({
    data:{
      companyId:ctx.companyId,
      stockItemId:body.stockItemId,
      type:body.type,
      qtyDelta:body.qtyDelta,
      refType:body.refType,
      refId:body.refId
    }
  });
  return NextResponse.json({ok:true,data:row});
}
