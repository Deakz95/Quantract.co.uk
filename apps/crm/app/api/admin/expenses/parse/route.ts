
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/serverAuth";

/**
 * Stub OCR parser.
 * Replace with Textract / Vision later.
 */
export async function POST(req:Request){
  await requireRole("admin");
  return NextResponse.json({
    ok:true,
    data:{
      supplier:"Unknown Supplier",
      total:12345,
      vat:2057,
      date:new Date().toISOString()
    }
  });
}
