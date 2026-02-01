/**
 * One-shot backfill: geocode Site.latitude/longitude from postcode via postcodes.io.
 *
 * Usage:  npx tsx scripts/qa/backfill-site-latlng.ts
 *         npm run qa:backfill-site-latlng
 *
 * Safe: batched (20), rate-limited (200ms gap), logs summary, never throws on geocode failure.
 */

import { PrismaClient } from "@prisma/client";

const BATCH_SIZE = 20;
const DELAY_MS = 200;

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
  // Insert space before last 3 chars: "SW1A1AA" → "SW1A 1AA"
  return stripped.slice(0, -3) + " " + stripped.slice(-3);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const sites = await prisma.site.findMany({
      where: {
        postcode: { not: null },
        OR: [{ latitude: null }, { longitude: null }],
      },
      select: { id: true, postcode: true },
    });

    console.log(`Found ${sites.length} site(s) with postcode but missing lat/lng`);

    let updated = 0;
    let skipped = 0;
    let failed = 0;
    const failedIds: string[] = [];

    for (let i = 0; i < sites.length; i += BATCH_SIZE) {
      const batch = sites.slice(i, i + BATCH_SIZE);
      for (const site of batch) {
        const pc = site.postcode?.trim();
        if (!pc) {
          skipped++;
          continue;
        }

        const geo = await geocodePostcode(pc);
        if (!geo) {
          failed++;
          if (failedIds.length < 20) failedIds.push(site.id);
          console.log(`  FAIL  site=${site.id}  postcode=[redacted]`);
          continue;
        }

        const normalized = normalizePostcode(pc);
        await prisma.site.update({
          where: { id: site.id },
          data: {
            latitude: geo.latitude,
            longitude: geo.longitude,
            postcode: normalized,
          },
        });
        updated++;
        if ((updated + failed) % 10 === 0) {
          console.log(`  progress: ${updated + failed + skipped}/${sites.length}`);
        }
      }

      // Rate-limit between batches
      if (i + BATCH_SIZE < sites.length) {
        await sleep(DELAY_MS);
      }
    }

    console.log("\n=== Backfill Summary ===");
    console.log(`Scanned:  ${sites.length}`);
    console.log(`Updated:  ${updated}`);
    console.log(`Skipped:  ${skipped}`);
    console.log(`Failed:   ${failed}`);
    if (failedIds.length > 0) {
      console.log(`Failed IDs (up to 20): ${failedIds.join(", ")}`);
    }
    console.log("Done.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("Backfill error:", err);
  process.exit(1);
});
