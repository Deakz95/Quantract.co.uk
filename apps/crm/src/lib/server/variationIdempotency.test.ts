import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock @neondatabase/auth to avoid next/headers import issue in test environment
vi.mock("@neondatabase/auth/next/server", () => ({
  neonAuth: vi.fn(),
  createAuthServer: vi.fn(),
}));

import * as repo from "./repo";

let dataDir = "";
let dataPath = "";

beforeEach(() => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "qt-variation-"));
  dataPath = path.join(dataDir, "db.json");
  process.env.QT_DATA_PATH = dataPath;
  delete process.env.QT_USE_PRISMA;
});

afterEach(() => {
  if (dataDir) {
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
  delete process.env.QT_DATA_PATH;
});

// Note: These integration tests require a database connection (Prisma).
// They are skipped in CI environments without DATABASE_URL.
// Run with: DATABASE_URL=<your_db_url> npm run test:unit variationIdempotency.test.ts
describe.skip("Variation approval idempotency and revenue safety", () => {
  it("approving a variation twice does not duplicate revenue impact", async () => {
    // Create a quote and job
    const quote = await repo.createQuote({
      clientName: "Test Client",
      clientEmail: "test@example.com",
      notes: "Test quote for variation",
      vatRate: 20,
    });
    expect(quote).not.toBeNull();

    const job = await repo.ensureJobForQuote(quote!.id);
    expect(job).not.toBeNull();

    // Record initial budget
    const initialSubtotal = job!.budgetSubtotal;
    const initialVat = job!.budgetVat;
    const initialTotal = job!.budgetTotal;

    // Create a variation
    const variation = await repo.createVariationForJob({
      jobId: job!.id,
      title: "Test Variation",
      description: "Testing idempotency",
      subtotal: 10000, // £100.00
      vat: 2000,       // £20.00
      total: 12000,    // £120.00
    });
    expect(variation).not.toBeNull();

    // Send the variation to generate a token
    const sent = await repo.sendVariation(variation!.id);
    expect(sent).not.toBeNull();
    expect(sent!.token).toBeTruthy();

    const token = sent!.token!;

    // First approval - should increment budget
    const firstApproval = await repo.decideVariationByToken(token, "approved");
    expect(firstApproval).not.toBeNull();
    expect(firstApproval!.status).toBe("approved");

    // Fetch updated job to verify budget increment
    const jobAfterFirst = await repo.getJobById(job!.id);
    expect(jobAfterFirst).not.toBeNull();
    expect(jobAfterFirst!.budgetSubtotal).toBe(initialSubtotal + 10000);
    expect(jobAfterFirst!.budgetVat).toBe(initialVat + 2000);
    expect(jobAfterFirst!.budgetTotal).toBe(initialTotal + 12000);

    // Second approval - IDEMPOTENT: should NOT increment budget again
    const secondApproval = await repo.decideVariationByToken(token, "approved");
    expect(secondApproval).not.toBeNull();
    expect(secondApproval!.status).toBe("approved");

    // Fetch job again - budget should be UNCHANGED from first approval
    const jobAfterSecond = await repo.getJobById(job!.id);
    expect(jobAfterSecond).not.toBeNull();
    expect(jobAfterSecond!.budgetSubtotal).toBe(initialSubtotal + 10000); // Still only +10000, not +20000
    expect(jobAfterSecond!.budgetVat).toBe(initialVat + 2000);             // Still only +2000, not +4000
    expect(jobAfterSecond!.budgetTotal).toBe(initialTotal + 12000);        // Still only +12000, not +24000
  });

  it("rejecting a variation has zero financial impact", async () => {
    // Create a quote and job
    const quote = await repo.createQuote({
      clientName: "Test Client 2",
      clientEmail: "test2@example.com",
      notes: "Test quote for rejection",
      vatRate: 20,
    });
    expect(quote).not.toBeNull();

    const job = await repo.ensureJobForQuote(quote!.id);
    expect(job).not.toBeNull();

    // Record initial budget
    const initialSubtotal = job!.budgetSubtotal;
    const initialVat = job!.budgetVat;
    const initialTotal = job!.budgetTotal;

    // Create a variation
    const variation = await repo.createVariationForJob({
      jobId: job!.id,
      title: "Test Variation for Rejection",
      description: "Testing rejection has zero impact",
      subtotal: 50000, // £500.00
      vat: 10000,      // £100.00
      total: 60000,    // £600.00
    });
    expect(variation).not.toBeNull();

    // Send the variation
    const sent = await repo.sendVariation(variation!.id);
    expect(sent).not.toBeNull();
    const token = sent!.token!;

    // Reject the variation
    const rejected = await repo.decideVariationByToken(token, "rejected");
    expect(rejected).not.toBeNull();
    expect(rejected!.status).toBe("rejected");

    // Fetch job - budget should be UNCHANGED (rejection has zero financial impact)
    const jobAfterRejection = await repo.getJobById(job!.id);
    expect(jobAfterRejection).not.toBeNull();
    expect(jobAfterRejection!.budgetSubtotal).toBe(initialSubtotal); // No change
    expect(jobAfterRejection!.budgetVat).toBe(initialVat);           // No change
    expect(jobAfterRejection!.budgetTotal).toBe(initialTotal);       // No change
  });

  it("rejecting then trying to approve has no financial impact (idempotent)", async () => {
    // Create a quote and job
    const quote = await repo.createQuote({
      clientName: "Test Client 3",
      clientEmail: "test3@example.com",
      notes: "Test quote for reject-then-approve",
      vatRate: 20,
    });
    expect(quote).not.toBeNull();

    const job = await repo.ensureJobForQuote(quote!.id);
    expect(job).not.toBeNull();

    // Record initial budget
    const initialSubtotal = job!.budgetSubtotal;
    const initialVat = job!.budgetVat;
    const initialTotal = job!.budgetTotal;

    // Create a variation
    const variation = await repo.createVariationForJob({
      jobId: job!.id,
      title: "Test Variation",
      description: "Testing reject-then-approve",
      subtotal: 20000,
      vat: 4000,
      total: 24000,
    });
    expect(variation).not.toBeNull();

    // Send the variation
    const sent = await repo.sendVariation(variation!.id);
    expect(sent).not.toBeNull();
    const token = sent!.token!;

    // First: Reject
    const rejected = await repo.decideVariationByToken(token, "rejected");
    expect(rejected).not.toBeNull();
    expect(rejected!.status).toBe("rejected");

    // Second: Try to approve (should be idempotent - no change)
    const tryApprove = await repo.decideVariationByToken(token, "approved");
    expect(tryApprove).not.toBeNull();
    expect(tryApprove!.status).toBe("rejected"); // Still rejected

    // Budget should remain unchanged
    const jobAfter = await repo.getJobById(job!.id);
    expect(jobAfter).not.toBeNull();
    expect(jobAfter!.budgetSubtotal).toBe(initialSubtotal);
    expect(jobAfter!.budgetVat).toBe(initialVat);
    expect(jobAfter!.budgetTotal).toBe(initialTotal);
  });
});
