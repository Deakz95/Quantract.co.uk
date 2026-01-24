import { resend } from "@/lib/resend";

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  return resend.emails.send({
    from: process.env.RESEND_FROM ?? "no-reply@yourdomain.com",
    to,
    subject,
    html,
  });
}
