/**
 * Multi-Entity Billing Utilities
 *
 * Handles legal entity resolution and per-entity invoice/certificate numbering.
 */

import { getPrisma } from "./prisma";
import { requireCompanyId } from "@/lib/serverAuth";

export interface LegalEntityResolution {
  legalEntityId: string;
  displayName: string;
  legalName: string;
}

/**
 * Resolve the legal entity for a new invoice or certificate.
 *
 * Resolution order:
 * 1. If job has performingLegalEntityId, use that
 * 2. Else if job has serviceLine.defaultLegalEntityId, use that
 * 3. Else use company.defaultLegalEntityId
 * 4. Else create/return the first legal entity for the company
 */
export async function resolveLegalEntity(opts: {
  jobId?: string | null;
  serviceLineId?: string | null;
  overrideLegalEntityId?: string | null;
}): Promise<LegalEntityResolution | null> {
  const client = getPrisma();
  if (!client) return null;

  const companyId = await requireCompanyId();

  // 1. If override specified, use it directly
  if (opts.overrideLegalEntityId) {
    const entity = await client.legalEntity.findFirst({
      where: { id: opts.overrideLegalEntityId, companyId },
      select: { id: true, displayName: true, legalName: true },
    });
    if (entity) {
      return {
        legalEntityId: entity.id,
        displayName: entity.displayName,
        legalName: entity.legalName,
      };
    }
  }

  // 2. If job specified, check performingLegalEntityId first
  if (opts.jobId) {
    const job = await client.job.findFirst({
      where: { id: opts.jobId, companyId },
      select: {
        performingLegalEntityId: true,
        serviceLineId: true,
        serviceLine: {
          select: {
            defaultLegalEntityId: true,
          },
        },
        performingLegalEntity: {
          select: { id: true, displayName: true, legalName: true },
        },
      },
    });

    if (job?.performingLegalEntity) {
      return {
        legalEntityId: job.performingLegalEntity.id,
        displayName: job.performingLegalEntity.displayName,
        legalName: job.performingLegalEntity.legalName,
      };
    }

    // Check job's service line default
    if (job?.serviceLine?.defaultLegalEntityId) {
      const entity = await client.legalEntity.findFirst({
        where: { id: job.serviceLine.defaultLegalEntityId, companyId },
        select: { id: true, displayName: true, legalName: true },
      });
      if (entity) {
        return {
          legalEntityId: entity.id,
          displayName: entity.displayName,
          legalName: entity.legalName,
        };
      }
    }
  }

  // 3. If serviceLineId specified directly
  if (opts.serviceLineId) {
    const serviceLine = await client.serviceLine.findFirst({
      where: { id: opts.serviceLineId, companyId },
      select: {
        defaultLegalEntityId: true,
        defaultLegalEntity: {
          select: { id: true, displayName: true, legalName: true },
        },
      },
    });
    if (serviceLine?.defaultLegalEntity) {
      return {
        legalEntityId: serviceLine.defaultLegalEntity.id,
        displayName: serviceLine.defaultLegalEntity.displayName,
        legalName: serviceLine.defaultLegalEntity.legalName,
      };
    }
  }

  // 4. Fallback to company default
  const company = await client.company.findUnique({
    where: { id: companyId },
    select: { defaultLegalEntityId: true },
  });

  if (company?.defaultLegalEntityId) {
    const entity = await client.legalEntity.findFirst({
      where: { id: company.defaultLegalEntityId, companyId },
      select: { id: true, displayName: true, legalName: true },
    });
    if (entity) {
      return {
        legalEntityId: entity.id,
        displayName: entity.displayName,
        legalName: entity.legalName,
      };
    }
  }

  // 5. Last resort: get first active legal entity
  const fallbackEntity = await client.legalEntity.findFirst({
    where: { companyId, status: "active" },
    orderBy: { isDefault: "desc" },
    select: { id: true, displayName: true, legalName: true },
  });

  if (fallbackEntity) {
    return {
      legalEntityId: fallbackEntity.id,
      displayName: fallbackEntity.displayName,
      legalName: fallbackEntity.legalName,
    };
  }

  return null;
}

