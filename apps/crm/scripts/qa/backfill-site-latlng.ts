/**
 * One-shot backfill: geocode Site.latitude/longitude from postcode via postcodes.io.
 *
 * Two passes:
 * 1) Sites with postcode field set but missing lat/lng
 * 2) Sites with no postcode but address containing a UK postcode pattern — extracts and sets it
 *
 * Usage:  npx tsx scripts/qa/backfill-site-latlng.ts
 *         npm run qa:backfill-site-latlng
 *
 * Safe: batched (20), rate-limited (200ms gap), logs summary, never throws on geocode failure.
 */

import { PrismaClient } from "@prisma/client";

const BATCH_SIZE = 20;
const DELAY_MS = 200;

// UK postcode regex (matches most valid formats)
const UK_POSTCODE_RE =
  /\b([A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})\b/i;

async function geocodePostcode(
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

function normalizePostcode(raw: string): string {
  const stripped = raw.trim().replace(/\s+/g, "").toUpperCase();
  if (stripped.length < 4) return stripped;
  return stripped.slice(0, -3) + " " + stripped.slice(-3);
}

function extractPostcode(address: string): string | null {
  const m = address.match(UK_POSTCODE_RE);
  return m ? m[1] : null;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function processSites(
  prisma: PrismaClient,
  sites: { id: string; postcode: string }[],
  label: string,
  setPostcode: boolean
) {
  let updated = 0;
  let skipped = 0;
  let failed = 0;
  const failedIds: string[] = [];

  for (let i = 0; i < sites.length; i += BATCH_SIZE) {
    const batch = sites.slice(i, i + BATCH_SIZE);
    for (const site of batch) {
      const pc = site.postcode?.trim();
      if (!pc) { skipped++; continue; }

      const geo = await geocodePostcode(pc);
      if (!geo) {
        failed++;
        if (failedIds.length < 20) failedIds.push(site.id);
        console.log(`  FAIL  site=${site.id}`);
        continue;
      }

      const normalized = normalizePostcode(pc);
      const data: Record<string, unknown> = {
        latitude: geo.latitude,
        longitude: geo.longitude,
      };
      if (setPostcode) data.postcode = normalized;
      else data.postcode = normalized; // always normalize

      await (prisma.site as any).update({ where: { id: site.id }, data });
      updated++;
      if ((updated + failed) % 10 === 0) {
        console.log(`  progress: ${updated + failed + skipped}/${sites.length}`);
      }
    }
    if (i + BATCH_SIZE < sites.length) await sleep(DELAY_MS);
  }

  console.log(`\n=== ${label} Summary ===`);
  console.log(`Scanned:  ${sites.length}`);
  console.log(`Updated:  ${updated}`);
  console.log(`Skipped:  ${skipped}`);
  console.log(`Failed:   ${failed}`);
  if (failedIds.length > 0) {
    console.log(`Failed IDs (up to 20): ${failedIds.join(", ")}`);
  }
  return { updated, failed };
}

async function main() {
  const prisma = new PrismaClient();
  try {
    // Pass 1: Sites with postcode but missing lat/lng
    const pass1 = await prisma.site.findMany({
      where: {
        postcode: { not: null },
        OR: [{ latitude: null }, { longitude: null }],
      },
      select: { id: true, postcode: true },
    });
    console.log(`Pass 1: ${pass1.length} site(s) with postcode but missing lat/lng`);
    const r1 = await processSites(prisma, pass1 as any[], "Pass 1 (postcode field)", false);

    // Pass 2: Sites with no postcode, but address contains a UK postcode
    const noPostcode = await prisma.site.findMany({
      where: { postcode: null, address1: { not: null } },
      select: { id: true, address1: true },
    });
    const pass2: { id: string; postcode: string }[] = [];
    for (const s of noPostcode) {
      const extracted = extractPostcode(s.address1 ?? "");
      if (extracted) pass2.push({ id: s.id, postcode: extracted });
    }
    console.log(`\nPass 2: ${noPostcode.length} site(s) without postcode checked, ${pass2.length} had extractable postcode in address`);
    const r2 = await processSites(prisma, pass2, "Pass 2 (extracted from address)", true);

    console.log(`\n=== TOTAL: ${r1.updated + r2.updated} updated, ${r1.failed + r2.failed} failed ===`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => { console.error("Backfill error:", err); process.exit(1); });
