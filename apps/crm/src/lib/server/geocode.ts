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
