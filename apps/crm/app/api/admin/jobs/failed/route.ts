import { NextResponse } from "next/server";
import { requireRoles } from "@/lib/serverAuth";
import { getEmailQueue, getPDFQueue, getReminderQueue } from "@/lib/server/queue/queueConfig";
import { withRequestLogging } from "@/lib/server/observability";

function jsonOk(data: Record<string, unknown>, status = 200) {
  return NextResponse.json({ ok: true, ...data }, { status });
}

function jsonErr(error: unknown, status = 400) {
  const msg = error instanceof Error ? error.message : String(error || "Request failed");
  return NextResponse.json({ ok: false, error: msg }, { status });
}

export const GET = withRequestLogging(async function GET() {
  try {
    await requireRoles("admin");

    const emailQueue = getEmailQueue();
    const pdfQueue = getPDFQueue();
    const reminderQueue = getReminderQueue();

    // Get failed jobs from all queues (BullMQ: getFailed returns Promise)
    const [emailFailed, pdfFailed, reminderFailed] = await Promise.all([
      emailQueue.getFailed(0, 100),
      pdfQueue.getFailed(0, 100),
      reminderQueue.getFailed(0, 100),
    ]);

    const failedJobs = [
      ...emailFailed.map((job) => ({
        id: job.id || "",
        queue: "email",
        data: job.data,
        failedReason: job.failedReason || "",
        attemptsMade: job.attemptsMade,
        processedOn: job.processedOn,
        finishedOn: job.finishedOn,
      })),
      ...pdfFailed.map((job) => ({
        id: job.id || "",
        queue: "pdf",
        data: job.data,
        failedReason: job.failedReason || "",
        attemptsMade: job.attemptsMade,
        processedOn: job.processedOn,
        finishedOn: job.finishedOn,
      })),
      ...reminderFailed.map((job) => ({
        id: job.id || "",
        queue: "reminder",
        data: job.data,
        failedReason: job.failedReason || "",
        attemptsMade: job.attemptsMade,
        processedOn: job.processedOn,
        finishedOn: job.finishedOn,
      })),
    ];

    // Sort by most recent first
    failedJobs.sort((a, b) => (b.finishedOn || 0) - (a.finishedOn || 0));

    return jsonOk({
      failedJobs,
      count: failedJobs.length,
    });
  } catch (e: any) {
    if (e?.status === 401) return jsonErr("unauthorized", 401);
    if (e?.status === 403) return jsonErr("forbidden", 403);
    console.error("[GET /api/admin/jobs/failed] Error:", e);
    return jsonErr(e, 500);
  }
});

export const POST = withRequestLogging(async function POST(req: Request) {
  try {
    await requireRoles("admin");

    const body = (await req.json().catch(() => ({}))) as {
      action: "retry" | "remove";
      jobId: string;
      queue: "email" | "pdf" | "reminder";
    };

    if (!body.jobId || !body.queue || !body.action) {
      return jsonErr("Missing required fields", 400);
    }

    const queue =
      body.queue === "email"
        ? getEmailQueue()
        : body.queue === "pdf"
        ? getPDFQueue()
        : getReminderQueue();

    const job = await queue.getJob(body.jobId);

    if (!job) {
      return jsonErr("Job not found", 404);
    }

    if (body.action === "retry") {
      await job.retry();
      return jsonOk({ message: "Job queued for retry", jobId: body.jobId });
    } else if (body.action === "remove") {
      await job.remove();
      return jsonOk({ message: "Job removed", jobId: body.jobId });
    }

    return jsonErr("Invalid action", 400);
  } catch (e: any) {
    if (e?.status === 401) return jsonErr("unauthorized", 401);
    if (e?.status === 403) return jsonErr("forbidden", 403);
    console.error("[POST /api/admin/jobs/failed] Error:", e);
    return jsonErr(e, 500);
  }
});