/**
 * Allocate the next invoice number for a legal entity.
 * Invoice numbers are now scoped per legal entity, not per company.
 */
export async function allocateInvoiceNumberForEntity(
  legalEntityId: string
): Promise<string | null> {
  const client = getPrisma();
  if (!client) return null;

  try {
    const result = await client.$transaction(async (tx: typeof client) => {
      const entity = await tx.legalEntity.findUnique({
        where: { id: legalEntityId },
        select: { invoiceNumberPrefix: true, nextInvoiceNumber: true },
      });
      if (!entity) return null;

      const n = Number(entity.nextInvoiceNumber || 1);
      await tx.legalEntity.update({
        where: { id: legalEntityId },
        data: { nextInvoiceNumber: n + 1, updatedAt: new Date() },
      });

      const prefix = String(entity.invoiceNumberPrefix || "INV-");
      const padded = String(n).padStart(5, "0");
      return `${prefix}${padded}`;
    });
    return result;
  } catch {
    return null;
  }
}

/**
 * Allocate the next certificate number for a legal entity.
 * Certificate numbers are now scoped per legal entity, not per company.
 */
export async function allocateCertificateNumberForEntity(
  legalEntityId: string
): Promise<string | null> {
  const client = getPrisma();
  if (!client) return null;

  try {
    const result = await client.$transaction(async (tx: typeof client) => {
      const entity = await tx.legalEntity.findUnique({
        where: { id: legalEntityId },
        select: { certificateNumberPrefix: true, nextCertificateNumber: true },
      });
      if (!entity) return null;

      const n = Number(entity.nextCertificateNumber || 1);
      await tx.legalEntity.update({
        where: { id: legalEntityId },
        data: { nextCertificateNumber: n + 1, updatedAt: new Date() },
      });

      const prefix = String(entity.certificateNumberPrefix || "CERT-");
      const padded = String(n).padStart(5, "0");
      return `${prefix}${padded}`;
    });
    return result;
  } catch {
    return null;
  }
}

/**
 * Resolve the default service line for a company.
 */
export async function resolveDefaultServiceLine(): Promise<string | null> {
  const client = getPrisma();
  if (!client) return null;

  const companyId = await requireCompanyId();

  const company = await client.company.findUnique({
    where: { id: companyId },
    select: { defaultServiceLineId: true },
  });

  if (company?.defaultServiceLineId) {
    return company.defaultServiceLineId;
  }

  // Fallback: get first active service line marked as default
  const fallback = await client.serviceLine.findFirst({
    where: { companyId, status: "active" },
    orderBy: { isDefault: "desc" },
    select: { id: true },
  });

  return fallback?.id ?? null;
}

/**
 * List all legal entities for the current company.
 */
export async function listLegalEntities() {
  const client = getPrisma();
  if (!client) return [];

  const companyId = await requireCompanyId();
  return client.legalEntity.findMany({
    where: { companyId },
    orderBy: [{ isDefault: "desc" }, { displayName: "asc" }],
  });
}

/**
 * List all service lines for the current company.
 */
export async function listServiceLines() {
  const client = getPrisma();
  if (!client) return [];

  const companyId = await requireCompanyId();
  return client.serviceLine.findMany({
    where: { companyId },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    include: {
      defaultLegalEntity: {
        select: { id: true, displayName: true },
      },
    },
  });
}

/**
 * Get a legal entity by ID.
 */
export async function getLegalEntityById(id: string) {
  const client = getPrisma();
  if (!client) return null;

  const companyId = await requireCompanyId();
  return client.legalEntity.findFirst({
    where: { id, companyId },
  });
}

/**
 * Get a service line by ID.
 */
export async function getServiceLineById(id: string) {
  const client = getPrisma();
  if (!client) return null;

  const companyId = await requireCompanyId();
  return client.serviceLine.findFirst({
    where: { id, companyId },
    include: {
      defaultLegalEntity: {
        select: { id: true, displayName: true },
      },
    },
  });
}
