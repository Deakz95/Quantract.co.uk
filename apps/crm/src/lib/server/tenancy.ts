import crypto from "node:crypto";
import { getPrisma } from "@/lib/server/prisma";

function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export async function ensureCompanyForAdmin(email: string): Promise<string> {
  const client = getPrisma();
  if (!client) {
    throw new Error("DATABASE_URL not set (Prisma disabled)");
  }

  const normalized = String(email || "").trim().toLowerCase();
  const membership = await client.companyUser.findFirst({ where: { email: normalized, isActive: true } });
  if (membership) return membership.companyId;

  const companyName = (process.env.QT_DEFAULT_COMPANY_NAME || "Quantract").trim();
  const baseSlug = slugify(process.env.QT_DEFAULT_COMPANY_SLUG || companyName) || "company";
  const slug = `${baseSlug}-${crypto.randomBytes(3).toString("hex")}`;

  const company = await client.company.create({
    data: {
      name: companyName,
      slug,
      // Start new companies on a free/trial state. Stripe Billing pack will update this.
      plan: "free",
      subscriptionStatus: "trialing",
      trialEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      users: {
        create: {
          email: normalized,
          role: "admin",
        },
      },
    },
  });
  return company.id;
}

export async function ensureCompanyForEngineer(email: string): Promise<string> {
  const client = getPrisma();
  if (!client) throw new Error("DATABASE_URL not set (Prisma disabled)");
  const normalized = String(email || "").trim().toLowerCase();

  // Prefer explicit engineer membership, but fall back to any active membership.
  const membership =
    (await client.companyUser.findFirst({ where: { email: normalized, role: "engineer", isActive: true } })) ||
    (await client.companyUser.findFirst({ where: { email: normalized, isActive: true } }));
  if (!membership) {
    // If no company exists for this engineer yet, create a fresh one (dev convenience).
    const companyId = await ensureCompanyForAdmin(normalized);
    await client.companyUser.upsert({
      where: { companyId_email: { companyId, email: normalized } },
      update: { role: "engineer", isActive: true },
      create: { companyId, email: normalized, role: "engineer" },
    });
    await client.engineer.upsert({
      where: { companyId_email: { companyId, email: normalized } },
      update: { isActive: true },
      create: { companyId, email: normalized, isActive: true },
    });
    return companyId;
  }

  await client.engineer.upsert({
    where: { companyId_email: { companyId: membership.companyId, email: normalized } },
    update: { isActive: true },
    create: { companyId: membership.companyId, email: normalized, isActive: true },
  });
  return membership.companyId;
}

export async function ensureCompanyForClient(email: string): Promise<string | null> {
  const client = getPrisma();
  if (!client) throw new Error("DATABASE_URL not set (Prisma disabled)");
  const normalized = String(email || "").trim().toLowerCase();

  const row = await client.client.findFirst({ where: { email: normalized }, orderBy: { createdAt: "desc" } });
  return row?.companyId ?? null;
}

export async function getCompanyBrand(companyId: string): Promise<{ name: string; tagline?: string; fromEmail?: string } | null> {
  const client = getPrisma();
  if (!client) return null;
  const company = await client.company.findUnique({ where: { id: companyId } });
  if (!company) return null;
  return {
    name: (company as any).brandName || company.name,
    tagline: (company as any).brandTagline || undefined,
    fromEmail: process.env.FROM_EMAIL || undefined,
  };
}
