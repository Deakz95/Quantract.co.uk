import "server-only";
import { Queue, QueueOptions } from "bullmq";
import { createRedisConnection } from "./redisConnection";

/**
 * Queue Configuration
 *
 * Provides durable, retryable background job processing using BullMQ + Redis.
 *
 * CRITICAL: All jobs MUST be idempotent and retry-safe.
 */

// Queue instances
let emailQueue: Queue | null = null;
let pdfQueue: Queue | null = null;
let reminderQueue: Queue | null = null;

// Default job options
const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: {
    type: "exponential" as const,
    delay: 2000, // Start with 2 seconds
  },
  removeOnComplete: 100, // Keep last 100 completed jobs
  removeOnFail: false, // Keep failed jobs for inspection
};

// Queue options with Redis connection
function getQueueOptions(options?: Partial<QueueOptions>): QueueOptions {
  return {
    connection: createRedisConnection(),
    defaultJobOptions: DEFAULT_JOB_OPTIONS,
    ...options,
  };
}

export function getEmailQueue(): Queue {
  if (!emailQueue) {
    emailQueue = new Queue("email", getQueueOptions());
  }
  return emailQueue;
}

export function getPDFQueue(): Queue {
  if (!pdfQueue) {
    pdfQueue = new Queue("pdf", getQueueOptions());
  }
  return pdfQueue;
}

export function getReminderQueue(): Queue {
  if (!reminderQueue) {
    reminderQueue = new Queue("reminder", getQueueOptions());
  }
  return reminderQueue;
}

// Queue job types
export type EmailJob = {
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
  }>;
  idempotencyKey: string; // REQUIRED for deduplication
};

export type PDFJob = {
  type: "quote" | "invoice" | "certificate" | "agreement";
  entityId: string;
  companyId: string;
  idempotencyKey: string;
};

export type ReminderJob = {
  invoiceId: string;
  companyId: string;
  reminderType: "first" | "second" | "third";
  idempotencyKey: string;
};

// Graceful shutdown
export async function closeQueues() {
  const queues = [emailQueue, pdfQueue, reminderQueue].filter(Boolean);
  await Promise.all(queues.map((q) => q?.close()));
}

// Health check
export async function checkQueueHealth(): Promise<{
  healthy: boolean;
  queues: Record<string, { active: number; waiting: number; failed: number; completed: number; delayed: number }>;
}> {
  try {
    const [emailCounts, pdfCounts, reminderCounts] = await Promise.all([
      getEmailQueue().getJobCounts(),
      getPDFQueue().getJobCounts(),
      getReminderQueue().getJobCounts(),
    ]);

    return {
      healthy: true,
      queues: {
        email: emailCounts as any,
        pdf: pdfCounts as any,
        reminder: reminderCounts as any,
      },
    };
  } catch (error) {
    console.error("Queue health check failed:", error);
    return {
      healthy: false,
      queues: {},
    };
  }
}
