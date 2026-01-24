import type { AIRole, AISessionData } from "@/lib/auth/aiSession";
import { getPrisma } from "@/lib/server/prisma";

export type EntityType =
  | "job"
  | "quote"
  | "invoice"
  | "variation"
  | "timeEntry"
  | "timesheet"
  | "certificate"
  | "audit";

const ROLE_PERMISSIONS: Record<
  AIRole,
  Record<EntityType, ("read" | "write" | "delete")[]>
> = {
  admin: {
    job: ["read", "write", "delete"],
    quote: ["read", "write", "delete"],
    invoice: ["read", "write", "delete"],
    variation: ["read", "write", "delete"],
    timeEntry: ["read", "write", "delete"],
    timesheet: ["read", "write", "delete"],
    certificate: ["read", "write", "delete"],
    audit: ["read"],
  },
  engineer: {
    job: ["read"],
    quote: [],
    invoice: [],
    variation: ["read"],
    timeEntry: ["read", "write"],
    timesheet: ["read", "write"],
    certificate: ["read", "write"],
    audit: [],
  },
  client: {
    job: ["read"],
    quote: ["read"],
    invoice: ["read"],
    variation: ["read"],
    timeEntry: [],
    timesheet: [],
    certificate: ["read"],
    audit: [],
  },
};

export function hasPermission(
  role: AIRole,
  entity: EntityType,
  action: "read" | "write" | "delete"
): boolean {
  return ROLE_PERMISSIONS[role][entity]?.includes(action) ?? false;
}

export async function getEngineerId(
  session: AISessionData
): Promise<string | null> {
  if (session.role !== "engineer" || !session.companyId || !session.userEmail)
    return null;
  const client = getPrisma();
  if (!client) return null;
  const row = await client.engineer.findUnique({
    where: {
      companyId_email: { companyId: session.companyId, email: session.userEmail },
    },
    select: { id: true },
  });
  return row?.id ?? null;
}

export async function getClientId(session: AISessionData): Promise<string | null> {
  if (session.role !== "client" || !session.companyId || !session.userEmail)
    return null;
  const client = getPrisma();
  if (!client) return null;
  const row = await client.client.findUnique({
    where: {
      companyId_email: { companyId: session.companyId, email: session.userEmail },
    },
    select: { id: true },
  });
  return row?.id ?? null;
}

type IdRow = { id: string };

export async function getAccessibleJobIds(
  session: AISessionData
): Promise<string[]> {
  const client = getPrisma();
  if (!client || !session.companyId) return [];

  if (session.role === "admin") {
    const jobs = await client.job.findMany({
      where: { companyId: session.companyId },
      select: { id: true },
    });
    return (jobs as IdRow[]).map((j) => j.id);
  }

  if (session.role === "engineer") {
    const engineerId = await getEngineerId(session);
    if (!engineerId) return [];
    const jobs = await client.job.findMany({
      where: { companyId: session.companyId, engineerId },
      select: { id: true },
    });
    return (jobs as IdRow[]).map((j) => j.id);
  }

  if (session.role === "client") {
    const clientId = await getClientId(session);
    if (!clientId) return [];
    const jobs = await client.job.findMany({
      where: { companyId: session.companyId, clientId },
      select: { id: true },
    });
    return (jobs as IdRow[]).map((j) => j.id);
  }

  return [];
}
