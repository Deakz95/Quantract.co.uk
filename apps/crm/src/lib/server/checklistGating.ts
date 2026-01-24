import { getPrisma } from "./prisma";
import crypto from "crypto";

/**
 * Validates if a job can be marked as completed based on checklist requirements.
 *
 * CRITICAL COMPLIANCE ENFORCEMENT:
 * This function prevents jobs from being marked as complete if any required
 * checklist items are incomplete. This is a non-negotiable gating mechanism
 * for regulatory compliance.
 *
 * @param jobId - The job ID to validate
 * @returns Object with { allowed: boolean, reason?: string, details?: any }
 */
export async function validateJobCompletion(jobId: string): Promise<{
  allowed: boolean;
  reason?: string;
  details?: {
    totalChecklists: number;
    incompleteItems: Array<{
      checklistTitle: string;
      itemTitle: string;
      isRequired: boolean;
    }>;
  };
}> {
  const db = getPrisma();
  if (!db) {
    return {
      allowed: false,
      reason: "Database not available",
    };
  }

  // Get all checklists for this job
  const checklists = await db.jobChecklist.findMany({
    where: { jobId },
    include: {
      items: {
        where: {
          isRequired: true,
          status: { not: "completed" },
        },
      },
    },
  });

  // Collect all incomplete required items
  const incompleteItems: Array<{
    checklistTitle: string;
    itemTitle: string;
    isRequired: boolean;
  }> = [];

  for (const checklist of checklists) {
    for (const item of checklist.items) {
      incompleteItems.push({
        checklistTitle: checklist.title,
        itemTitle: item.title,
        isRequired: item.isRequired,
      });
    }
  }

  if (incompleteItems.length > 0) {
    return {
      allowed: false,
      reason: `Cannot complete job: ${incompleteItems.length} required checklist item(s) are incomplete`,
      details: {
        totalChecklists: checklists.length,
        incompleteItems,
      },
    };
  }

  return {
    allowed: true,
  };
}

/**
 * Admin override for job completion gating.
 * Records the override in audit trail.
 *
 * @param jobId - The job ID
 * @param userId - Admin user performing override
 * @param reason - Reason for override
 * @returns Success boolean
 */
export async function overrideJobCompletionGating(
  jobId: string,
  userId: string,
  reason: string
): Promise<boolean> {
  const db = getPrisma();
  if (!db) return false;

  const job = await db.job.findUnique({
    where: { id: jobId },
    select: { companyId: true },
  });

  if (!job) return false;

  // Create audit event for override
  await db.auditEvent.create({
    data: {
      id: crypto.randomUUID(),
      companyId: job.companyId,
      userId,
      action: "job.completion.override",
      entityType: "job",
      entityId: jobId,
      metadata: {
        reason,
        overriddenAt: new Date().toISOString(),
      },
      ipAddress: null,
      userAgent: null,
      createdAt: new Date(),
    },
  });

  return true;
}
