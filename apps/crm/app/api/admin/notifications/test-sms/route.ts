import { NextResponse } from "next/server";
import { requireRole, requireCompanyId } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging } from "@/lib/server/observability";
import {
  getSMSProvider,
  formatPhoneNumber,
  isValidPhoneNumber,
  calculateSMSSegments,
} from "@/lib/server/notifications";

export const runtime = "nodejs";

/**
 * POST /api/admin/notifications/test-sms
 * Send a test SMS to verify provider configuration
 */
export const POST = withRequestLogging(async function POST(req: Request) {
  try {
    await requireRole("admin");
  } catch {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const companyId = await requireCompanyId();
  const client = getPrisma();
  if (!client) {
    return NextResponse.json({ ok: false, error: "prisma_disabled" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const { phone, message } = body;

  if (!phone || !message) {
    return NextResponse.json(
      { ok: false, error: "phone_and_message_required" },
      { status: 400 }
    );
  }

  if (!isValidPhoneNumber(phone)) {
    return NextResponse.json(
      { ok: false, error: "invalid_phone_number" },
      { status: 400 }
    );
  }

  // Get company settings
  const company = await client.company.findUnique({
    where: { id: companyId },
    select: {
      brandName: true,
      smsEnabled: true,
      smsProvider: true,
      smsSenderId: true,
      smsApiKey: true,
      smsApiSecret: true,
      smsCredits: true,
    },
  });

  if (!company) {
    return NextResponse.json({ ok: false, error: "company_not_found" }, { status: 404 });
  }

  // Check credits
  const { segments } = calculateSMSSegments(message);
  if (company.smsCredits < segments) {
    return NextResponse.json(
      {
        ok: false,
        error: "insufficient_credits",
        required: segments,
        available: company.smsCredits,
      },
      { status: 400 }
    );
  }

  // Send test SMS
  const provider = getSMSProvider(company.smsProvider);
  const formattedPhone = formatPhoneNumber(phone);

  const result = await provider.send(formattedPhone, message, {
    provider: company.smsProvider || "mock",
    apiKey: company.smsApiKey || "",
    apiSecret: company.smsApiSecret || undefined,
    senderId: company.smsSenderId || undefined,
  });

  if (!result.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "send_failed",
        details: result.error,
      },
      { status: 500 }
    );
  }

  // Deduct credits
  await client.company.update({
    where: { id: companyId },
    data: {
      smsCredits: { decrement: result.segments || 1 },
    },
  });

  return NextResponse.json({
    ok: true,
    messageId: result.messageId,
    segments: result.segments,
    cost: result.cost,
    creditsRemaining: company.smsCredits - (result.segments || 1),
  });
});
