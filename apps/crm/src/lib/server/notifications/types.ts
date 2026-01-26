/**
 * Notification System Types
 */

export type NotificationChannel = "SMS" | "EMAIL";

export type NotificationEventKey =
  // Appointments & Jobs
  | "appointmentBooked"
  | "appointmentReminder24h"
  | "appointmentReminder2h"
  | "engineerOnTheWay"
  | "jobCompleted"
  // Quotes
  | "quoteSent"
  | "quoteReminder"
  | "quoteAccepted"
  // Invoices & Payments
  | "invoiceIssued"
  | "invoiceOverdue"
  | "invoiceFinalReminder"
  | "paymentReceived"
  // Certificates
  | "certificateIssued"
  // Portal
  | "portalInvite";

export type NotificationLogStatus = "sent" | "skipped" | "failed";

export type NotificationSkipReason =
  | "noConsent"
  | "noCredits"
  | "quietHours"
  | "rateLimited"
  | "missingPhone"
  | "missingEmail"
  | "disabled"
  | "providerError";

export interface NotificationContext {
  companyId: string;
  clientId?: string;
  jobId?: string;
  invoiceId?: string;
  quoteId?: string;
  certificateId?: string;
}

export interface TemplateVariables {
  // Company
  companyName?: string;
  // Client
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  // Job
  jobReference?: string;
  jobDate?: string;
  jobTime?: string;
  jobAddress?: string;
  // Engineer
  engineerName?: string;
  etaMinutes?: string;
  // Quote
  quoteNumber?: string;
  quoteLink?: string;
  quoteTotal?: string;
  // Invoice
  invoiceNumber?: string;
  invoiceTotal?: string;
  paymentLink?: string;
  // Certificate
  certificateNumber?: string;
  certificateType?: string;
  // Portal
  portalLink?: string;
  // Custom
  [key: string]: string | undefined;
}

export interface SMSProviderConfig {
  provider: string;
  apiKey: string;
  apiSecret?: string;
  senderId?: string;
}

export interface SMSProviderResult {
  success: boolean;
  messageId?: string;
  segments?: number;
  cost?: number; // in pence
  error?: string;
}

export interface NotificationResult {
  success: boolean;
  status: NotificationLogStatus;
  skipReason?: NotificationSkipReason;
  messageId?: string;
  error?: string;
}

// Event category groupings for UI
export const EVENT_CATEGORIES = {
  appointments: {
    label: "Appointments & Jobs",
    events: [
      "appointmentBooked",
      "appointmentReminder24h",
      "appointmentReminder2h",
      "engineerOnTheWay",
      "jobCompleted",
    ] as NotificationEventKey[],
  },
  quotes: {
    label: "Quotes",
    events: ["quoteSent", "quoteReminder", "quoteAccepted"] as NotificationEventKey[],
  },
  invoices: {
    label: "Invoices & Payments",
    events: [
      "invoiceIssued",
      "invoiceOverdue",
      "invoiceFinalReminder",
      "paymentReceived",
    ] as NotificationEventKey[],
  },
  certificates: {
    label: "Certificates",
    events: ["certificateIssued"] as NotificationEventKey[],
  },
  portal: {
    label: "Portal",
    events: ["portalInvite"] as NotificationEventKey[],
  },
};

// Human-readable event names
export const EVENT_LABELS: Record<NotificationEventKey, string> = {
  appointmentBooked: "Appointment Booked",
  appointmentReminder24h: "24-Hour Reminder",
  appointmentReminder2h: "2-Hour Reminder",
  engineerOnTheWay: "Engineer On The Way",
  jobCompleted: "Job Completed",
  quoteSent: "Quote Sent",
  quoteReminder: "Quote Reminder",
  quoteAccepted: "Quote Accepted",
  invoiceIssued: "Invoice Issued",
  invoiceOverdue: "Invoice Overdue",
  invoiceFinalReminder: "Final Payment Reminder",
  paymentReceived: "Payment Received",
  certificateIssued: "Certificate Issued",
  portalInvite: "Portal Invite",
};

// Available template variables per event
export const EVENT_VARIABLES: Record<NotificationEventKey, string[]> = {
  appointmentBooked: [
    "companyName",
    "clientName",
    "jobDate",
    "jobTime",
    "jobAddress",
    "portalLink",
  ],
  appointmentReminder24h: [
    "companyName",
    "clientName",
    "jobDate",
    "jobTime",
    "portalLink",
  ],
  appointmentReminder2h: ["companyName", "clientName", "jobTime", "portalLink"],
  engineerOnTheWay: [
    "companyName",
    "clientName",
    "engineerName",
    "etaMinutes",
    "portalLink",
  ],
  jobCompleted: ["companyName", "clientName", "portalLink"],
  quoteSent: ["companyName", "clientName", "quoteNumber", "quoteLink"],
  quoteReminder: ["companyName", "clientName", "quoteNumber", "quoteLink"],
  quoteAccepted: ["companyName", "clientName", "quoteNumber", "portalLink"],
  invoiceIssued: [
    "companyName",
    "clientName",
    "invoiceNumber",
    "invoiceTotal",
    "paymentLink",
  ],
  invoiceOverdue: [
    "companyName",
    "clientName",
    "invoiceNumber",
    "invoiceTotal",
    "paymentLink",
  ],
  invoiceFinalReminder: [
    "companyName",
    "clientName",
    "invoiceNumber",
    "invoiceTotal",
    "paymentLink",
  ],
  paymentReceived: [
    "companyName",
    "clientName",
    "invoiceNumber",
    "portalLink",
  ],
  certificateIssued: ["companyName", "clientName", "portalLink"],
  portalInvite: ["companyName", "clientName", "portalLink"],
};
