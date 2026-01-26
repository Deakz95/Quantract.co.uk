/**
 * Send Notification Utility
 *
 * Main entry point for sending notifications.
 * Handles all checks: enabled, consent, quiet hours, rate limits, credits.
 */

import { randomUUID } from "crypto";
import { getPrisma } from "@/lib/server/prisma";
import type {
  NotificationChannel,
  NotificationEventKey,
  NotificationContext,
  TemplateVariables,
  NotificationResult,
  NotificationSkipReason,
} from "./types";
import { DEFAULT_SMS_TEMPLATES, calculateSMSSegments } from "./defaultTemplates";
import { getSMSProvider, formatPhoneNumber, isValidPhoneNumber } from "./smsProvider";

interface SendNotificationParams extends NotificationContext {
  eventKey: NotificationEventKey;
  channel?: NotificationChannel;
  variables?: TemplateVariables;
  // Optional overrides
  recipientPhone?: string;
  recipientEmail?: string;
}

/**
 * Render a template with variables
 */
export function renderTemplate(
  template: string,
  variables: TemplateVariables
): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return variables[key] ?? match;
  });
}

/**
 * Check if current time is within quiet hours
 */
function isQuietHours(quietFrom: string | null, quietTo: string | null): boolean {
  if (!quietFrom || !quietTo) return false;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [fromHours, fromMinutes] = quietFrom.split(":").map(Number);
  const [toHours, toMinutes] = quietTo.split(":").map(Number);

  const fromTotalMinutes = fromHours * 60 + fromMinutes;
  const toTotalMinutes = toHours * 60 + toMinutes;

  // Handle overnight quiet hours (e.g., 21:00 to 08:00)
  if (fromTotalMinutes > toTotalMinutes) {
    return currentMinutes >= fromTotalMinutes || currentMinutes < toTotalMinutes;
  }

  return currentMinutes >= fromTotalMinutes && currentMinutes < toTotalMinutes;
}

/**
 * Check rate limits for SMS
 */
async function checkRateLimits(
  companyId: string,
  clientId: string | undefined,
  jobId: string | undefined,
  maxPerClientPerDay: number,
  maxPerJobPerDay: number
): Promise<{ allowed: boolean; reason?: "rateLimited" }> {
  const client = getPrisma();
  if (!client) return { allowed: true };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Check per-client rate limit
  if (clientId) {
    const clientCount = await client.notificationLog.count({
      where: {
        companyId,
        clientId,
        channel: "SMS",
        status: "sent",
        createdAt: { gte: today },
      },
    });

    if (clientCount >= maxPerClientPerDay) {
      return { allowed: false, reason: "rateLimited" };
    }
  }

  // Check per-job rate limit
  if (jobId) {
    const jobCount = await client.notificationLog.count({
      where: {
        companyId,
        jobId,
        channel: "SMS",
        status: "sent",
        createdAt: { gte: today },
      },
    });

    if (jobCount >= maxPerJobPerDay) {
      return { allowed: false, reason: "rateLimited" };
    }
  }

  return { allowed: true };
}

/**
 * Log a notification attempt
 */
async function logNotification(
  params: {
    companyId: string;
    channel: NotificationChannel;
    eventKey: NotificationEventKey;
    recipient: string;
    clientId?: string;
    jobId?: string;
    invoiceId?: string;
    quoteId?: string;
    certificateId?: string;
    status: "sent" | "skipped" | "failed";
    skipReason?: NotificationSkipReason;
    errorMessage?: string;
    cost?: number;
    segments?: number;
    providerMessageId?: string;
  }
): Promise<void> {
  const client = getPrisma();
  if (!client) return;

  try {
    await client.notificationLog.create({
      data: {
        id: randomUUID(),
        companyId: params.companyId,
        channel: params.channel,
        eventKey: params.eventKey,
        recipient: params.recipient,
        clientId: params.clientId,
        jobId: params.jobId,
        invoiceId: params.invoiceId,
        quoteId: params.quoteId,
        certificateId: params.certificateId,
        status: params.status,
        skipReason: params.skipReason,
        errorMessage: params.errorMessage,
        cost: params.cost,
        segments: params.segments,
        providerMessageId: params.providerMessageId,
      },
    });
  } catch (error) {
    console.error("[Notification] Failed to log notification:", error);
  }
}

/**
 * Send SMS notification
 */
