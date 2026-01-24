import { Resend } from "resend";
import { canSendEmail, type NotificationCategory } from "./notifications";
import { getPrisma } from "./prisma";

export type SendEmailArgs = {
  to: string;
  subject: string;
  html: string;
};

export function absoluteUrl(pathOrUrl: string) {
  if (!pathOrUrl) return "";
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) return pathOrUrl;
  const origin = process.env.APP_ORIGIN || process.env.NEXT_PUBLIC_APP_ORIGIN || "";
  if (!origin) return pathOrUrl; // dev fallback
  return `${origin}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}

/**
 * Check if user has opted in to receive this type of email
 * Returns userId if found and opted in, null otherwise
 */
async function checkNotificationPreference(
  email: string,
  category: NotificationCategory
): Promise<{ canSend: boolean; userId: string | null }> {
  try {
    const db = getPrisma();
    const user = await db.user.findFirst({
      where: { email: email.toLowerCase() },
      select: { id: true },
    });

    if (!user) {
      // User not found - allow sending (for new clients/guests)
      return { canSend: true, userId: null };
    }

    const allowed = await canSendEmail(user.id, category);
    return { canSend: allowed, userId: user.id };
  } catch {
    // On error, allow sending (fail open for critical notifications)
    return { canSend: true, userId: null };
  }
}

/**
 * Uses Resend. Set:
 * - RESEND_API_KEY
 * - RESEND_FROM (e.g. "Quantract <no-reply@yourdomain.com>")
 */
export async function sendEmail(args: SendEmailArgs) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!apiKey || !from) {
    const err: any = new Error("Email not configured (missing RESEND_API_KEY or RESEND_FROM)");
    err.status = 500;
    throw err;
  }
  const resend = new Resend(apiKey);
  await resend.emails.send({
    from,
    to: args.to,
    subject: args.subject,
    html: args.html,
  });
}

/**
 * Send email with notification preference check
 * Respects user's opt-in/opt-out preferences
 */
export async function sendEmailWithPreferences(args: SendEmailArgs & { category: NotificationCategory }) {
  const { category, ...emailArgs } = args;

  // Check if user has opted in
  const prefCheck = await checkNotificationPreference(emailArgs.to, category);

  if (!prefCheck.canSend) {
    console.info(`Email blocked by user preference: ${emailArgs.to} - ${category}`);
    return { ok: false, reason: "user_opted_out" };
  }

  await sendEmail(emailArgs);
  return { ok: true };
}

type Totals = { subtotal: number; vat: number; total: number };

function moneyGBP(v: number) {
  try {
    return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(v);
  } catch {
    return `£${Number(v || 0).toFixed(2)}`;
  }
}

function wrapTemplate(title: string, bodyHtml: string) {
  const brand = process.env.NEXT_PUBLIC_QT_BRAND_NAME || "Quantract";
  return `
  <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto; background:#f8fafc; padding:24px;">
    <div style="max-width:640px; margin:0 auto; background:#ffffff; border:1px solid #e2e8f0; border-radius:16px; overflow:hidden;">
      <div style="padding:18px 20px; border-bottom:1px solid #e2e8f0;">
        <div style="font-size:12px; letter-spacing:0.08em; font-weight:800; color:#0f172a;">${brand.toUpperCase()}</div>
        <div style="margin-top:6px; font-size:18px; font-weight:800; color:#0f172a;">${title}</div>
      </div>
      <div style="padding:20px;">
        ${bodyHtml}
      </div>
      <div style="padding:14px 20px; border-top:1px solid #e2e8f0; font-size:12px; color:#64748b;">
        If you weren’t expecting this email you can ignore it.
      </div>
    </div>
  </div>`;
}

/** ✅ QUOTE */
export async function sendQuoteEmail(args: {
  companyId?: string;
  to: string;
  clientName: string;
  quoteId: string;
  shareLink: string;
  totals: Totals;
}) {
  const subject = `Your quote is ready (${args.quoteId})`;
  const html = wrapTemplate(
    "Your quote is ready",
    `
      <p style="margin:0 0 10px; color:#0f172a;">Hi ${args.clientName || "there"},</p>
      <p style="margin:0 0 14px; color:#334155;">You can view and accept your quote using the link below.</p>
      <p style="margin:0 0 14px;">
        <a href="${args.shareLink}" style="display:inline-block; padding:10px 14px; background:#0f172a; color:#fff; border-radius:10px; text-decoration:none; font-weight:700;">
          View quote
        </a>
      </p>
      <div style="margin-top:14px; padding:12px 14px; border:1px solid #e2e8f0; border-radius:12px; color:#0f172a;">
        <div style="font-weight:700; margin-bottom:6px;">Totals</div>
        <div>Subtotal: ${moneyGBP(args.totals.subtotal)}</div>
        <div>VAT: ${moneyGBP(args.totals.vat)}</div>
        <div style="margin-top:6px; font-weight:800;">Total: ${moneyGBP(args.totals.total)}</div>
      </div>
    `
  );
  return await sendEmailWithPreferences({ to: args.to, subject, html, category: "quotes" });
}

/** ✅ INVOICE SEND */
export async function sendInvoiceEmail(args: {
  companyId?: string;
  to: string;
  clientName: string;
  invoiceId: string;
  shareLink: string;
  totals: Totals;
  payLink?: string;
}) {
  const subject = `Invoice ${args.invoiceId}`;
  const payButton = args.payLink
    ? `<p style="margin:0 0 14px;">
         <a href="${args.payLink}" style="display:inline-block; padding:10px 14px; background:#16a34a; color:#fff; border-radius:10px; text-decoration:none; font-weight:800;">
           Pay now
         </a>
       </p>`
    : "";

  const html = wrapTemplate(
    "Invoice issued",
    `
      <p style="margin:0 0 10px; color:#0f172a;">Hi ${args.clientName || "there"},</p>
      <p style="margin:0 0 14px; color:#334155;">Your invoice is ready. View it using the link below.</p>
      ${payButton}
      <p style="margin:0 0 14px;">
        <a href="${args.shareLink}" style="display:inline-block; padding:10px 14px; background:#0f172a; color:#fff; border-radius:10px; text-decoration:none; font-weight:700;">
          View invoice
        </a>
      </p>
      <div style="margin-top:14px; padding:12px 14px; border:1px solid #e2e8f0; border-radius:12px; color:#0f172a;">
        <div style="font-weight:700; margin-bottom:6px;">Totals</div>
        <div>Subtotal: ${moneyGBP(args.totals.subtotal)}</div>
        <div>VAT: ${moneyGBP(args.totals.vat)}</div>
        <div style="margin-top:6px; font-weight:800;">Total: ${moneyGBP(args.totals.total)}</div>
      </div>
    `
  );
  return await sendEmailWithPreferences({ to: args.to, subject, html, category: "invoices" });
}

/** ✅ INVOICE REMINDER */
export async function sendInvoiceReminder(args: {
  companyId?: string;
  to: string;
  clientName: string;
  invoiceId: string;
  shareLink: string;
  totals: Totals;
  balanceDue: number;
  payLink?: string; // ✅ add this to match repo.ts usage
}) {
  const subject = `Reminder: Invoice ${args.invoiceId} payment due`;

  const payButton = args.payLink
    ? `<p style="margin:0 0 14px;">
         <a href="${args.payLink}" style="display:inline-block; padding:10px 14px; background:#16a34a; color:#fff; border-radius:10px; text-decoration:none; font-weight:800;">
           Pay now
         </a>
       </p>`
    : "";

  const html = wrapTemplate(
    "Invoice reminder",
    `
      <p style="margin:0 0 10px; color:#0f172a;">Hi ${args.clientName || "there"},</p>
      <p style="margin:0 0 14px; color:#334155;">A friendly reminder that payment is still due.</p>

      <div style="margin:12px 0 14px; padding:12px 14px; border:1px solid #fde68a; background:#fffbeb; border-radius:12px; color:#92400e;">
        <div style="font-weight:800;">Balance due: ${moneyGBP(args.balanceDue)}</div>
      </div>

      ${payButton}

      <p style="margin:0 0 14px;">
        <a href="${args.shareLink}" style="display:inline-block; padding:10px 14px; background:#0f172a; color:#fff; border-radius:10px; text-decoration:none; font-weight:700;">
          View invoice
        </a>
      </p>

      <div style="margin-top:14px; padding:12px 14px; border:1px solid #e2e8f0; border-radius:12px; color:#0f172a;">
        <div style="font-weight:700; margin-bottom:6px;">Original totals</div>
        <div>Subtotal: ${moneyGBP(args.totals.subtotal)}</div>
        <div>VAT: ${moneyGBP(args.totals.vat)}</div>
        <div style="margin-top:6px; font-weight:800;">Total: ${moneyGBP(args.totals.total)}</div>
      </div>
    `
  );

  return await sendEmailWithPreferences({ to: args.to, subject, html, category: "reminders" });
}

/** ✅ VARIATION */
export async function sendVariationEmail(args: {
  companyId?: string;
  to: string;
  clientName: string;
  variationId: string;
  shareLink: string;
  totals: Totals;
}) {
  const subject = `Variation ${args.variationId}`;
  const html = wrapTemplate(
    "Variation created",
    `
      <p style="margin:0 0 10px; color:#0f172a;">Hi ${args.clientName || "there"},</p>
      <p style="margin:0 0 14px; color:#334155;">A variation has been raised for your approval.</p>
      <p style="margin:0 0 14px;">
        <a href="${args.shareLink}" style="display:inline-block; padding:10px 14px; background:#0f172a; color:#fff; border-radius:10px; text-decoration:none; font-weight:700;">
          View variation
        </a>
      </p>
      <div style="margin-top:14px; padding:12px 14px; border:1px solid #e2e8f0; border-radius:12px; color:#0f172a;">
        <div style="font-weight:700; margin-bottom:6px;">Totals</div>
        <div>Subtotal: ${moneyGBP(args.totals.subtotal)}</div>
        <div>VAT: ${moneyGBP(args.totals.vat)}</div>
        <div style="margin-top:6px; font-weight:800;">Total: ${moneyGBP(args.totals.total)}</div>
      </div>
    `
  );
  await sendEmail({ to: args.to, subject, html });
  return { ok: true };
}

/** ✅ CERTIFICATE ISSUED */
export async function sendCertificateIssuedEmail(args: {
  companyId?: string;
  to: string;
  clientName: string;
  certificateId: string;
  certType: string;
  pdfLink: string;
}) {
  const subject = `Certificate issued (${args.certType})`;
  const html = wrapTemplate(
    "Certificate issued",
    `
      <p style="margin:0 0 10px; color:#0f172a;">Hi ${args.clientName || "there"},</p>
      <p style="margin:0 0 14px; color:#334155;">Your certificate has been issued. Download it below.</p>
      <p style="margin:0 0 14px;">
        <a href="${args.pdfLink}" style="display:inline-block; padding:10px 14px; background:#0f172a; color:#fff; border-radius:10px; text-decoration:none; font-weight:700;">
          Download PDF
        </a>
      </p>
      <div style="font-size:12px; color:#64748b;">Certificate ID: ${args.certificateId}</div>
    `
  );
  await sendEmail({ to: args.to, subject, html });
  return { ok: true };
}

/** ✅ INVITE EMAIL */
export async function sendInviteEmail(args: {
  to: string;
  name?: string;
  role: "client" | "engineer";
  registerLink: string;
  companyName?: string;
}) {
  const brand = args.companyName || process.env.NEXT_PUBLIC_QT_BRAND_NAME || "Quantract";
  const roleLabel = args.role === "client" ? "client" : "engineer";
  const subject = `You've been invited to ${brand}`;
  const html = wrapTemplate(
    `You're invited`,
    `
      <p style="margin:0 0 10px; color:#0f172a;">Hi ${args.name || "there"},</p>
      <p style="margin:0 0 14px; color:#334155;">You've been invited to join ${brand} as a ${roleLabel}.</p>
      <p style="margin:0 0 14px; color:#334155;">Click the button below to create your account and get started.</p>
      <p style="margin:0 0 14px;">
        <a href="${args.registerLink}" style="display:inline-block; padding:12px 18px; background:#0f172a; color:#fff; border-radius:10px; text-decoration:none; font-weight:700;">
          Accept invitation
        </a>
      </p>
      <p style="margin:0; font-size:12px; color:#64748b;">This invitation link will expire in 14 days.</p>
    `
  );
  await sendEmail({ to: args.to, subject, html });
  return { ok: true };
}

/** ✅ MAGIC LINK EMAIL */
export async function sendMagicLinkEmail(args: {
  to: string;
  verifyLink: string;
}) {
  const brand = process.env.NEXT_PUBLIC_QT_BRAND_NAME || "Quantract";
  const subject = `Your secure sign-in link`;
  const html = wrapTemplate(
    `Sign in to ${brand}`,
    `
      <p style="margin:0 0 14px; color:#334155;">Click the button below to sign in. This link expires in 15 minutes.</p>
      <p style="margin:0 0 20px;">
        <a href="${args.verifyLink}" style="display:inline-block; padding:12px 18px; background:#0f172a; color:#fff; border-radius:10px; text-decoration:none; font-weight:700;">
          Sign in
        </a>
      </p>
      <p style="margin:0; font-size:12px; color:#64748b;">If you didn't request this, you can ignore this email.</p>
    `
  );
  await sendEmail({ to: args.to, subject, html });
  return { ok: true };
}
