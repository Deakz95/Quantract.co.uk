import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Resend } from "resend";

// Rate limiting: Simple in-memory token bucket
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 3; // 3 requests per minute per IP

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(ip);

  if (!record || now > record.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }

  record.count++;
  return false;
}

// Clean up old rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitStore.entries()) {
    if (now > record.resetAt) {
      rateLimitStore.delete(ip);
    }
  }
}, 60 * 1000);

// Validation schema
const contactSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters"),
  email: z
    .string()
    .email("Please enter a valid email address")
    .max(255, "Email must be less than 255 characters"),
  company: z
    .string()
    .max(100, "Company name must be less than 100 characters")
    .optional()
    .default(""),
  phone: z
    .string()
    .max(30, "Phone number must be less than 30 characters")
    .optional()
    .default(""),
  subject: z.enum(["general", "demo", "sales", "support", "partnership"]),
  message: z
    .string()
    .min(10, "Message must be at least 10 characters")
    .max(5000, "Message must be less than 5000 characters"),
  // Honeypot field - should be empty
  website: z.string().max(0, "Invalid submission").optional().default(""),
});

type ContactFormData = z.infer<typeof contactSchema>;

const SUBJECT_LABELS: Record<string, string> = {
  general: "General Enquiry",
  demo: "Demo Request",
  sales: "Sales / Pricing Question",
  support: "Technical Support",
  partnership: "Partnership / Integration",
};

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }
  return "unknown";
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting check
    const clientIp = getClientIp(request);
    if (isRateLimited(clientIp)) {
      console.log(`[Contact API] Rate limited: ${clientIp}`);
      return NextResponse.json(
        { ok: false, error: "Too many requests. Please try again in a minute." },
        { status: 429 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const result = contactSchema.safeParse(body);

    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      console.log(`[Contact API] Validation failed:`, errors);
      return NextResponse.json(
        { ok: false, error: "Validation failed", errors },
        { status: 400 }
      );
    }

    const data: ContactFormData = result.data;

    // Honeypot check - if website field is filled, it's a bot
    if (data.website && data.website.length > 0) {
      console.log(`[Contact API] Honeypot triggered from: ${clientIp}`);
      // Return success to not reveal bot detection
      return NextResponse.json({ ok: true });
    }

    // Log submission (without sensitive data for GDPR)
    console.log(`[Contact API] New submission:`, {
      subject: data.subject,
      hasCompany: !!data.company,
      hasPhone: !!data.phone,
      messageLength: data.message.length,
      ip: clientIp,
    });

    // Send email via Resend
    const resendApiKey = process.env.RESEND_API_KEY;

    if (!resendApiKey) {
      console.error("[Contact API] RESEND_API_KEY not configured");
      // Still store the submission info for manual follow-up
      return NextResponse.json(
        { ok: false, error: "Email service temporarily unavailable. Please email us directly at hello@quantract.co.uk" },
        { status: 503 }
      );
    }

    const resend = new Resend(resendApiKey);
    const toEmail = process.env.CONTACT_FORM_EMAIL || "hello@quantract.co.uk";
    const fromEmail = process.env.CONTACT_FROM_EMAIL || "noreply@quantract.co.uk";

    const emailResult = await resend.emails.send({
      from: `Quantract Contact Form <${fromEmail}>`,
      to: [toEmail],
      replyTo: data.email,
      subject: `[${SUBJECT_LABELS[data.subject]}] from ${data.name}`,
      text: `
New contact form submission

Name: ${data.name}
Email: ${data.email}
Company: ${data.company || "Not provided"}
Phone: ${data.phone || "Not provided"}
Subject: ${SUBJECT_LABELS[data.subject]}

Message:
${data.message}

---
Submitted from: quantract.co.uk/contact
IP: ${clientIp}
      `.trim(),
      html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
    .field { margin-bottom: 16px; }
    .label { font-weight: 600; color: #6b7280; font-size: 12px; text-transform: uppercase; }
    .value { margin-top: 4px; }
    .message { background: white; padding: 16px; border-radius: 4px; border: 1px solid #e5e7eb; white-space: pre-wrap; }
    .footer { margin-top: 20px; font-size: 12px; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="margin: 0;">New ${SUBJECT_LABELS[data.subject]}</h2>
    </div>
    <div class="content">
      <div class="field">
        <div class="label">Name</div>
        <div class="value">${escapeHtml(data.name)}</div>
      </div>
      <div class="field">
        <div class="label">Email</div>
        <div class="value"><a href="mailto:${escapeHtml(data.email)}">${escapeHtml(data.email)}</a></div>
      </div>
      ${data.company ? `
      <div class="field">
        <div class="label">Company</div>
        <div class="value">${escapeHtml(data.company)}</div>
      </div>
      ` : ""}
      ${data.phone ? `
      <div class="field">
        <div class="label">Phone</div>
        <div class="value"><a href="tel:${escapeHtml(data.phone)}">${escapeHtml(data.phone)}</a></div>
      </div>
      ` : ""}
      <div class="field">
        <div class="label">Message</div>
        <div class="message">${escapeHtml(data.message)}</div>
      </div>
      <div class="footer">
        Submitted from quantract.co.uk/contact
      </div>
    </div>
  </div>
</body>
</html>
      `.trim(),
    });

    if (emailResult.error) {
      console.error("[Contact API] Resend error:", emailResult.error);
      return NextResponse.json(
        { ok: false, error: "Failed to send message. Please try again or email us directly." },
        { status: 500 }
      );
    }

    console.log(`[Contact API] Email sent successfully: ${emailResult.data?.id}`);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[Contact API] Unexpected error:", error);
    return NextResponse.json(
      { ok: false, error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}

// Prevent XSS in email HTML
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}