async function sendSMS(
  params: SendNotificationParams
): Promise<NotificationResult> {
  const client = getPrisma();
  if (!client) {
    return { success: false, status: "failed", error: "Database not available" };
  }

  const { companyId, eventKey, clientId, jobId, invoiceId, quoteId, certificateId } = params;

  // 1. Get company settings
  const company = await client.company.findUnique({
    where: { id: companyId },
    select: {
      brandName: true,
      smsEnabled: true,
      smsProvider: true,
      smsSenderId: true,
      smsApiKey: true,
      smsApiSecret: true,
      smsRequireConsent: true,
      smsQuietHoursEnabled: true,
      smsQuietFrom: true,
      smsQuietTo: true,
      smsMaxPerClientPerDay: true,
      smsMaxPerJobPerDay: true,
      smsCredits: true,
    },
  });

  if (!company) {
    return { success: false, status: "failed", error: "Company not found" };
  }

  // 2. Check if SMS is enabled
  if (!company.smsEnabled) {
    await logNotification({
      companyId,
      channel: "SMS",
      eventKey,
      recipient: params.recipientPhone || "",
      clientId,
      jobId,
      invoiceId,
      quoteId,
      certificateId,
      status: "skipped",
      skipReason: "disabled",
    });
    return { success: false, status: "skipped", skipReason: "disabled" };
  }

  // 3. Check if event is enabled
  const rule = await client.notificationRule.findUnique({
    where: {
      companyId_channel_eventKey: {
        companyId,
        channel: "SMS",
        eventKey,
      },
    },
  });

  if (rule && !rule.enabled) {
    await logNotification({
      companyId,
      channel: "SMS",
      eventKey,
      recipient: params.recipientPhone || "",
      clientId,
      jobId,
      invoiceId,
      quoteId,
      certificateId,
      status: "skipped",
      skipReason: "disabled",
    });
    return { success: false, status: "skipped", skipReason: "disabled" };
  }

  // 4. Get client and check phone + consent
  let recipientPhone = params.recipientPhone;
  let clientRecord = null;

  if (clientId) {
    clientRecord = await client.client.findUnique({
      where: { id: clientId },
      select: { phone: true, smsOptIn: true, name: true, email: true },
    });

    if (!recipientPhone && clientRecord?.phone) {
      recipientPhone = clientRecord.phone;
    }
  }

  if (!recipientPhone || !isValidPhoneNumber(recipientPhone)) {
    await logNotification({
      companyId,
      channel: "SMS",
      eventKey,
      recipient: recipientPhone || "missing",
      clientId,
      jobId,
      invoiceId,
      quoteId,
      certificateId,
      status: "skipped",
      skipReason: "missingPhone",
    });
    return { success: false, status: "skipped", skipReason: "missingPhone" };
  }

  const formattedPhone = formatPhoneNumber(recipientPhone);

  // 5. Check consent
  if (company.smsRequireConsent && clientRecord && !clientRecord.smsOptIn) {
    await logNotification({
      companyId,
      channel: "SMS",
      eventKey,
      recipient: formattedPhone,
      clientId,
      jobId,
      invoiceId,
      quoteId,
      certificateId,
      status: "skipped",
      skipReason: "noConsent",
    });
    return { success: false, status: "skipped", skipReason: "noConsent" };
  }

  // 6. Check quiet hours
  if (company.smsQuietHoursEnabled && isQuietHours(company.smsQuietFrom, company.smsQuietTo)) {
    await logNotification({
      companyId,
      channel: "SMS",
      eventKey,
      recipient: formattedPhone,
      clientId,
      jobId,
      invoiceId,
      quoteId,
      certificateId,
      status: "skipped",
      skipReason: "quietHours",
    });
    return { success: false, status: "skipped", skipReason: "quietHours" };
  }

  // 7. Check rate limits
  const rateCheck = await checkRateLimits(
    companyId,
    clientId,
    jobId,
    company.smsMaxPerClientPerDay,
    company.smsMaxPerJobPerDay
  );

  if (!rateCheck.allowed) {
    await logNotification({
      companyId,
      channel: "SMS",
      eventKey,
      recipient: formattedPhone,
      clientId,
      jobId,
      invoiceId,
      quoteId,
      certificateId,
      status: "skipped",
      skipReason: "rateLimited",
    });
    return { success: false, status: "skipped", skipReason: "rateLimited" };
  }

  // 8. Get template
  let template = await client.notificationTemplate.findUnique({
    where: {
      companyId_channel_eventKey: {
        companyId,
        channel: "SMS",
        eventKey,
      },
    },
  });

  const templateBody = template?.body || DEFAULT_SMS_TEMPLATES[eventKey];

  // 9. Build variables
  const variables: TemplateVariables = {
    companyName: company.brandName,
    clientName: clientRecord?.name,
    clientEmail: clientRecord?.email,
    clientPhone: recipientPhone,
    ...params.variables,
  };

  // Load additional context if needed
  if (jobId && !variables.jobReference) {
    const job = await client.job.findUnique({
      where: { id: jobId },
      select: {
        reference: true,
        scheduledStart: true,
        site: {
          select: { address1: true, city: true, postcode: true },
        },
        engineer: {
          select: { name: true },
        },
      },
    });

    if (job) {
      variables.jobReference = job.reference;
      if (job.scheduledStart) {
        variables.jobDate = new Date(job.scheduledStart).toLocaleDateString("en-GB");
        variables.jobTime = new Date(job.scheduledStart).toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
        });
      }
      if (job.site) {
        variables.jobAddress = [job.site.address1, job.site.city, job.site.postcode]
          .filter(Boolean)
          .join(", ");
      }
      if (job.engineer) {
        variables.engineerName = job.engineer.name;
      }
    }
  }

  if (invoiceId && !variables.invoiceNumber) {
    const invoice = await client.invoice.findUnique({
      where: { id: invoiceId },
      select: { invoiceNumber: true, total: true, token: true },
    });

    if (invoice) {
      variables.invoiceNumber = invoice.invoiceNumber || "";
      variables.invoiceTotal = `£${(invoice.total / 100).toFixed(2)}`;
      variables.paymentLink = `${process.env.NEXT_PUBLIC_BASE_URL}/pay/${invoice.token}`;
    }
  }

  if (quoteId && !variables.quoteNumber) {
    const quote = await client.quote.findUnique({
      where: { id: quoteId },
      select: { token: true, version: true },
    });

    if (quote) {
      variables.quoteNumber = `Q-${quote.version}`;
      variables.quoteLink = `${process.env.NEXT_PUBLIC_BASE_URL}/quote/${quote.token}`;
    }
  }

  // Portal link fallback
  if (!variables.portalLink) {
    variables.portalLink = `${process.env.NEXT_PUBLIC_BASE_URL}/portal`;
  }

  // 10. Render message
  const message = renderTemplate(templateBody, variables);
  const { segments } = calculateSMSSegments(message);

  // 11. Check credits
  const estimatedCost = segments; // 1 credit per segment
  if (company.smsCredits < estimatedCost) {
    await logNotification({
      companyId,
      channel: "SMS",
      eventKey,
      recipient: formattedPhone,
      clientId,
      jobId,
      invoiceId,
      quoteId,
      certificateId,
      status: "skipped",
      skipReason: "noCredits",
    });
    return { success: false, status: "skipped", skipReason: "noCredits" };
  }

  // 12. Send SMS
  const provider = getSMSProvider(company.smsProvider);
  const result = await provider.send(formattedPhone, message, {
    provider: company.smsProvider || "mock",
    apiKey: company.smsApiKey || "",
    apiSecret: company.smsApiSecret || undefined,
    senderId: company.smsSenderId || undefined,
  });

  if (!result.success) {
    await logNotification({
      companyId,
      channel: "SMS",
      eventKey,
      recipient: formattedPhone,
      clientId,
      jobId,
      invoiceId,
      quoteId,
      certificateId,
      status: "failed",
      skipReason: "providerError",
      errorMessage: result.error,
    });
    return {
      success: false,
      status: "failed",
      skipReason: "providerError",
      error: result.error,
    };
  }

  // 13. Deduct credits
  await client.company.update({
    where: { id: companyId },
    data: {
      smsCredits: { decrement: result.segments || 1 },
    },
  });

  // 14. Log success
  await logNotification({
    companyId,
    channel: "SMS",
    eventKey,
    recipient: formattedPhone,
    clientId,
    jobId,
    invoiceId,
    quoteId,
    certificateId,
    status: "sent",
    cost: result.cost,
    segments: result.segments,
    providerMessageId: result.messageId,
  });

  return {
    success: true,
    status: "sent",
    messageId: result.messageId,
  };
}

