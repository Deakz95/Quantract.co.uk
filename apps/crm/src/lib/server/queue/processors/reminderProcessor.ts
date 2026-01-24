import { Job } from "bullmq";
import { ReminderJob } from "../queueConfig";
import { getPrisma } from "../../prisma";
import { getEmailQueue } from "../queueConfig";
import crypto from "crypto";

/**
 * Invoice Reminder Job Processor
 *
 * CRITICAL: This processor MUST be idempotent.
 * - Check if reminder already sent
 * - Prevent duplicate reminders
 * - Handle retries safely
 */

export async function processReminderJob(job: Job<ReminderJob>): Promise<void> {
  const { invoiceId, companyId, reminderType, idempotencyKey } = job.data;

  console.log(
    `[ReminderProcessor] Processing job ${job.id}: ${reminderType} reminder for invoice ${invoiceId}`
  );

  const db = getPrisma();
  if (!db) {
    throw new Error("Database not available");
  }

  // CRITICAL: Check idempotency - has this reminder already been sent?
  const existing = await db.auditEvent.findFirst({
    where: {
      action: "invoice.reminder.sent",
      metadata: {
        path: ["idempotencyKey"],
        equals: idempotencyKey,
      },
    },
  });

  if (existing) {
    console.log(
      `[ReminderProcessor] Reminder already sent (idempotency key: ${idempotencyKey})`
    );
    return; // Idempotent - skip duplicate send
  }

  try {
    // Get invoice details
    const invoice = await db.invoice.findFirst({
      where: { id: invoiceId, companyId },
      include: {
        client: { select: { name: true, email: true } },
      },
    });

    if (!invoice) {
      throw new Error(`Invoice ${invoiceId} not found`);
    }

    // Check if invoice is still unpaid
    if (invoice.status === "paid") {
      console.log(`[ReminderProcessor] Invoice ${invoiceId} is already paid, skipping reminder`);
      return;
    }

    // Enqueue email job
    const emailQueue = getEmailQueue();
    await emailQueue.add(
      "send-reminder",
      {
        to: invoice.client?.email || "",
        subject: `Payment Reminder: Invoice ${invoice.invoiceNumber}`,
        html: `<p>This is a ${reminderType} reminder that invoice ${invoice.invoiceNumber} is overdue.</p>
               <p>Amount due: £${((invoice.grandTotal || 0) / 100).toFixed(2)}</p>`,
        idempotencyKey: `reminder-email-${idempotencyKey}`,
      },
      { jobId: `reminder-email-${idempotencyKey}` }
    );

    // Record reminder sent
    await db.auditEvent.create({
      data: {
        id: crypto.randomUUID(),
        companyId,
        userId: null,
        action: "invoice.reminder.sent",
        entityType: "invoice",
        entityId: invoiceId,
        metadata: {
          reminderType,
          idempotencyKey,
          sentAt: new Date().toISOString(),
          jobId: job.id,
        },
        ipAddress: null,
        userAgent: null,
        createdAt: new Date(),
      },
    });

    console.log(`[ReminderProcessor] Reminder sent for invoice ${invoiceId}`);
  } catch (error) {
    console.error(`[ReminderProcessor] Failed to send reminder:`, error);

    // Log failure
    await db.auditEvent.create({
      data: {
        id: crypto.randomUUID(),
        companyId,
        userId: null,
        action: "invoice.reminder.failed",
        entityType: "invoice",
        entityId: invoiceId,
        metadata: {
          reminderType,
          idempotencyKey,
          error: error instanceof Error ? error.message : String(error),
          attempt: job.attemptsMade,
          jobId: job.id,
        },
        ipAddress: null,
        userAgent: null,
        createdAt: new Date(),
      },
    });

    throw error; // Re-throw to trigger retry
  }
}
