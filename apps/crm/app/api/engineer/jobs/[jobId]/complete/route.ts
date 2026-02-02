import { NextResponse } from "next/server";
import { requireRole, getUserEmail } from "@/lib/serverAuth";
import * as repo from "@/lib/server/repo";
import { withRequestLogging } from "@/lib/server/observability";

export const POST = withRequestLogging(async function POST(
  _req: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    await requireRole("engineer");
    const email = await getUserEmail();
    if (!email)
      return NextResponse.json({ ok: false, error: "Missing engineer email" }, { status: 401 });

    const { jobId } = await params;
    if (!jobId)
      return NextResponse.json({ ok: false, error: "jobId is required" }, { status: 400 });

    // Verify the engineer is assigned to this job
    const job = await repo.getJobForEngineer(jobId, email);
    if (!job)
      return NextResponse.json({ ok: false, error: "Job not found or not assigned to you" }, { status: 404 });

    const updated = await repo.updateJob(jobId, { status: "completed" as any });
    if (!updated)
      return NextResponse.json({ ok: false, error: "Could not complete job" }, { status: 500 });

    return NextResponse.json({ ok: true, job: updated });
  } catch (e: any) {
    if (e?.status === 401) return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    console.error("[POST /api/engineer/jobs/[jobId]/complete]", e);
    return NextResponse.json({ ok: false, error: "Could not complete job. Please try again." }, { status: 500 });
  }
});
