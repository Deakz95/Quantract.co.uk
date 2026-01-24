import { PrismaClient } from "@prisma/client";

/**
 * Multi-tenant Database Manager
 * 
 * Supports two tiers:
 * - Shared: All data in main database, isolated by companyId
 * - Dedicated: Company has their own database (for enterprise/sensitive data)
 * 
 * Usage:
 * - Small businesses: Use shared tier (default)
 * - Enterprise/sensitive: Use dedicated tier with separate DB
 */

// Cache for dedicated database connections
const dedicatedConnections = new Map<string, PrismaClient>();

// Main shared database client
let sharedClient: PrismaClient | null = null;

export function getSharedPrismaClient(): PrismaClient {
  if (!sharedClient) {
    sharedClient = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });
  }
  return sharedClient;
}

/**
 * Get a Prisma client for a dedicated database
 * @param databaseUrl - The encrypted database URL for the dedicated tenant
 */
export function getDedicatedPrismaClient(databaseUrl: string): PrismaClient {
  // Check cache first
  const cached = dedicatedConnections.get(databaseUrl);
  if (cached) return cached;

  // Create new connection
  const client = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });

  // Cache it
  dedicatedConnections.set(databaseUrl, client);
  return client;
}

/**
 * Get the appropriate Prisma client for a company
 */
export async function getPrismaClientForCompany(companyId: string): Promise<PrismaClient> {
  const shared = getSharedPrismaClient();
  
  // Look up company to check if they have dedicated database
  const company = await shared.company.findUnique({
    where: { id: companyId },
    select: { dataTier: true, dedicatedDatabaseUrl: true },
  });

  if (!company) {
    return shared;
  }

  // If dedicated tier and has a database URL, use dedicated connection
  if (company.dataTier === "dedicated" && company.dedicatedDatabaseUrl) {
    // In production, you'd decrypt this URL here
    const decryptedUrl = decryptDatabaseUrl(company.dedicatedDatabaseUrl);
    return getDedicatedPrismaClient(decryptedUrl);
  }

  return shared;
}

/**
 * Get Prisma client by subdomain
 */
export async function getPrismaClientBySubdomain(subdomain: string): Promise<{ client: PrismaClient; companyId: string } | null> {
  const shared = getSharedPrismaClient();
  
  const company = await shared.company.findUnique({
    where: { subdomain: subdomain.toLowerCase() },
    select: { id: true, dataTier: true, dedicatedDatabaseUrl: true },
  });

  if (!company) {
    return null;
  }

  // If dedicated tier and has a database URL, use dedicated connection
  if (company.dataTier === "dedicated" && company.dedicatedDatabaseUrl) {
    const decryptedUrl = decryptDatabaseUrl(company.dedicatedDatabaseUrl);
    return {
      client: getDedicatedPrismaClient(decryptedUrl),
      companyId: company.id,
    };
  }

  return {
    client: shared,
    companyId: company.id,
  };
}

/**
 * Encrypt database URL for storage
 * In production, use a proper encryption library like crypto or AWS KMS
 */
export function encryptDatabaseUrl(url: string): string {
  // Simple base64 for now - replace with proper encryption in production!
  const key = process.env.DB_ENCRYPTION_KEY || "quantract-default-key";
  // In production: use AES-256-GCM or AWS KMS
  return Buffer.from(`${key}:${url}`).toString("base64");
}

/**
 * Decrypt database URL
 */
export function decryptDatabaseUrl(encrypted: string): string {
  // Simple base64 for now - replace with proper decryption in production!
  const decoded = Buffer.from(encrypted, "base64").toString("utf-8");
  const [_key, url] = decoded.split(":", 2);
  return url || encrypted;
}

/**
 * Clean up all database connections (for graceful shutdown)
 */
export async function disconnectAll(): Promise<void> {
  if (sharedClient) {
    await sharedClient.$disconnect();
    sharedClient = null;
  }

  for (const [url, client] of dedicatedConnections) {
    await client.$disconnect();
    dedicatedConnections.delete(url);
  }
}

/**
 * Type for tenant context
 */
export type TenantContext = {
  companyId: string;
  subdomain?: string;
  dataTier: "shared" | "dedicated";
  prisma: PrismaClient;
};

/**
 * Resolve tenant from request
 */
export async function resolveTenantFromRequest(req: Request): Promise<TenantContext | null> {
  const url = new URL(req.url);
  const host = url.hostname;

  // Extract subdomain from host
  // e.g., hawksworth.quantract.co.uk -> hawksworth
  const parts = host.split(".");
  if (parts.length < 3) {
    // No subdomain, use default shared database
    return null;
  }

  const subdomain = parts[0];
  
  // Skip common non-tenant subdomains
  if (["www", "api", "app", "admin"].includes(subdomain)) {
    return null;
  }

  const result = await getPrismaClientBySubdomain(subdomain);
  if (!result) {
    return null;
  }

  const company = await result.client.company.findUnique({
    where: { id: result.companyId },
    select: { dataTier: true },
  });

  return {
    companyId: result.companyId,
    subdomain,
    dataTier: (company?.dataTier as "shared" | "dedicated") || "shared",
    prisma: result.client,
  };
}
