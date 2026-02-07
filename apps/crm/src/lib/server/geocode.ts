/**
 * Extract a UK postcode from a free-text address string.
 * Returns the postcode in uppercase with a single space (e.g. "M33 5RP") or null.
 */
export function extractUKPostcode(address: string): string | null {
  // Standard UK postcode regex — covers all formats (A9 9AA, A99 9AA, A9A 9AA, AA9 9AA, AA99 9AA, AA9A 9AA)
  const match = address.match(
    /\b([A-Z]{1,2}\d[A-Z\d]?)\s*(\d[A-Z]{2})\b/i
  );
  if (!match) return null;
  return `${match[1].toUpperCase()} ${match[2].toUpperCase()}`;
}

/**
 * Free UK postcode geocoding via postcodes.io (no API key required).
 * Returns { latitude, longitude } or null if lookup fails.
 */
export async function geocodePostcode(
  postcode: string
): Promise<{ latitude: number; longitude: number } | null> {
  const cleaned = postcode.trim().replace(/\s+/g, "");
  if (!cleaned) return null;

  try {
    const res = await fetch(
      `https://api.postcodes.io/postcodes/${encodeURIComponent(cleaned)}`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return null;
    const json = await res.json();
    if (json.status !== 200 || !json.result) return null;
    const { latitude, longitude } = json.result;
    if (typeof latitude !== "number" || typeof longitude !== "number") return null;
    return { latitude, longitude };
  } catch {
    return null;
  }
}