/**
 * Main entry point for sending notifications
 */
export async function sendNotification(
  params: SendNotificationParams
): Promise<NotificationResult> {
  const channel = params.channel || "SMS";

  switch (channel) {
    case "SMS":
      return sendSMS(params);
    case "EMAIL":
      // TODO: Implement email notifications
      return {
        success: false,
        status: "skipped",
        skipReason: "disabled",
        error: "Email notifications not yet implemented",
      };
    default:
      return {
        success: false,
        status: "failed",
        error: `Unknown channel: ${channel}`,
      };
  }
}

/**
 * Initialize default templates for a company
 */
export async function initializeDefaultTemplates(companyId: string): Promise<void> {
  const client = getPrisma();
  if (!client) return;

  const eventKeys = Object.keys(DEFAULT_SMS_TEMPLATES) as NotificationEventKey[];

  for (const eventKey of eventKeys) {
    // Create default SMS template if not exists
    await client.notificationTemplate.upsert({
      where: {
        companyId_channel_eventKey: {
          companyId,
          channel: "SMS",
          eventKey,
        },
      },
      create: {
        id: randomUUID(),
        companyId,
        channel: "SMS",
        eventKey,
        body: DEFAULT_SMS_TEMPLATES[eventKey],
        isDefault: true,
        updatedAt: new Date(),
      },
      update: {},
    });

    // Create default notification rule (enabled)
    await client.notificationRule.upsert({
      where: {
        companyId_channel_eventKey: {
          companyId,
          channel: "SMS",
          eventKey,
        },
      },
      create: {
        id: randomUUID(),
        companyId,
        channel: "SMS",
        eventKey,
        enabled: true,
        updatedAt: new Date(),
      },
      update: {},
    });
  }
}
