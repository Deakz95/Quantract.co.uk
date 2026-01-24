import { getPrisma } from "@/lib/server/prisma";
import { getCompanyId, getUserEmail } from "@/lib/serverAuth";
import { 
  hasAdminBypass, 
  getTrialStatus, 
  getPlanLimits, 
  normalizePlan 
} from "@/lib/billing/plans";

/**
 * Check if an action is allowed based on plan limits
 * Returns { allowed: true } or { allowed: false, reason: string }
 */
export async function checkUsageLimit(
  action: "quote" | "invoice" | "job" | "engineer" | "client"
): Promise<{ allowed: boolean; reason?: string; limit?: number; used?: number }> {
  const client = getPrisma();
  const companyId = await getCompanyId();
  const userEmail = await getUserEmail();
  
  if (!client || !companyId) {
    return { allowed: true }; // Fail open if not configured
  }

  // Admin bypass
  if (hasAdminBypass(userEmail)) {
    return { allowed: true };
  }

  const company = await client.company.findUnique({
    where: { id: companyId },
    select: {
      plan: true,
      trialStartedAt: true,
      quotesThisMonth: true,
      invoicesThisMonth: true,
    },
  });

  if (!company) {
    return { allowed: true };
  }

  // Check trial expiration
  const trialStatus = getTrialStatus(company.plan, company.trialStartedAt);
  if (trialStatus.isExpired) {
    return { allowed: false, reason: "trial_expired" };
  }

  const limits = getPlanLimits(company.plan);

  switch (action) {
    case "quote": {
      if (company.quotesThisMonth >= limits.quotesPerMonth) {
        return { 
          allowed: false, 
          reason: "quote_limit", 
          limit: limits.quotesPerMonth, 
          used: company.quotesThisMonth 
        };
      }
      break;
    }
    case "invoice": {
      if (company.invoicesThisMonth >= limits.invoicesPerMonth) {
        return { 
          allowed: false, 
          reason: "invoice_limit", 
          limit: limits.invoicesPerMonth, 
          used: company.invoicesThisMonth 
        };
      }
      break;
    }
    case "job": {
      const count = await client.job.count({ where: { companyId } });
      if (count >= limits.maxJobs) {
        return { allowed: false, reason: "job_limit", limit: limits.maxJobs, used: count };
      }
      break;
    }
    case "engineer": {
      const count = await client.engineer.count({ where: { companyId, isActive: true } });
      if (count >= limits.maxEngineers) {
        return { allowed: false, reason: "engineer_limit", limit: limits.maxEngineers, used: count };
      }
      break;
    }
    case "client": {
      const count = await client.client.count({ where: { companyId } });
      if (count >= limits.maxClients) {
        return { allowed: false, reason: "client_limit", limit: limits.maxClients, used: count };
      }
      break;
    }
  }

  return { allowed: true };
}

/**
 * Increment usage counter after successful action
 */
export async function incrementUsage(action: "quote" | "invoice"): Promise<void> {
  const client = getPrisma();
  const companyId = await getCompanyId();
  
  if (!client || !companyId) return;

  const company = await client.company.findUnique({
    where: { id: companyId },
    select: { trialStartedAt: true, plan: true },
  });

  // Start trial on first action if not started
  const updates: any = {};
  
  if (normalizePlan(company?.plan) === "trial" && !company?.trialStartedAt) {
    updates.trialStartedAt = new Date();
  }

  if (action === "quote") {
    updates.quotesThisMonth = { increment: 1 };
  } else if (action === "invoice") {
    updates.invoicesThisMonth = { increment: 1 };
  }

  if (Object.keys(updates).length > 0) {
    await client.company.update({
      where: { id: companyId },
      data: updates,
    }).catch(() => null);
  }
}

/**
 * Get current usage summary for display
 */
export async function getUsageSummary() {
  const client = getPrisma();
  const companyId = await getCompanyId();
  const userEmail = await getUserEmail();
  
  if (!client || !companyId) {
    return null;
  }

  const company = await client.company.findUnique({
    where: { id: companyId },
    select: {
      plan: true,
      trialStartedAt: true,
      quotesThisMonth: true,
      invoicesThisMonth: true,
    },
  });

  if (!company) return null;

  const [engineersCount, clientsCount, jobsCount] = await Promise.all([
    client.engineer.count({ where: { companyId, isActive: true } }),
    client.client.count({ where: { companyId } }),
    client.job.count({ where: { companyId } }),
  ]);

  const limits = getPlanLimits(company.plan, userEmail);
  const trialStatus = getTrialStatus(company.plan, company.trialStartedAt, userEmail);

  return {
    plan: company.plan,
    trial: trialStatus,
    quotes: {
      used: company.quotesThisMonth,
      limit: limits.quotesPerMonth,
      remaining: Math.max(0, limits.quotesPerMonth - company.quotesThisMonth),
    },
    invoices: {
      used: company.invoicesThisMonth,
      limit: limits.invoicesPerMonth,
      remaining: Math.max(0, limits.invoicesPerMonth - company.invoicesThisMonth),
    },
    engineers: {
      used: engineersCount,
      limit: limits.maxEngineers,
      remaining: Math.max(0, limits.maxEngineers - engineersCount),
    },
    clients: {
      used: clientsCount,
      limit: limits.maxClients,
      remaining: Math.max(0, limits.maxClients - clientsCount),
    },
    jobs: {
      used: jobsCount,
      limit: limits.maxJobs,
      remaining: Math.max(0, limits.maxJobs - jobsCount),
    },
  };
}
