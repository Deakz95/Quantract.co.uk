import { Job } from "bullmq";
import { EmailJob } from "../queueConfig";
import { getPrisma } from "../../prisma";
import crypto from "crypto";

/**
 * Email Job Processor
 *
 * CRITICAL: This processor MUST be idempotent.
 * - Check idempotency key before sending
 * - Log all sends to prevent duplicates
 * - Handle retries safely
 */

export async function processEmailJob(job: Job<EmailJob>): Promise<void> {
  const { to, subject, html, attachments, idempotencyKey } = job.data;

  console.log(`[EmailProcessor] Processing job ${job.id}: ${subject} to ${to}`);

  const db = getPrisma();
  if (!db) {
    throw new Error("Database not available");
  }

  // CRITICAL: Check idempotency - has this email already been sent?
  const existing = await db.auditEvent.findFirst({
    where: {
      action: "email.sent",
      metadata: {
        path: ["idempotencyKey"],
        equals: idempotencyKey,
      },
    },
  });

  if (existing) {
    console.log(`[EmailProcessor] Email already sent (idempotency key: ${idempotencyKey})`);
    return; // Idempotent - skip duplicate send
  }

  // Send email using existing email service
  // For now, we'll simulate email sending
  // In production, this would call Resend API
  try {
    // TODO: Integrate with actual email service
    // await sendEmail({ to, subject, html, attachments });

    console.log(`[EmailProcessor] Email sent: ${subject} to ${to}`);

    // Record successful send
    await db.auditEvent.create({
      data: {
        id: crypto.randomUUID(),
        companyId: "system", // System-level event
        userId: null,
        action: "email.sent",
        entityType: "email",
        entityId: idempotencyKey,
        metadata: {
          to,
          subject,
          idempotencyKey,
          sentAt: new Date().toISOString(),
          jobId: job.id,
        },
        ipAddress: null,
        userAgent: null,
        createdAt: new Date(),
      },
    });
  } catch (error) {
    console.error(`[EmailProcessor] Failed to send email:`, error);

    // Log failure
    await db.auditEvent.create({
      data: {
        id: crypto.randomUUID(),
        companyId: "system",
        userId: null,
        action: "email.failed",
        entityType: "email",
        entityId: idempotencyKey,
        metadata: {
          to,
          subject,
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
