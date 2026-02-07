/**
 * One-off backfill script: geocodes all sites that have addresses but no lat/lng.
 *
 * Usage: npx tsx scripts/backfill-geocode.ts
 */
import { PrismaClient } from "@prisma/client";

const UK_POSTCODE_RE = /\b([A-Z]{1,2}\d[A-Z\d]?)\s*(\d[A-Z]{2})\b/i;

function extractUKPostcode(address: string): string | null {
  const match = address.match(UK_POSTCODE_RE);
  if (!match) return null;
  return `${match[1].toUpperCase()} ${match[2].toUpperCase()}`;
}

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

async function main() {
  const prisma = new PrismaClient();

  try {
    // Find sites with address but no coordinates
    const sites = await prisma.site.findMany({
      where: {
        latitude: null,
        OR: [
          { address1: { not: null } },
          { postcode: { not: null } },
        ],
      },
      select: {
        id: true,
        companyId: true,
        name: true,
        address1: true,
        postcode: true,
      },
    });

    console.log(`Found ${sites.length} site(s) without coordinates.\n`);

    let geocoded = 0;
    let postcodeExtracted = 0;
    let failed = 0;
    let skipped = 0;

    for (const site of sites) {
      let postcode = site.postcode;

      // Try to extract postcode from address1 if not present
      if (!postcode && site.address1) {
        postcode = extractUKPostcode(site.address1);
        if (postcode) {
          postcodeExtracted++;
          console.log(`  Extracted postcode "${postcode}" from address: ${site.address1}`);
        }
      }

      if (!postcode) {
        console.log(`  SKIP ${site.id} (${site.name || "unnamed"}) — no postcode found`);
        skipped++;
        continue;
      }

      const geo = await geocodePostcode(postcode);
      if (geo) {
        await prisma.site.update({
          where: { id: site.id },
          data: {
            postcode,
            latitude: geo.latitude,
            longitude: geo.longitude,
            updatedAt: new Date(),
          },
        });
        geocoded++;
        console.log(`  OK ${site.id} (${site.name || "unnamed"}) — ${postcode} -> ${geo.latitude}, ${geo.longitude}`);
      } else {
        // Still store the extracted postcode even if geocoding fails
        if (!site.postcode && postcode) {
          await prisma.site.update({
            where: { id: site.id },
            data: { postcode, updatedAt: new Date() },
          });
        }
        failed++;
        console.log(`  FAIL ${site.id} (${site.name || "unnamed"}) — geocode failed for "${postcode}"`);
      }

      // Rate-limit: postcodes.io allows ~3 req/s for free
      await new Promise((r) => setTimeout(r, 350));
    }

    console.log(`\n--- Summary ---`);
    console.log(`Total sites processed: ${sites.length}`);
    console.log(`Geocoded:              ${geocoded}`);
    console.log(`Postcodes extracted:   ${postcodeExtracted}`);
    console.log(`Failed:                ${failed}`);
    console.log(`Skipped (no postcode): ${skipped}`);

    // Check how many sites now have coordinates
    const withCoords = await prisma.site.count({
      where: { latitude: { not: null }, longitude: { not: null } },
    });
    console.log(`\nSites with coordinates: ${withCoords}`);

    // Simulate what map-pins would return — count jobs with geocoded sites
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const jobsWithPins = await prisma.job.count({
      where: {
        deletedAt: null,
        createdAt: { gte: ninetyDaysAgo },
        site: {
          latitude: { not: null },
          longitude: { not: null },
        },
      },
    });
    console.log(`Jobs with map pins (last 90 days): ${jobsWithPins}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
