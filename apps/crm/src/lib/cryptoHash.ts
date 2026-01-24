// src/lib/cryptoHash.ts
"use client";

export async function sha256Hex(input: string) {
  const enc = new TextEncoder().encode(input);
  const hashBuf = await crypto.subtle.digest("SHA-256", enc);
  const hashArr = Array.from(new Uint8Array(hashBuf));
  return hashArr.map((b) => b.toString(16).padStart(2, "0")).join("");
}
