
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/serverAuth";
import { p } from "@/lib/server/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id:string }> }){
  const { id } = await params;
  const ctx=await requireRole("admin");
  const body=await req.json();
  const prisma=p();
  await prisma.enquiry.update({
    where:{id:id,companyId:ctx.companyId},
    data:{stageId:body.toStageId}
  });
  await prisma.enquiryEvent.create({
    data:{
      companyId:ctx.companyId,
      enquiryId:id,
      type:"STAGE_CHANGE",
      note:body.note
    }
  });
  return NextResponse.json({ok:true});
}
