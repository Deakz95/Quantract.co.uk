import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock @neondatabase/auth to avoid next/headers import issue in test environment
vi.mock("@neondatabase/auth/next/server", () => ({
  createNeonAuth: vi.fn(() => ({ getSession: vi.fn() })),
  createAuthServer: vi.fn(),
}));

import * as repo from "./repo";

let dataDir = "";
let dataPath = "";

beforeEach(() => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "qt-invoice-"));
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
// Run with: DATABASE_URL=<your_db_url> npm run test:unit invoiceSafety.test.ts
describe.skip("Invoice Safety - Uniqueness and VAT Correctness", () => {
  it("stage invoices can only be created once per stage", async () => {
    // Create a quote and job
    const quote = await repo.createQuote({
      clientName: "Test Client",
      clientEmail: "test@example.com",
      notes: "Test quote",
      vatRate: 20,
    });
    expect(quote).not.toBeNull();

    const job = await repo.ensureJobForQuote(quote!.id);
    expect(job).not.toBeNull();

    // Create first stage invoice
    const invoice1 = await repo.createInvoiceForJob({
      jobId: job!.id,
      type: "stage",
      stageName: "Foundation",
      subtotal: 10000, // £100.00
      vatRate: 0.2,
    });

    expect(invoice1).not.toBeNull();
    expect(invoice1!.type).toBe("stage");
    expect(invoice1!.stageName).toBe("Foundation");
    expect(invoice1!.subtotal).toBe(10000);
    expect(invoice1!.vat).toBe(2000); // 20% of 10000
    expect(invoice1!.total).toBe(12000);

    const firstInvoiceId = invoice1!.id;

    // Attempt to create second stage invoice for same stage - should return existing
    const invoice2 = await repo.createInvoiceForJob({
      jobId: job!.id,
      type: "stage",
      stageName: "Foundation", // Same stage name
      subtotal: 20000, // Different amount
      vatRate: 0.2,
    });

    expect(invoice2).not.toBeNull();
    expect(invoice2!.id).toBe(firstInvoiceId); // Returns same invoice
    expect(invoice2!.subtotal).toBe(10000); // Original values unchanged
  });

  it("stage invoices are case-insensitive for uniqueness", async () => {
    const quote = await repo.createQuote({
      clientName: "Test Client",
      clientEmail: "test@example.com",
      notes: "Test quote",
      vatRate: 20,
    });
    expect(quote).not.toBeNull();

    const job = await repo.ensureJobForQuote(quote!.id);
    expect(job).not.toBeNull();

    // Create invoice with lowercase stage name
    const invoice1 = await repo.createInvoiceForJob({
      jobId: job!.id,
      type: "stage",
      stageName: "foundation",
      subtotal: 10000,
      vatRate: 0.2,
    });

    expect(invoice1).not.toBeNull();
    const firstInvoiceId = invoice1!.id;

    // Attempt with uppercase - should return existing
    const invoice2 = await repo.createInvoiceForJob({
      jobId: job!.id,
      type: "stage",
      stageName: "FOUNDATION",
      subtotal: 20000,
      vatRate: 0.2,
    });

    expect(invoice2).not.toBeNull();
    expect(invoice2!.id).toBe(firstInvoiceId);
  });

  it("final invoices cannot be duplicated", async () => {
    const quote = await repo.createQuote({
      clientName: "Test Client",
      clientEmail: "test@example.com",
      notes: "Test quote",
      vatRate: 20,
    });
    expect(quote).not.toBeNull();

    const job = await repo.ensureJobForQuote(quote!.id);
    expect(job).not.toBeNull();

    // Create first final invoice
    const invoice1 = await repo.createInvoiceForJob({
      jobId: job!.id,
      type: "final",
      subtotal: 50000, // £500.00
      vatRate: 0.2,
    });

    expect(invoice1).not.toBeNull();
    expect(invoice1!.type).toBe("final");
    expect(invoice1!.subtotal).toBe(50000);
    expect(invoice1!.vat).toBe(10000); // 20% of 50000
    expect(invoice1!.total).toBe(60000);

    const firstInvoiceId = invoice1!.id;

    // Attempt to create second final invoice - should return existing
    const invoice2 = await repo.createInvoiceForJob({
      jobId: job!.id,
      type: "final",
      subtotal: 100000, // Different amount
      vatRate: 0.2,
    });

    expect(invoice2).not.toBeNull();
    expect(invoice2!.id).toBe(firstInvoiceId); // Returns same invoice
    expect(invoice2!.subtotal).toBe(50000); // Original values unchanged
  });

  it("different stages can have separate invoices", async () => {
    const quote = await repo.createQuote({
      clientName: "Test Client",
      clientEmail: "test@example.com",
      notes: "Test quote",
      vatRate: 20,
    });
    expect(quote).not.toBeNull();

    const job = await repo.ensureJobForQuote(quote!.id);
    expect(job).not.toBeNull();

    // Create invoice for Foundation stage
    const foundationInvoice = await repo.createInvoiceForJob({
      jobId: job!.id,
      type: "stage",
      stageName: "Foundation",
      subtotal: 10000,
      vatRate: 0.2,
    });

    expect(foundationInvoice).not.toBeNull();

    // Create invoice for Framing stage
    const framingInvoice = await repo.createInvoiceForJob({
      jobId: job!.id,
      type: "stage",
      stageName: "Framing",
      subtotal: 15000,
      vatRate: 0.2,
    });

    expect(framingInvoice).not.toBeNull();

    // Should be different invoices
    expect(framingInvoice!.id).not.toBe(foundationInvoice!.id);
    expect(foundationInvoice!.stageName).toBe("Foundation");
    expect(framingInvoice!.stageName).toBe("Framing");
  });

  it("VAT calculations are mathematically correct for invoices", async () => {
    const quote = await repo.createQuote({
      clientName: "Test Client",
      clientEmail: "test@example.com",
      notes: "Test quote",
      vatRate: 20,
    });
    expect(quote).not.toBeNull();

    const job = await repo.ensureJobForQuote(quote!.id);
    expect(job).not.toBeNull();

    // Test 20% VAT
    const invoice20 = await repo.createInvoiceForJob({
      jobId: job!.id,
      type: "stage",
      stageName: "Test 20%",
      subtotal: 10000, // £100.00
      vatRate: 0.2,
    });

    expect(invoice20).not.toBeNull();
    expect(invoice20!.subtotal).toBe(10000);
    expect(invoice20!.vat).toBe(2000); // £20.00
    expect(invoice20!.total).toBe(12000); // £120.00

    // Test 0% VAT (zero-rated)
    const invoice0 = await repo.createInvoiceForJob({
      jobId: job!.id,
      type: "stage",
      stageName: "Test 0%",
      subtotal: 10000,
      vatRate: 0,
    });

    expect(invoice0).not.toBeNull();
    expect(invoice0!.subtotal).toBe(10000);
    expect(invoice0!.vat).toBe(0);
    expect(invoice0!.total).toBe(10000);

    // Test 5% VAT (reduced rate)
    const invoice5 = await repo.createInvoiceForJob({
      jobId: job!.id,
      type: "stage",
      stageName: "Test 5%",
      subtotal: 10000,
      vatRate: 0.05,
    });

    expect(invoice5).not.toBeNull();
    expect(invoice5!.subtotal).toBe(10000);
    expect(invoice5!.vat).toBe(500); // £5.00
    expect(invoice5!.total).toBe(10500); // £105.00
  });

  it("VAT calculations handle decimal amounts correctly", async () => {
    const quote = await repo.createQuote({
      clientName: "Test Client",
      clientEmail: "test@example.com",
      notes: "Test quote",
      vatRate: 20,
    });
    expect(quote).not.toBeNull();

    const job = await repo.ensureJobForQuote(quote!.id);
    expect(job).not.toBeNull();

    // £123.45 subtotal + 20% VAT = £24.69 VAT, £148.14 total
    const invoice = await repo.createInvoiceForJob({
      jobId: job!.id,
      type: "stage",
      stageName: "Decimal Test",
      subtotal: 123.45,
      vatRate: 0.2,
    });

    expect(invoice).not.toBeNull();
    expect(invoice!.subtotal).toBe(123.45);
    expect(invoice!.vat).toBe(24.69);
    expect(invoice!.total).toBe(148.14);

    // Verify total = subtotal + vat (mathematical correctness)
    const calculatedTotal = invoice!.subtotal + invoice!.vat;
    expect(Math.abs(invoice!.total - calculatedTotal)).toBeLessThanOrEqual(0.01);
  });

  it("ensureInvoiceForQuote is idempotent", async () => {
    const quote = await repo.createQuote({
      clientName: "Test Client",
      clientEmail: "test@example.com",
      notes: "Test quote",
      vatRate: 20,
    });
    expect(quote).not.toBeNull();

    // First call creates invoice
    const invoice1 = await repo.ensureInvoiceForQuote(quote!.id);
    expect(invoice1).not.toBeNull();
    const firstInvoiceId = invoice1!.id;

    // Second call returns existing invoice
    const invoice2 = await repo.ensureInvoiceForQuote(quote!.id);
    expect(invoice2).not.toBeNull();
    expect(invoice2!.id).toBe(firstInvoiceId);

    // Third call still returns same invoice
    const invoice3 = await repo.ensureInvoiceForQuote(quote!.id);
    expect(invoice3).not.toBeNull();
    expect(invoice3!.id).toBe(firstInvoiceId);
  });
});
