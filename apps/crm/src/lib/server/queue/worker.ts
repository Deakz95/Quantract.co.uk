import { Worker } from "bullmq";
import { createRedisConnection } from "./redisConnection";
import { processEmailJob } from "./processors/emailProcessor";
import { processPDFJob } from "./processors/pdfProcessor";
import { processReminderJob } from "./processors/reminderProcessor";

/**
 * Queue Worker
 *
 * Starts background job processors for all queues.
 * MUST be run as a separate process or serverless function.
 *
 * Usage:
 * - Development: tsx src/lib/server/queue/worker.ts
 * - Production: Separate container/process
 */

let emailWorker: Worker | null = null;
let pdfWorker: Worker | null = null;
let reminderWorker: Worker | null = null;

export function startWorker() {
  console.log("[Worker] Starting queue workers...");

  // Email worker
  emailWorker = new Worker(
    "email",
    async (job) => {
      try {
        await processEmailJob(job);
      } catch (error) {
        console.error(`[Worker] Email job ${job.id} failed:`, error);
        throw error; // Re-throw to mark job as failed
      }
    },
    {
      connection: createRedisConnection(),
      concurrency: 5,
    }
  );

  // PDF worker
  pdfWorker = new Worker(
    "pdf",
    async (job) => {
      try {
        await processPDFJob(job);
      } catch (error) {
        console.error(`[Worker] PDF job ${job.id} failed:`, error);
        throw error;
      }
    },
    {
      connection: createRedisConnection(),
      concurrency: 3,
    }
  );

  // Reminder worker
  reminderWorker = new Worker(
    "reminder",
    async (job) => {
      try {
        await processReminderJob(job);
      } catch (error) {
        console.error(`[Worker] Reminder job ${job.id} failed:`, error);
        throw error;
      }
    },
    {
      connection: createRedisConnection(),
      concurrency: 5,
    }
  );

  // Event handlers for email worker
  emailWorker.on("completed", (job) => {
    console.log(`[Worker] Email job ${job.id} completed`);
  });

  emailWorker.on("failed", (job, err) => {
    console.error(`[Worker] Email job ${job?.id} failed after ${job?.attemptsMade} attempts:`, err);
  });

  // Event handlers for PDF worker
  pdfWorker.on("completed", (job) => {
    console.log(`[Worker] PDF job ${job.id} completed`);
  });

  pdfWorker.on("failed", (job, err) => {
    console.error(`[Worker] PDF job ${job?.id} failed after ${job?.attemptsMade} attempts:`, err);
  });

  // Event handlers for reminder worker
  reminderWorker.on("completed", (job) => {
    console.log(`[Worker] Reminder job ${job.id} completed`);
  });

  reminderWorker.on("failed", (job, err) => {
    console.error(
      `[Worker] Reminder job ${job?.id} failed after ${job?.attemptsMade} attempts:`,
      err
    );
  });

  // Graceful shutdown
  const shutdown = async () => {
    console.log("[Worker] Shutting down workers...");
    await Promise.all([
      emailWorker?.close(),
      pdfWorker?.close(),
      reminderWorker?.close(),
    ]);
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  console.log("[Worker] All workers started successfully");
}

// Auto-start if run directly
if (require.main === module) {
  startWorker();
}
