/**
 * SMS Provider Adapter Interface
 *
 * Supports multiple SMS providers via a common interface.
 * Currently implements a mock provider for development.
 * Twilio/MessageBird can be added as real implementations.
 */

import type { SMSProviderConfig, SMSProviderResult } from "./types";

export interface SMSProvider {
  name: string;
  send(to: string, message: string, config: SMSProviderConfig): Promise<SMSProviderResult>;
  validateConfig(config: SMSProviderConfig): boolean;
  estimateCost(segments: number): number; // Returns cost in pence
}

/**
 * Mock SMS Provider for development/testing
 */
export class MockSMSProvider implements SMSProvider {
  name = "mock";

  async send(to: string, message: string, _config: SMSProviderConfig): Promise<SMSProviderResult> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Validate phone number format (basic UK check)
    if (!to.match(/^(\+44|0)[0-9]{10}$/)) {
      return {
        success: false,
        error: "Invalid phone number format",
      };
    }

    // Simulate occasional failures (5% chance)
    if (Math.random() < 0.05) {
      return {
        success: false,
        error: "Simulated provider error",
      };
    }

    // Calculate segments
    const segments = Math.ceil(message.length / 160);

    console.log(`[MockSMS] Sending to ${to}: "${message.substring(0, 50)}..."`);

    return {
      success: true,
      messageId: `mock_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      segments,
      cost: segments * 4, // 4p per segment
    };
  }

  validateConfig(_config: SMSProviderConfig): boolean {
    return true; // Mock provider always valid
  }

  estimateCost(segments: number): number {
    return segments * 4; // 4p per segment
  }
}

/**
 * Twilio SMS Provider (stub - implement when needed)
 */
export class TwilioSMSProvider implements SMSProvider {
  name = "twilio";

  async send(to: string, message: string, config: SMSProviderConfig): Promise<SMSProviderResult> {
    // TODO: Implement actual Twilio integration
    // const client = require('twilio')(config.apiKey, config.apiSecret);
    // const result = await client.messages.create({
    //   body: message,
    //   from: config.senderId,
    //   to: to,
    // });

    console.log(`[Twilio] Would send to ${to}: "${message.substring(0, 50)}..."`);

    // For now, return mock response
    const segments = Math.ceil(message.length / 160);
    return {
      success: true,
      messageId: `twilio_stub_${Date.now()}`,
      segments,
      cost: segments * 4,
    };
  }

  validateConfig(config: SMSProviderConfig): boolean {
    return Boolean(config.apiKey && config.senderId);
  }

  estimateCost(segments: number): number {
    return segments * 4; // ~4p per segment for UK
  }
}

/**
 * Get SMS provider instance by name
 */
export function getSMSProvider(providerName?: string | null): SMSProvider {
  switch (providerName?.toLowerCase()) {
    case "twilio":
      return new TwilioSMSProvider();
    case "mock":
    default:
      return new MockSMSProvider();
  }
}

/**
 * Format phone number for sending
 * Converts UK numbers to international format
 */
export function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters except +
  let cleaned = phone.replace(/[^\d+]/g, "");

  // Handle UK numbers
  if (cleaned.startsWith("0") && cleaned.length === 11) {
    cleaned = "+44" + cleaned.substring(1);
  } else if (cleaned.startsWith("44") && !cleaned.startsWith("+")) {
    cleaned = "+" + cleaned;
  } else if (!cleaned.startsWith("+")) {
    // Assume UK number if no country code
    cleaned = "+44" + cleaned;
  }

  return cleaned;
}

/**
 * Validate phone number format
 */
export function isValidPhoneNumber(phone: string): boolean {
  const formatted = formatPhoneNumber(phone);
  // Basic validation - starts with + followed by 10-15 digits
  return /^\+[0-9]{10,15}$/.test(formatted);
}
