/**
 * Notification System
 *
 * Main entry point for the notification system.
 */

export * from "./types";
export * from "./defaultTemplates";
export * from "./smsProvider";
export {
  sendNotification,
  initializeDefaultTemplates,
  renderTemplate,
} from "./sendNotification";
