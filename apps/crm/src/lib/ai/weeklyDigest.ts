import { getPrisma } from "@/lib/server/prisma";
import { buildCrmContext } from "./buildCrmContext";
import { CRM_ADVISOR_SYSTEM_PROMPT } from "./prompts/crmAdvisor";
import { getOpenAIClient } from "@/lib/llm/openaiClient";
import { sendEmail, absoluteUrl } from "@/lib/server/email";
import * as repo from "@/lib/server/repo";
import type { CrmRecommendations } from "./types";
import { makeRecId } from "./recId";
import { AI_MODEL, ENGINE_MODE } from "./modelConfig";
import {
  resolveAiTier,
  isHardCapExceeded,
} from "./providerRouting";
import {
  getCompanyAiSpendThisMonth,
  recordCompanyAiUsage,
  estimateCostPence,
  estimateCostPenceFromLength,
} from "./aiUsage";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function isPaidPlan(plan: string): boolean {
  const p = plan.toLowerCase();
  return p.includes("pro") || p.includes("enterprise");
}

/**
 * Runs a weekly CRM setup digest for all paid companies.
 * Designed to be called from a cron endpoint once per week.
 */
export async function runWeeklyCrmDigest(): Promise<{
  processed: number;
  sent: number;
  skipped: number;
  errors: number;
}> {
  const prisma = getPrisma();
  if (!prisma) {
    console.info("[weekly-digest] Prisma unavailable, skipping.");
    return { processed: 0, sent: 0, skipped: 0, errors: 0 };
  }

  // Find all paid companies (includes pro_plus)
  const companies = await prisma.company.findMany({
    where: {
      plan: { in: ["pro", "Pro", "pro_plus", "Pro_Plus", "enterprise", "Enterprise"] },
    },
    select: { id: true, plan: true, brandName: true },
  });

  let processed = 0;
  let sent = 0;
  let skipped = 0;
  let errors = 0;

  for (const company of companies) {
    processed++;
    try {
      if (!isPaidPlan(company.plan)) {
        skipped++;
        continue;
      }

      // Check if digest was already sent in the last 7 days
      const recentDigest = await prisma.auditEvent.findFirst({
        where: {
          companyId: company.id,
          action: "ai_weekly_digest_sent",
          createdAt: { gte: new Date(Date.now() - SEVEN_DAYS_MS) },
        },
        select: { id: true },
      });

      if (recentDigest) {
        skipped++;
        continue;
      }

      // Budget gate: skip digest if hard cap exceeded
      const aiTier = resolveAiTier(company.plan);
      const spendThisMonth = await getCompanyAiSpendThisMonth(company.id);
      if (isHardCapExceeded(aiTier, spendThisMonth)) {
        repo.recordAuditEvent({
          entityType: "company" as any,
          entityId: company.id,
          action: "ai_weekly_digest_skipped_allowance" as any,
          actorRole: "system" as any,
          actor: "weekly-digest",
          meta: { aiTier, spendThisMonth },
        }).catch(() => null);
        skipped++;
        continue;
      }

      // Get admin users for this company
      const admins = await prisma.companyUser.findMany({
        where: { companyId: company.id, role: "admin", isActive: true },
        select: { email: true, userId: true },
      });

      if (admins.length === 0) {
        skipped++;
        continue;
      }

      // Use first admin's userId for context building
      const adminUserId = admins[0].userId ?? admins[0].email;

      // Build CRM context (reuses existing logic)
      const context = await buildCrmContext(company.id, adminUserId);

      // Build prompt
      const systemPrompt = CRM_ADVISOR_SYSTEM_PROMPT.replace(
        "{{INPUT_JSON}}",
        JSON.stringify(context, null, 2),
      );
      const userContent = JSON.stringify(context);

      // Call OpenAI GPT-5 mini
      const openai = getOpenAIClient();
      const completion = await openai.chat.completions.create({
        model: AI_MODEL.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
        max_tokens: 3000,
      });
      const raw = completion.choices?.[0]?.message?.content ?? "";
      const tokensIn = completion.usage?.prompt_tokens ?? 0;
      const tokensOut = completion.usage?.completion_tokens ?? 0;

      // Record usage
      const costPence =
        tokensIn > 0 || tokensOut > 0
          ? estimateCostPence(AI_MODEL.model, tokensIn, tokensOut)
          : estimateCostPenceFromLength(AI_MODEL.model, systemPrompt.length + userContent.length, 3000);

      recordCompanyAiUsage({
        companyId: company.id,
        userId: adminUserId,
        estimatedCostPence: costPence,
        requestType: "weekly_digest",
        tokensIn: tokensIn || undefined,
        tokensOut: tokensOut || undefined,
      });

      let parsed: CrmRecommendations;
      try {
        parsed = JSON.parse(raw);
      } catch {
        const match = raw.match(/\{[\s\S]*\}/);
        if (!match) throw new Error("Failed to parse AI response");
        parsed = JSON.parse(match[0]);
      }

      // Trim to digest format: summary + top 3 + risks
      const topRecs = (parsed.top_recommendations ?? []).slice(0, 3);
      const risks = parsed.risks_or_gaps ?? [];
      const summary = parsed.summary ?? "";

      // Build email HTML
      const appUrl = absoluteUrl("/admin");
      const html = buildDigestHtml({
        brandName: company.brandName ?? "Quantract",
        summary,
        recommendations: topRecs,
        risks,
        appUrl,
      });

      // Send to all admin users
      const adminEmails = admins.map((a: { email: string }) => a.email);
      for (const email of adminEmails) {
        try {
          await sendEmail({
            to: email,
            subject: "Your weekly CRM setup recommendations",
            html,
          });
        } catch (emailErr) {
          console.error(`[weekly-digest] Failed to send to ${email} for company ${company.id}:`, emailErr);
        }
      }

      // Record audit event (engineMode only, no provider/model)
      await repo.recordAuditEvent({
        entityType: "company" as any,
        entityId: company.id,
        action: "ai_weekly_digest_sent" as any,
        actorRole: "system" as any,
        actor: "weekly-digest",
        meta: {
          recipientCount: adminEmails.length,
          recCount: topRecs.length,
          riskCount: risks.length,
          engineMode: ENGINE_MODE,
          estimatedCostPence: costPence,
        },
      });

      sent++;
    } catch (err) {
      errors++;
      console.error(`[weekly-digest] Error for company ${company.id}:`, err);
    }
  }

  console.info("[weekly-digest] Complete:", { processed, sent, skipped, errors });
  return { processed, sent, skipped, errors };
}

