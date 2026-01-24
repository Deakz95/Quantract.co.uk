import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { withRequestLogging } from "@/lib/server/observability";
import { ensureCompanyForAdmin, ensureCompanyForEngineer, ensureCompanyForClient } from "@/lib/server/tenancy";
import { upsertUserByRoleEmail, createMagicLink, findUserByRoleEmail } from "@/lib/server/authDb";
import { sendMagicLinkEmail, absoluteUrl } from "@/lib/server/email";
import { rateLimitMagicLink, createRateLimitResponse } from "@/lib/server/rateLimitMiddleware";

const schema = z.object({
  role: z.enum(["admin","engineer","client"]),
  email: z.string().email(),
  rememberMe: z.boolean().optional().default(false),
});

export const POST = withRequestLogging(async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok:false, error:"Invalid request" }, { status: 400 });
  }
  const { role, rememberMe } = parsed.data;
  const email = parsed.data.email.trim().toLowerCase();

  // Apply comprehensive rate limiting (IP + email)
  const rl = rateLimitMagicLink(req as NextRequest, email);
  if (!rl.ok) {
    return createRateLimitResponse({ error: rl.error!, resetAt: rl.resetAt! });
  }

  // Resolve company (only if the email exists in your system)
  let companyId: string | null = null;
  try {
    if (role === "admin") {
      // Optional bootstrap for first admin
      const bootstrap = process.env.ADMIN_EMAIL?.trim().toLowerCase();
      if (bootstrap && bootstrap === email) {
        companyId = await ensureCompanyForAdmin(email);
      } else {
        // Must already exist
        const existing = await findUserByRoleEmail("admin", email);
        if (!existing) {
          return NextResponse.json({ ok:true }); // don't leak existence
        }
        companyId = existing.companyId ?? null;
      }
    }
    if (role === "engineer") companyId = await ensureCompanyForEngineer(email);
    if (role === "client") companyId = await ensureCompanyForClient(email);
  } catch {
    // If company resolution fails, we still return ok (no enumeration)
    return NextResponse.json({ ok:true });
  }

  // Upsert user (ties to company if we can)
  const user = await upsertUserByRoleEmail({
    role,
    email,
    companyId,
  });

  const { raw } = await createMagicLink(user.id);
  const verifyUrl = absoluteUrl(`/api/auth/magic-link/verify?token=${raw}${rememberMe ? '&remember=1' : ''}`);

  try {
    await sendMagicLinkEmail({ to: email, verifyLink: verifyUrl });
  } catch (emailErr) {
    console.error("Failed to send magic link email:", emailErr);
    // Still don't leak; but log for debugging
  }

  return NextResponse.json({ ok:true });
});
