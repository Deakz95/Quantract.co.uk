export const dynamic = "force-dynamic";
export const revalidate = 0;


import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/serverAuth";
import { p } from "@/lib/server/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  const ctx = await requireRole("admin");
  const prisma = p();

  const job = await prisma.job.findFirst({
    where: { id: (await params).jobId, companyId: ctx.companyId },
    include: {
      invoices: true,
      costItems: true,
      budgetLines: true
    }
  });

  if (!job) {
    return NextResponse.json({ ok:false, error:{message:"Not found"}},{status:404});
  }

  const budgetTotal = job.budgetLines.reduce((a: number, b: any)=>a+Number(b.amount||0),0);
  const actualCost = job.costItems.reduce((a: number, c: any)=>a+Number(c.amount||0),0);
  const invoiced = job.invoices.reduce((a: number, i: any)=>a+Number(i.total||0),0);

  return NextResponse.json({
    ok:true,
    data:{
      job:{id:job.id,name:job.name,status:job.status},
      revenue:{contractValue:job.contractTotal,invoicedToDate:invoiced},
      costs:{budgetTotal,actualCost},
      forecast:{forecastMargin:(job.contractTotal||0)-actualCost}
    }
  });
}