function buildDigestHtml(opts: {
  brandName: string;
  summary: string;
  recommendations: Array<{ title: string; why_it_matters: string }>;
  risks: string[];
  appUrl: string;
}): string {
  const recRows = opts.recommendations
    .map((r, i) => {
      const cleanTitle = r.title.replace(/\s*\[confidence:[^\]]+\]/g, "").replace(/\s*\[action:[^\]]+\]/g, "");
      const actionMatch = r.title.match(/\[action:([a-z0-9_]+)\]/);
      const actionId = actionMatch ? actionMatch[1] : "";
      const recId = makeRecId(r.title);
      const deepLink = `${opts.appUrl}?ai=1&aiRec=${encodeURIComponent(recId)}&aiAction=${actionId ? encodeURIComponent(actionId) : ""}`;
      return `<tr><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;">
          <a href="${deepLink}" style="color:#0f172a;text-decoration:none;"><strong>${i + 1}. ${cleanTitle}</strong></a>
          <br/><span style="color:#64748b;font-size:14px;">${r.why_it_matters}</span>
          <br/><a href="${deepLink}" style="color:#3b82f6;font-size:12px;text-decoration:none;">View in app &rarr;</a>
        </td></tr>`;
    })
    .join("");

  const riskRows = opts.risks.length
    ? `<div style="margin-top:24px;padding:16px;background:#fef3c7;border-radius:8px;">
        <strong style="color:#92400e;">Things to watch</strong>
        <ul style="margin:8px 0 0 16px;color:#92400e;font-size:14px;">
          ${opts.risks.map((r) => `<li style="margin-bottom:4px;">${r}</li>`).join("")}
        </ul>
      </div>`
    : "";

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc;">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px;">
    <div style="background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
      <div style="padding:24px;border-bottom:1px solid #e2e8f0;">
        <h1 style="margin:0;font-size:20px;color:#0f172a;">${opts.brandName} — Weekly Setup Digest</h1>
        <p style="margin:8px 0 0;color:#64748b;font-size:14px;">Here's what we recommend this week based on your CRM activity.</p>
      </div>

      <div style="padding:24px;">
        <p style="margin:0 0 20px;color:#334155;font-size:15px;line-height:1.6;">${opts.summary}</p>

        <h2 style="margin:0 0 12px;font-size:16px;color:#0f172a;">Top recommendations</h2>
        <table style="width:100%;border-collapse:collapse;background:#f8fafc;border-radius:8px;overflow:hidden;">
          ${recRows}
        </table>

        ${riskRows}
      </div>

      <div style="padding:24px;text-align:center;border-top:1px solid #e2e8f0;">
        <a href="${opts.appUrl}" style="display:inline-block;padding:12px 32px;background:#0f172a;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">
          Review &amp; apply recommendations
        </a>
        <p style="margin:12px 0 0;color:#94a3b8;font-size:12px;">
          You're receiving this because you're an admin on a Pro plan.
        </p>
      </div>
    </div>
  </div>
</body></html>`;
}
