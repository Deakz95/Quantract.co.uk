/**
 * Notification Preferences
 *
 * Manages user notification preferences across channels (email, SMS)
 * Enforces opt-in/opt-out before sending communications
 */

import { getPrisma } from "@/lib/server/prisma";

export type NotificationChannel = "email" | "sms";
export type NotificationCategory =
  | "system"
  | "invoices"
  | "quotes"
  | "jobs"
  | "certificates"
  | "reminders";

/**
 * Default notification preferences for new users
 */
const DEFAULT_PREFERENCES: Array<{ channel: NotificationChannel; category: NotificationCategory; enabled: boolean }> = [
  // Email defaults (all enabled by default)
  { channel: "email", category: "system", enabled: true },
  { channel: "email", category: "invoices", enabled: true },
  { channel: "email", category: "quotes", enabled: true },
  { channel: "email", category: "jobs", enabled: true },
  { channel: "email", category: "certificates", enabled: true },
  { channel: "email", category: "reminders", enabled: true },

  // SMS defaults (all disabled by default - requires explicit opt-in)
  { channel: "sms", category: "system", enabled: false },
  { channel: "sms", category: "invoices", enabled: false },
  { channel: "sms", category: "quotes", enabled: false },
  { channel: "sms", category: "jobs", enabled: false },
  { channel: "sms", category: "certificates", enabled: false },
  { channel: "sms", category: "reminders", enabled: false },
];

/**
 * Initialize default notification preferences for a new user
 */
export async function initializeNotificationPreferences(userId: string) {
  const db = getPrisma();

  // Check if user already has preferences
  const existing = await db.notificationPreference.findFirst({
    where: { userId },
  });

  if (existing) return; // Already initialized

  // Create default preferences
  await db.notificationPreference.createMany({
    data: DEFAULT_PREFERENCES.map((pref) => ({
      userId,
      channel: pref.channel,
      category: pref.category,
      enabled: pref.enabled,
    })),
  });
}

/**
 * Check if user has opted in to a specific notification
 */
export async function canSendNotification(params: {
  userId: string;
  channel: NotificationChannel;
  category: NotificationCategory;
}): Promise<boolean> {
  const db = getPrisma();

  const preference = await db.notificationPreference.findUnique({
    where: {
      userId_channel_category: {
        userId: params.userId,
        channel: params.channel,
        category: params.category,
      },
    },
  });

  // If no preference exists, fall back to defaults
  if (!preference) {
    const defaultPref = DEFAULT_PREFERENCES.find(
      (p) => p.channel === params.channel && p.category === params.category
    );
    return defaultPref?.enabled ?? false;
  }

  return preference.enabled;
}

/**
 * Update a notification preference
 */
export async function updateNotificationPreference(params: {
  userId: string;
  channel: NotificationChannel;
  category: NotificationCategory;
  enabled: boolean;
}) {
  const db = getPrisma();

  await db.notificationPreference.upsert({
    where: {
      userId_channel_category: {
        userId: params.userId,
        channel: params.channel,
        category: params.category,
      },
    },
    create: {
      userId: params.userId,
      channel: params.channel,
      category: params.category,
      enabled: params.enabled,
    },
    update: {
      enabled: params.enabled,
    },
  });
}

/**
 * Get all notification preferences for a user
 */
export async function getNotificationPreferences(userId: string) {
  const db = getPrisma();

  const preferences = await db.notificationPreference.findMany({
    where: { userId },
    orderBy: [{ channel: "asc" }, { category: "asc" }],
  });

  // If no preferences exist, return defaults
  if (preferences.length === 0) {
    return DEFAULT_PREFERENCES.map((pref) => ({
      userId,
      ...pref,
      id: "", // Placeholder
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
  }

  return preferences;
}

/**
 * Check if email notifications are allowed for a category
 * Use this before calling sendQuoteEmail, sendInvoiceEmail, etc.
 */
export async function canSendEmail(userId: string, category: NotificationCategory): Promise<boolean> {
  return canSendNotification({ userId, channel: "email", category });
}

/**
 * Check if SMS notifications are allowed for a category
 * Use this before sending SMS (future feature)
 */
export async function canSendSms(userId: string, category: NotificationCategory): Promise<boolean> {
  return canSendNotification({ userId, channel: "sms", category });
}

/**
 * Bulk disable all notifications for a user (account deletion, unsubscribe all)
 */
export async function disableAllNotifications(userId: string) {
  const db = getPrisma();

  await db.notificationPreference.updateMany({
    where: { userId },
    data: { enabled: false },
  });
}

/**
 * Get users who have opted in to a specific notification type
 * Useful for batch operations
 */
export async function getUsersWithNotificationEnabled(params: {
  userIds: string[];
  channel: NotificationChannel;
  category: NotificationCategory;
}): Promise<string[]> {
  const db = getPrisma();

  const preferences = await db.notificationPreference.findMany({
    where: {
      userId: { in: params.userIds },
      channel: params.channel,
      category: params.category,
      enabled: true,
    },
    select: { userId: true },
  });

  return preferences.map((p: { userId: string }) => p.userId);
}
