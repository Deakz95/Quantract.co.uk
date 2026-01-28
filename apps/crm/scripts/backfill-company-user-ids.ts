/**
 * Backfill script: Populate CompanyUser.userId from matching User records
 *
 * This script safely links CompanyUser records to their corresponding User records
 * by matching on (companyId, email) and optionally role.
 *
 * Run this after the migration: 20260128000000_add_company_user_user_id_fk
 *
 * Usage:
 *   npx tsx scripts/backfill-company-user-ids.ts [--dry-run]
 *
 * Options:
 *   --dry-run    Preview changes without writing to database
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  log: ["warn", "error"],
});

interface BackfillStats {
  total: number;
  alreadyLinked: number;
  matched: number;
  ambiguous: number;
  noMatch: number;
  errors: number;
}

interface AmbiguousCase {
  companyUserId: string;
  companyId: string;
  email: string;
  role: string;
  matchingUserIds: string[];
}

async function backfillCompanyUserIds(dryRun: boolean): Promise<void> {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`CompanyUser.userId Backfill Script`);
  console.log(`Mode: ${dryRun ? "DRY RUN (no changes will be made)" : "LIVE"}`);
  console.log(`${"=".repeat(60)}\n`);

  const stats: BackfillStats = {
    total: 0,
    alreadyLinked: 0,
    matched: 0,
    ambiguous: 0,
    noMatch: 0,
    errors: 0,
  };

  const ambiguousCases: AmbiguousCase[] = [];

  // Fetch all CompanyUser records
  const companyUsers = await prisma.companyUser.findMany({
    select: {
      id: true,
      companyId: true,
      email: true,
      role: true,
      userId: true,
    },
  });

  stats.total = companyUsers.length;
  console.log(`Found ${stats.total} CompanyUser records to process\n`);

  for (const cu of companyUsers) {
    // Skip if already linked
    if (cu.userId) {
      stats.alreadyLinked++;
      continue;
    }

    const normalizedEmail = cu.email.toLowerCase().trim();

    try {
      // Find matching User records by companyId + email
      const matchingUsers = await prisma.user.findMany({
        where: {
          companyId: cu.companyId,
          email: { equals: normalizedEmail, mode: "insensitive" },
        },
        select: {
          id: true,
          role: true,
          email: true,
        },
      });

      if (matchingUsers.length === 0) {
        // No matching user found
        stats.noMatch++;
        console.log(`  [NO MATCH] CompanyUser ${cu.id}: ${cu.email} in company ${cu.companyId}`);
        continue;
      }

      if (matchingUsers.length === 1) {
        // Single match - link it
        const user = matchingUsers[0];
        if (!dryRun) {
          await prisma.companyUser.update({
            where: { id: cu.id },
            data: { userId: user.id },
          });
        }
        stats.matched++;
        console.log(`  [MATCHED] CompanyUser ${cu.id} -> User ${user.id} (${cu.email})`);
        continue;
      }

      // Multiple matches - try to pick the best one
      // Priority: matching role > admin > office/finance > engineer > client
      const roleOrder = ["admin", "office", "finance", "engineer", "client"];

      // First, try exact role match
      const exactRoleMatch = matchingUsers.find(
        (u: { id: string; role: string; email: string }) => u.role.toLowerCase() === cu.role.toLowerCase()
      );
      if (exactRoleMatch) {
        if (!dryRun) {
          await prisma.companyUser.update({
            where: { id: cu.id },
            data: { userId: exactRoleMatch.id },
          });
        }
        stats.matched++;
        console.log(
          `  [MATCHED by role] CompanyUser ${cu.id} -> User ${exactRoleMatch.id} (${cu.email}, role: ${cu.role})`
        );
        continue;
      }

      // Otherwise, pick by role priority
      const sortedUsers = matchingUsers.sort((a: { role: string }, b: { role: string }) => {
        const aIndex = roleOrder.indexOf(a.role.toLowerCase());
        const bIndex = roleOrder.indexOf(b.role.toLowerCase());
        return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
      });

      const bestMatch = sortedUsers[0];
      if (bestMatch) {
        if (!dryRun) {
          await prisma.companyUser.update({
            where: { id: cu.id },
            data: { userId: bestMatch.id },
          });
        }
        stats.matched++;
        console.log(
          `  [MATCHED by priority] CompanyUser ${cu.id} -> User ${bestMatch.id} (${cu.email}, picked ${bestMatch.role} from ${matchingUsers.length} candidates)`
        );
      } else {
        // Should not happen, but track as ambiguous
        stats.ambiguous++;
        ambiguousCases.push({
          companyUserId: cu.id,
          companyId: cu.companyId,
          email: cu.email,
          role: cu.role,
          matchingUserIds: matchingUsers.map((u: { id: string }) => u.id),
        });
        console.log(
          `  [AMBIGUOUS] CompanyUser ${cu.id}: ${cu.email} has ${matchingUsers.length} matches, could not resolve`
        );
      }
    } catch (error) {
      stats.errors++;
      console.error(`  [ERROR] CompanyUser ${cu.id}:`, error);
    }
  }

  // Print summary
  console.log(`\n${"=".repeat(60)}`);
  console.log(`SUMMARY`);
  console.log(`${"=".repeat(60)}`);
  console.log(`Total CompanyUser records:   ${stats.total}`);
  console.log(`Already linked (skipped):    ${stats.alreadyLinked}`);
  console.log(`Successfully matched:        ${stats.matched}`);
  console.log(`No matching User found:      ${stats.noMatch}`);
  console.log(`Ambiguous (left unlinked):   ${stats.ambiguous}`);
  console.log(`Errors:                      ${stats.errors}`);
  console.log(`${"=".repeat(60)}\n`);

  if (ambiguousCases.length > 0) {
    console.log(`\nAMBIGUOUS CASES (require manual review):`);
    for (const c of ambiguousCases) {
      console.log(`  - CompanyUser ${c.companyUserId}: ${c.email} (role: ${c.role})`);
      console.log(`    Matching User IDs: ${c.matchingUserIds.join(", ")}`);
    }
  }

  if (stats.noMatch > 0) {
    console.log(`\nNO MATCH CASES: ${stats.noMatch} CompanyUser records have no matching User.`);
    console.log(`These may be from invite flows where User hasn't accepted yet.`);
  }

  if (dryRun) {
    console.log(`\nThis was a DRY RUN. No changes were made.`);
    console.log(`Run without --dry-run to apply changes.\n`);
  } else {
    console.log(`\nBackfill complete!\n`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");

  try {
    await backfillCompanyUserIds(dryRun);
  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
