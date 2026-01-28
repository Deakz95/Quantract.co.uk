import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import OpenAI from "openai";

/**
 * Marketing Site AI Chat Endpoint
 *
 * This endpoint serves the public-facing marketing assistant.
 * It has NO access to any user data and only answers pricing/features questions.
 */

// Rate limiting: Simple in-memory store
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // 10 requests per minute

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

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitStore.entries()) {
    if (now > record.resetAt) {
      rateLimitStore.delete(ip);
    }
  }
}, 60 * 1000);

// Request schema
const ChatBodySchema = z.object({
  message: z.string().min(1).max(1000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })
    )
    .max(10)
    .optional()
    .default([]),
});

// CRM intent keywords - if detected, redirect to CRM
const CRM_INTENT_KEYWORDS = [
  "my invoice",
  "my invoices",
  "our invoice",
  "my job",
  "my jobs",
  "our job",
  "my quote",
  "my quotes",
  "my customer",
  "my customers",
  "my client",
  "my clients",
  "overdue",
  "outstanding",
  "blocked",
  "schedule",
  "scheduled",
  "my certificate",
  "my certificates",
  "test results",
  "remedial",
  "timesheet",
  "logged hours",
  "my account",
  "my data",
  "our data",
];

function hasCrmIntent(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  return CRM_INTENT_KEYWORDS.some((keyword) => lowerMessage.includes(keyword));
}

// Marketing system prompt
const MARKETING_SYSTEM_PROMPT = `You are Quantract Help, the public-facing assistant for Quantract - job management software built for UK electrical contractors.

## SCOPE / ACCESS

You are the MARKETING ASSISTANT. You have:
- NO access to any user account data
- NO access to jobs, invoices, quotes, certificates, or any CRM data
- NO ability to look up or query any customer information

You CAN answer questions about:
- Pricing and plans (Core £19/mo, Pro £79/mo, Enterprise custom)
- Features and capabilities
- How Quantract works
- Integrations (Xero, Stripe)
- Free trial (14 days, no credit card)
- GDPR compliance and data security
- Support hours (Mon-Fri 9am-5pm GMT)

## STRICT RULES

1. NEVER pretend to have access to user data.
2. NEVER hallucinate or invent data.
3. Be helpful, friendly, and professional.
4. Keep responses concise (2-4 sentences typically).
5. Use British English spelling.
6. Format prices in GBP (£) with VAT status noted.

## PRICING QUICK REFERENCE

- Core: £19/month + VAT - Quote management, client database, 3 users
- Pro: £79/month + VAT - Everything including Jobs, Invoicing, Certificates, Portal, 10 users
- Enterprise: Custom pricing - Unlimited users, dedicated support, SLA
- Free trial: 14 days, full access, no credit card required

## FEATURES

- Professional quotes with e-signatures
- Job tracking and scheduling
- Invoicing with Stripe payments
- BS 7671 digital certificates (EICR, EIC, Minor Works)
- Customer portal for clients
- Xero integration
- Mobile-friendly
- Multi-company support`;

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") || "unknown";
}

export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const clientIp = getClientIp(req);
    if (isRateLimited(clientIp)) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment." },
        { status: 429 }
      );
    }

    // Check if OpenAI is configured
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          answer:
            "The chat assistant is not available at the moment. Please email hello@quantract.co.uk for help.",
          error: "AI not configured",
        },
        { status: 503 }
      );
    }

    // Parse request
    const body = await req.json();
    const parsed = ChatBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { message, history } = parsed.data;

    // Check for CRM intent - redirect if detected
    if (hasCrmIntent(message)) {
      return NextResponse.json({
        id: crypto.randomUUID(),
        answer:
          "I don't have access to account data - I'm the public help assistant. " +
          "Please sign in to your Quantract account at crm.quantract.co.uk " +
          "where the in-app assistant can help you with your jobs, invoices, and more.",
        timestamp: new Date().toISOString(),
        redirectToCrm: true,
      });
    }

    // Build messages for OpenAI
    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: "system", content: MARKETING_SYSTEM_PROMPT },
      ...history.map((h) => ({
        role: h.role as "user" | "assistant",
        content: h.content,
      })),
      { role: "user", content: message },
    ];

    // Call OpenAI
    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages,
      temperature: 0.4,
      max_tokens: 500,
    });

    const answer =
      completion.choices[0]?.message?.content ||
      "I couldn't generate a response. Please try again.";

    return NextResponse.json({
      id: crypto.randomUUID(),
      answer,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Marketing AI] Error:", error);
    return NextResponse.json(
      {
        answer:
          "I encountered an error. Please try again or email hello@quantract.co.uk for help.",
        error: "Internal error",
      },
      { status: 500 }
    );
  }
}

// GET endpoint for suggested prompts
export async function GET() {
  return NextResponse.json({
    prompts: [
      "What does Quantract do?",
      "How much does it cost?",
      "What's included in the free trial?",
      "Can I create EICR certificates?",
      "Does it integrate with Xero?",
      "How do I get started?",
    ],
  });
}
