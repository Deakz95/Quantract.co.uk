"use client";

/**
 * Phase A: signing is handled by server APIs later.
 * Provide minimal stubs for any legacy imports.
 */

export type SigningRecord = {
  quoteId: string;
  signedAtISO: string;
  signerName: string;
  signerEmail?: string;
  signatureDataUrl?: string;
  userAgent?: string;
  ip?: string;
};

export function getSigningRecord(_quoteId: string): SigningRecord | null {
  return null;
}

export function getAllSigningRecords(): SigningRecord[] {
  return [];
}

export function upsertSigningRecord(_record: SigningRecord) {
  // no-op
  return;
}
