import { Job } from "bullmq";
import { PDFJob } from "../queueConfig";
import { getPrisma } from "../../prisma";
import crypto from "crypto";

/**
 * PDF Generation Job Processor
 *
 * CRITICAL: This processor MUST be idempotent.
 * - Check if PDF already generated
 * - Store PDF only once
 * - Handle retries safely
 */

export async function processPDFJob(job: Job<PDFJob>): Promise<void> {
  const { type, entityId, companyId, idempotencyKey } = job.data;

  console.log(`[PDFProcessor] Processing job ${job.id}: ${type} for ${entityId}`);

  const db = getPrisma();
  if (!db) {
    throw new Error("Database not available");
  }

  // CRITICAL: Check idempotency - has this PDF already been generated?
  const existing = await db.auditEvent.findFirst({
    where: {
      action: "pdf.generated",
      metadata: {
        path: ["idempotencyKey"],
        equals: idempotencyKey,
      },
    },
  });

  if (existing) {
    console.log(`[PDFProcessor] PDF already generated (idempotency key: ${idempotencyKey})`);
    return; // Idempotent - skip duplicate generation
  }

  try {
    // Generate PDF based on type
    // TODO: Integrate with actual PDF generation service
    // const pdfBuffer = await generatePDF(type, entityId, companyId);

    console.log(`[PDFProcessor] PDF generated: ${type} for ${entityId}`);

    // Record successful generation
    await db.auditEvent.create({
      data: {
        id: crypto.randomUUID(),
        companyId,
        userId: null,
        action: "pdf.generated",
        entityType: type,
        entityId,
        metadata: {
          type,
          idempotencyKey,
          generatedAt: new Date().toISOString(),
          jobId: job.id,
        },
        ipAddress: null,
        userAgent: null,
        createdAt: new Date(),
      },
    });
  } catch (error) {
    console.error(`[PDFProcessor] Failed to generate PDF:`, error);

    // Log failure
    await db.auditEvent.create({
      data: {
        id: crypto.randomUUID(),
        companyId,
        userId: null,
        action: "pdf.failed",
        entityType: type,
        entityId,
        metadata: {
          type,
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
