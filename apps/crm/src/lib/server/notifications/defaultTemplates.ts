/**
 * Default SMS notification templates
 * These are installed for new companies
 */

import type { NotificationEventKey } from "./types";

export const DEFAULT_SMS_TEMPLATES: Record<NotificationEventKey, string> = {
  // Appointments & Jobs
  appointmentBooked:
    "{companyName}: Appointment booked for {jobDate} {jobTime}. Address: {jobAddress}. Manage: {portalLink}",

  appointmentReminder24h:
    "{companyName}: Reminder—your appointment is {jobDate} at {jobTime}. Need to reschedule? {portalLink}",

  appointmentReminder2h:
    "{companyName}: We'll see you today at {jobTime}. If anything changes, update here: {portalLink}",

  engineerOnTheWay:
    "{companyName}: {engineerName} is on the way and should arrive in ~{etaMinutes} mins. Track/update: {portalLink}",

  jobCompleted:
    "{companyName}: Job complete—thanks. Your documents will be available here: {portalLink}",

  // Quotes
  quoteSent:
    "{companyName}: Your quote {quoteNumber} is ready. View/accept: {quoteLink}",

  quoteReminder:
    "{companyName}: Reminder—quote {quoteNumber} is awaiting approval. View/accept: {quoteLink}",

  quoteAccepted:
    "{companyName}: Thanks—quote {quoteNumber} accepted. We'll confirm scheduling shortly. Portal: {portalLink}",

  // Invoices & Payments
  invoiceIssued:
    "{companyName}: Invoice {invoiceNumber} for {invoiceTotal} is ready. Pay/view: {paymentLink}",

  invoiceOverdue:
    "{companyName}: Reminder—invoice {invoiceNumber} ({invoiceTotal}) is overdue. Pay/view: {paymentLink}",

  invoiceFinalReminder:
    "{companyName}: Final reminder—invoice {invoiceNumber} ({invoiceTotal}) remains unpaid. Settle here: {paymentLink}",

  paymentReceived:
    "{companyName}: Payment received for invoice {invoiceNumber}. Thank you. Receipt: {portalLink}",

  // Certificates
  certificateIssued:
    "{companyName}: Your certificate is now available to download: {portalLink}",

  // Portal
  portalInvite:
    "{companyName}: You've been invited to your customer portal. Set access here: {portalLink}",
};

// Character limit info
export const SMS_CHAR_LIMITS = {
  GSM7: 160, // Standard GSM-7 characters
  GSM7_MULTIPART: 153, // Each segment in multipart GSM-7
  UCS2: 70, // Unicode characters
  UCS2_MULTIPART: 67, // Each segment in multipart Unicode
};

/**
 * Calculate SMS segments for a message
 */
export function calculateSMSSegments(message: string): {
  segments: number;
  encoding: "GSM7" | "UCS2";
  charCount: number;
  remainingChars: number;
} {
  // Check if message contains non-GSM characters
  const GSM7_CHARS =
    "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ ÆæßÉ!\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
  const GSM7_EXTENDED = "\\^{}[]~|€";

  let isUCS2 = false;
  let charCount = 0;

  for (const char of message) {
    if (GSM7_CHARS.includes(char)) {
      charCount++;
    } else if (GSM7_EXTENDED.includes(char)) {
      charCount += 2; // Extended chars count as 2
    } else {
      isUCS2 = true;
      break;
    }
  }

  if (isUCS2) {
    charCount = message.length;
    const { UCS2, UCS2_MULTIPART } = SMS_CHAR_LIMITS;
    if (charCount <= UCS2) {
      return {
        segments: 1,
        encoding: "UCS2",
        charCount,
        remainingChars: UCS2 - charCount,
      };
    }
    const segments = Math.ceil(charCount / UCS2_MULTIPART);
    return {
      segments,
      encoding: "UCS2",
      charCount,
      remainingChars: segments * UCS2_MULTIPART - charCount,
    };
  }

  const { GSM7, GSM7_MULTIPART } = SMS_CHAR_LIMITS;
  if (charCount <= GSM7) {
    return {
      segments: 1,
      encoding: "GSM7",
      charCount,
      remainingChars: GSM7 - charCount,
    };
  }
  const segments = Math.ceil(charCount / GSM7_MULTIPART);
  return {
    segments,
    encoding: "GSM7",
    charCount,
    remainingChars: segments * GSM7_MULTIPART - charCount,
  };
}
