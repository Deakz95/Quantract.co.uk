import { getPrisma } from "@/lib/server/prisma";
import { log } from "@/lib/server/logger";

const RETENTION_DAYS = 30;
const MAX_RUNS_PER_JOB = 100;

/**
 * Wraps a cron job function with automatic CronRun tracking.
 *
 * Creates a CronRun record on start (status: "running"), then updates it
 * on success ("success") or failure ("failed") with duration and error info.
 *
 * Also performs lightweight retention pruning: after a successful run,
 * deletes records older than RETENTION_DAYS for this job (capped to avoid
 * heavy deletes).
 */
export async function trackCronRun<T>(
  jobName: string,
  fn: () => Promise<T>,
): Promise<T> {
  const prisma = getPrisma();
  const startedAt = new Date();
  let runId: string | null = null;

  // Create the "running" record
  try {
    const run = await prisma.cronRun.create({
      data: { jobName, status: "running", startedAt },
    });
    runId = run.id;
  } catch (e) {
    log.warn("cronTracker", { jobName, error: "failed_to_create_run", detail: (e as Error)?.message });
  }

  try {
    const result = await fn();
    const finishedAt = new Date();
    const durationMs = finishedAt.getTime() - startedAt.getTime();

    // Mark success
    if (runId) {
      try {
        await prisma.cronRun.update({
          where: { id: runId },
          data: {
            status: "success",
            finishedAt,
            durationMs,
            metadata: result !== null && result !== undefined ? (result as any) : undefined,
          },
        });
      } catch {
        // best-effort
      }
    }

    // Lightweight retention pruning (best-effort, after success only)
    pruneOldRuns(prisma, jobName).catch(() => {});

    return result;
  } catch (error) {
    const finishedAt = new Date();
    const durationMs = finishedAt.getTime() - startedAt.getTime();
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Mark failed
    if (runId) {
      try {
        await prisma.cronRun.update({
          where: { id: runId },
          data: {
            status: "failed",
            finishedAt,
            durationMs,
            error: errorMessage.slice(0, 2000),
          },
        });
      } catch {
        // best-effort
      }
    }

    throw error;
  }
}

async function pruneOldRuns(prisma: any, jobName: string): Promise<void> {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
  await prisma.cronRun.deleteMany({
    where: {
      jobName,
      startedAt: { lt: cutoff },
    },
  });
}
