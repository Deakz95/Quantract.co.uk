import { NextResponse } from "next/server";
import { randomUUID, createHmac } from "crypto";
import { prisma } from "@/lib/server/prisma";
import { withRequestLogging } from "@/lib/server/observability";
import { getRouteParams } from "@/lib/server/routeParams";
import { rateLimit, getClientIp } from "@/lib/server/rateLimit";
import { scoreEnquiry, DEFAULT_CONFIG, type LeadScoringConfigData } from "@/lib/server/leadScoring";

export const runtime = "nodejs";

interface EnquiryRequestBody {
  // Required fields
  name?: string;
  email?: string;
  // Optional fields
  phone?: string;
  postcode?: string;
  message?: string;
  // Tracking fields
  pageUrl?: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  // Form config
  formSlug?: string;
  // Security
  _hp?: string; // Honeypot field - should be empty
}

function jsonOk(data: Record<string, unknown>, status = 200, headers?: Record<string, string>) {
  return NextResponse.json({ ok: true, ...data }, { status, headers });
}

function jsonErr(error: string, status = 400, headers?: Record<string, string>) {
  return NextResponse.json({ ok: false, error }, { status, headers });
}

/**
 * Verify HMAC signature for API authentication.
 * Expected header: X-QT-Signature: timestamp.signature
 * Where signature = HMAC-SHA256(timestamp + "." + bodyStr, keyHash)
 */
function verifySignature(
  signature: string | null,
  body: string,
  keyHash: string,
  maxAgeMs = 300000 // 5 minutes
): { valid: boolean; error?: string } {
  if (!signature) {
    return { valid: false, error: "missing_signature" };
  }

  const parts = signature.split(".");
  if (parts.length !== 2) {
    return { valid: false, error: "invalid_signature_format" };
  }

  const [timestampStr, providedSig] = parts;
  const timestamp = parseInt(timestampStr, 10);

  if (isNaN(timestamp)) {
    return { valid: false, error: "invalid_timestamp" };
  }

  // Check timestamp is within acceptable range
  const now = Date.now();
  if (now - timestamp > maxAgeMs) {
    return { valid: false, error: "signature_expired" };
  }
  if (timestamp > now + 60000) {
    return { valid: false, error: "timestamp_in_future" };
  }

  // Compute expected signature
  const payload = `${timestamp}.${body}`;
  const expectedSig = createHmac("sha256", keyHash).update(payload).digest("hex");

  // Constant-time comparison
  if (providedSig.length !== expectedSig.length) {
    return { valid: false, error: "signature_mismatch" };
  }

  let match = true;
  for (let i = 0; i < providedSig.length; i++) {
    if (providedSig[i] !== expectedSig[i]) {
      match = false;
    }
  }

  if (!match) {
    return { valid: false, error: "signature_mismatch" };
  }

  return { valid: true };
}

/**
 * Check if origin/referer matches allowed domains.
 */
function isAllowedDomain(
  origin: string | null,
  referer: string | null,
  allowedDomains: { domain: string }[]
): boolean {
  if (allowedDomains.length === 0) {
    // No domain restrictions configured
    return true;
  }

  const checkDomain = (url: string | null): boolean => {
    if (!url) return false;
    try {
      const parsed = new URL(url);
      const hostname = parsed.hostname.toLowerCase();

      return allowedDomains.some(({ domain }) => {
        const pattern = domain.toLowerCase();
        if (pattern.startsWith("*.")) {
          // Wildcard: *.example.com matches sub.example.com
          const baseDomain = pattern.slice(2);
          return hostname === baseDomain || hostname.endsWith("." + baseDomain);
        }
        return hostname === pattern;
      });
    } catch {
      return false;
    }
  };

  return checkDomain(origin) || checkDomain(referer);
}

/**
 * Validate email format.
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * Validate phone format (basic validation).
 */
function isValidPhone(phone: string): boolean {
  // Allow digits, spaces, dashes, parentheses, and + sign
  const phoneRegex = /^[+]?[\d\s\-().]{7,20}$/;
  return phoneRegex.test(phone);
}

/**
 * Validate postcode format (UK format, but flexible).
 */
function isValidPostcode(postcode: string): boolean {
  // UK postcode regex (flexible)
  const postcodeRegex = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;
  return postcodeRegex.test(postcode.trim()) && postcode.length <= 10;
}

/**
 * POST /api/public/tenants/[tenantSlug]/enquiries
 *
 * Create a new enquiry from an external source (website form, API).
 *
 * Authentication: X-QT-Key header with API key, X-QT-Signature header with HMAC signature
 * Rate limiting: Based on IP and/or API key
 */
export const POST = withRequestLogging(async function POST(
  req: Request,
  ctx: { params: Promise<{ tenantSlug: string }> }
) {
  const startTime = Date.now();

  try {
    const { tenantSlug } = await getRouteParams(ctx);
    const ip = getClientIp(req);

    // CORS headers for preflight and response
    const corsHeaders: Record<string, string> = {
      "Access-Control-Allow-Origin": "*", // Will be restricted by domain check
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-QT-Key, X-QT-Signature",
      "Access-Control-Max-Age": "86400",
    };

    // Rate limit by IP first (global limit)
    const ipRateLimit = rateLimit({
      key: `enquiry:ip:${ip}`,
      limit: 30,
      windowMs: 60000, // 30 requests per minute per IP
    });

    if (!ipRateLimit.ok) {
      return jsonErr("rate_limit_exceeded", 429, {
        ...corsHeaders,
        "Retry-After": String(Math.ceil((ipRateLimit.resetAt - Date.now()) / 1000)),
        "X-RateLimit-Limit": "30",
        "X-RateLimit-Remaining": "0",
      });
    }

    // Find company by slug
    const company = await prisma.company.findUnique({
      where: { slug: tenantSlug.toLowerCase() },
      select: {
        id: true,
        name: true,
        inboundIntegrationKeys: {
          where: { isActive: true },
          select: { id: true, keyHash: true, keyPrefix: true, permissions: true },
        },
        allowedDomains: {
          where: { isActive: true },
          select: { domain: true },
        },
      },
    });

    if (!company) {
      return jsonErr("tenant_not_found", 404, corsHeaders);
    }

    const companyId = company.id;

    // Get request body as text for signature verification
    const bodyText = await req.text();
    let body: EnquiryRequestBody;

    try {
      body = JSON.parse(bodyText);
    } catch {
      return jsonErr("invalid_json", 400, corsHeaders);
    }

    // Get authentication headers
    const apiKey = req.headers.get("X-QT-Key");
    const signature = req.headers.get("X-QT-Signature");
    const origin = req.headers.get("Origin");
    const referer = req.headers.get("Referer");

    // Verify API key if provided
    let authenticatedKey: { id: string; permissions: string } | null = null;

    if (apiKey) {
      // Hash the provided key to compare
      const keyHash = createHmac("sha256", process.env.INBOUND_KEY_SECRET || "qt-inbound-key-secret")
        .update(apiKey)
        .digest("hex");

      const matchedKey = company.inboundIntegrationKeys.find((k: { keyHash: string }) => k.keyHash === keyHash);

      if (!matchedKey) {
        return jsonErr("invalid_api_key", 401, corsHeaders);
      }

      // Verify HMAC signature
      const sigResult = verifySignature(signature, bodyText, keyHash);
      if (!sigResult.valid) {
        return jsonErr(sigResult.error || "signature_invalid", 401, corsHeaders);
      }

      authenticatedKey = { id: matchedKey.id, permissions: matchedKey.permissions };

      // Update last used timestamp (fire and forget)
      prisma.inboundIntegrationKey
        .update({
          where: { id: matchedKey.id },
          data: { lastUsedAt: new Date(), usageCount: { increment: 1 } },
        })
        .catch(() => {});
    } else {
      // No API key - verify domain instead
      if (!isAllowedDomain(origin, referer, company.allowedDomains)) {
        return jsonErr("domain_not_allowed", 403, corsHeaders);
      }
    }

    // Check honeypot field (anti-spam)
    if (body._hp && body._hp.length > 0) {
      // Bot detected - silently accept but don't create enquiry
      console.log(`[Enquiry] Honeypot triggered for ${companyId} from ${ip}`);
      return jsonOk(
        {
          enquiryId: "enq_" + randomUUID().slice(0, 8),
          message: "Thank you for your enquiry.",
        },
        201,
        corsHeaders
      );
    }

    // Find form config if formSlug provided
    let formConfig: {
      id: string;
      defaultStageId: string | null;
      defaultOwnerId: string | null;
      requiredFields: unknown;
      rateLimitPerMinute: number;
      enableCaptcha: boolean;
    } | null = null;

    if (body.formSlug) {
      formConfig = await prisma.inboundFormConfig.findFirst({
        where: {
          companyId,
          slug: body.formSlug,
          isActive: true,
        },
        select: {
          id: true,
          defaultStageId: true,
          defaultOwnerId: true,
          requiredFields: true,
          rateLimitPerMinute: true,
          enableCaptcha: true,
        },
      });

      if (formConfig) {
        // Per-form rate limiting
        const formRateLimit = rateLimit({
          key: `enquiry:form:${formConfig.id}:${ip}`,
          limit: formConfig.rateLimitPerMinute,
          windowMs: 60000,
        });

        if (!formRateLimit.ok) {
          return jsonErr("form_rate_limit_exceeded", 429, corsHeaders);
        }
      }
    }

    // Validate required fields
    const requiredFields = formConfig?.requiredFields as string[] || ["name", "email"];
    const missingFields: string[] = [];

    for (const field of requiredFields) {
      const value = body[field as keyof EnquiryRequestBody];
      if (!value || (typeof value === "string" && value.trim() === "")) {
        missingFields.push(field);
      }
    }

    if (missingFields.length > 0) {
      return jsonErr(`missing_required_fields: ${missingFields.join(", ")}`, 400, corsHeaders);
    }

    // Validate email format if provided
    if (body.email && !isValidEmail(body.email)) {
      return jsonErr("invalid_email_format", 400, corsHeaders);
    }

    // Validate phone format if provided
    if (body.phone && !isValidPhone(body.phone)) {
      return jsonErr("invalid_phone_format", 400, corsHeaders);
    }

    // Validate postcode format if provided
    if (body.postcode && !isValidPostcode(body.postcode)) {
      return jsonErr("invalid_postcode_format", 400, corsHeaders);
    }

    // Get default pipeline stage
    let stageId = formConfig?.defaultStageId;

    if (!stageId) {
      // Find default "New" stage
      const defaultStage = await prisma.pipelineStage.findFirst({
        where: { companyId },
        orderBy: { sortOrder: "asc" },
        select: { id: true },
      });

      if (!defaultStage) {
        console.error(`[Enquiry] No pipeline stage found for company ${companyId}`);
        return jsonErr("configuration_error", 500, corsHeaders);
      }

      stageId = defaultStage.id;
    }

    // Create the enquiry
    const enquiryId = randomUUID();
    const now = new Date();

    const enquiry = await prisma.enquiry.create({
      data: {
        id: enquiryId,
        companyId,
        stageId,
        ownerId: formConfig?.defaultOwnerId || null,
        formConfigId: formConfig?.id || null,
        name: body.name?.trim() || null,
        email: body.email?.toLowerCase().trim() || null,
        phone: body.phone?.trim() || null,
        postcode: body.postcode?.trim().toUpperCase() || null,
        message: body.message?.trim() || null,
        source: authenticatedKey ? "api" : "website",
        pageUrl: body.pageUrl?.slice(0, 2000) || null,
        referrer: body.referrer?.slice(0, 2000) || referer?.slice(0, 2000) || null,
        utmSource: body.utmSource?.slice(0, 255) || null,
        utmMedium: body.utmMedium?.slice(0, 255) || null,
        utmCampaign: body.utmCampaign?.slice(0, 255) || null,
        utmTerm: body.utmTerm?.slice(0, 255) || null,
        utmContent: body.utmContent?.slice(0, 255) || null,
        metaJson: {
          ip: ip !== "unknown" ? ip : undefined,
          userAgent: req.headers.get("User-Agent")?.slice(0, 500),
          submittedAt: now.toISOString(),
          processingTimeMs: Date.now() - startTime,
        },
        updatedAt: now,
      },
      select: {
        id: true,
        createdAt: true,
      },
    });

    // Create enquiry event
    await prisma.enquiryEvent.create({
      data: {
        id: randomUUID(),
        companyId,
        enquiryId: enquiry.id,
        type: "created",
        note: `Enquiry received via ${authenticatedKey ? "API" : "website form"}`,
        createdAt: now,
      },
    });

    // Lead scoring (fire-and-forget)
    try {
      const cfgRow = await prisma.leadScoringConfig.findUnique({ where: { companyId } }).catch(() => null);
      const scoringConfig: LeadScoringConfigData = (cfgRow?.config as LeadScoringConfigData) ?? DEFAULT_CONFIG;
      const result = scoreEnquiry(
        { name: body.name, email: body.email, phone: body.phone, message: body.message, postcode: body.postcode },
        scoringConfig,
      );
      await prisma.enquiry.update({
        where: { id: enquiry.id },
        data: { leadScore: result.score, leadPriority: result.priority, leadScoreReason: result.reason as any },
      }).catch(() => null);
      // Write keyword hits
      if (result.reason.keywords.length > 0) {
        await prisma.enquiryKeywordHit.createMany({
          data: result.reason.keywords.map((h) => ({
            companyId,
            enquiryId: enquiry.id,
            keyword: h.keyword,
            points: h.points,
          })),
        }).catch(() => null);
      }
    } catch {
      // Scoring failure should not block enquiry creation
    }

    // Return success with enquiry ID
    return jsonOk(
      {
        enquiryId: enquiry.id,
        message: "Thank you for your enquiry. We will be in touch soon.",
        createdAt: enquiry.createdAt.toISOString(),
      },
      201,
      corsHeaders
    );
  } catch (err) {
    console.error("[POST /api/public/tenants/[tenantSlug]/enquiries] Error:", err);
    return jsonErr("internal_error", 500);
  }
});

/**
 * OPTIONS handler for CORS preflight.
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-QT-Key, X-QT-Signature",
      "Access-Control-Max-Age": "86400",
    },
  });
}
