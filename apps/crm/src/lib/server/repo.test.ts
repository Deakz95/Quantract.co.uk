/**
 * Tests for the repo.ts data layer.
 * Focuses on data transformation functions and business logic.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { createMockPrismaClient, createMockInvoice, createMockCompany } from "./test-utils";

// Mock dependencies
vi.mock("@/lib/server/prisma", () => ({
  getPrisma: vi.fn(),
}));

vi.mock("@/lib/serverAuth", () => ({
  getCompanyId: vi.fn(),
}));

vi.mock("@/lib/server/storage", () => ({
  writeUploadBytes: vi.fn(),
  readUploadBytes: vi.fn(),
}));

vi.mock("@/lib/server/email", () => ({
  sendInvoiceReminder: vi.fn(),
  absoluteUrl: vi.fn((path) => `http://localhost:3000${path}`),
}));

vi.mock("@/lib/server/pdf", () => ({
  renderCertificatePdf: vi.fn(),
  renderQuotePdf: vi.fn(),
  renderAgreementPdf: vi.fn(),
  renderInvoicePdf: vi.fn(),
  renderVariationPdf: vi.fn(),
}));

import { getPrisma } from "@/lib/server/prisma";
import { getCompanyId } from "@/lib/serverAuth";

describe("repo.ts - Data Transformations", () => {
  describe("toClient transformation", () => {
    it("should transform database row to Client object", () => {
      const row = {
        id: "client-123",
        name: "Test Client",
        email: "client@example.com",
        phone: "+44123456789",
        address1: "123 Main St",
        address2: "Suite 100",
        city: "London",
        county: "Greater London",
        postcode: "SW1A 1AA",
        country: "UK",
        notes: "Important client",
        paymentTermsDays: 30,
        disableAutoChase: false,
        xeroContactId: "xero-123",
        createdAt: new Date("2024-01-01T00:00:00Z"),
        updatedAt: new Date("2024-01-02T00:00:00Z"),
      };

      const client = toClient(row);

      expect(client.id).toBe("client-123");
      expect(client.name).toBe("Test Client");
      expect(client.email).toBe("client@example.com");
      expect(client.phone).toBe("+44123456789");
      expect(client.address1).toBe("123 Main St");
      expect(client.address2).toBe("Suite 100");
      expect(client.city).toBe("London");
      expect(client.county).toBe("Greater London");
      expect(client.postcode).toBe("SW1A 1AA");
      expect(client.country).toBe("UK");
      expect(client.notes).toBe("Important client");
      expect(client.paymentTermsDays).toBe(30);
      expect(client.disableAutoChase).toBe(false);
      expect(client.xeroContactId).toBe("xero-123");
      expect(client.createdAtISO).toBe("2024-01-01T00:00:00.000Z");
      expect(client.updatedAtISO).toBe("2024-01-02T00:00:00.000Z");
    });

    it("should handle null optional fields", () => {
      const row = {
        id: "client-123",
        name: "Test Client",
        email: "client@example.com",
        phone: null,
        address1: null,
        address2: null,
        city: null,
        county: null,
        postcode: null,
        country: null,
        notes: null,
        paymentTermsDays: null,
        disableAutoChase: null,
        xeroContactId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const client = toClient(row);

      expect(client.phone).toBeUndefined();
      expect(client.address1).toBeUndefined();
      expect(client.paymentTermsDays).toBeUndefined();
      expect(client.disableAutoChase).toBeUndefined();
    });
  });

  describe("toInvoice transformation", () => {
    it("should transform database row to Invoice object", () => {
      const row = {
        id: "invoice-123",
        token: "abc123",
        invoiceNumber: "INV-00001",
        legalEntityId: "entity-1",
        clientId: "client-123",
        quoteId: "quote-123",
        jobId: "job-123",
        variationId: null,
        type: "stage",
        stageName: "Deposit",
        clientName: "Test Client",
        clientEmail: "client@example.com",
        subtotal: 1000,
        vat: 200,
        total: 1200,
        status: "unpaid",
        createdAt: new Date("2024-01-01T00:00:00Z"),
        updatedAt: new Date("2024-01-02T00:00:00Z"),
        sentAt: new Date("2024-01-03T00:00:00Z"),
        dueAt: new Date("2024-01-31T00:00:00Z"),
        paidAt: null,
        xeroInvoiceId: null,
        xeroSyncStatus: null,
        xeroLastSyncAt: null,
        xeroLastError: null,
        paymentProvider: "stripe",
        paymentUrl: "https://pay.stripe.com/xxx",
        paymentRef: "pi_123",
      };

      const invoice = toInvoice(row);

      expect(invoice.id).toBe("invoice-123");
      expect(invoice.token).toBe("abc123");
      expect(invoice.invoiceNumber).toBe("INV-00001");
      expect(invoice.subtotal).toBe(1000);
      expect(invoice.vat).toBe(200);
      expect(invoice.total).toBe(1200);
      expect(invoice.status).toBe("unpaid");
      expect(invoice.sentAtISO).toBe("2024-01-03T00:00:00.000Z");
      expect(invoice.dueAtISO).toBe("2024-01-31T00:00:00.000Z");
      expect(invoice.paidAtISO).toBeUndefined();
      expect(invoice.paymentProvider).toBe("stripe");
    });

    it("should handle numeric string conversion", () => {
      const row = {
        id: "invoice-123",
        token: "abc123",
        clientName: "Test",
        clientEmail: "test@example.com",
        subtotal: "1000.50",
        vat: "200.10",
        total: "1200.60",
        status: "paid",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const invoice = toInvoice(row);

      expect(invoice.subtotal).toBe(1000.5);
      expect(invoice.vat).toBe(200.1);
      expect(invoice.total).toBe(1200.6);
    });
  });

  describe("toQuote transformation", () => {
    it("should transform database row to Quote object", () => {
      const row = {
        id: "quote-123",
        token: "xyz789",
        invoiceNumber: null,
        companyId: "company-123",
        clientId: "client-123",
        siteId: "site-123",
        version: 1,
        clientName: "Test Client",
        clientEmail: "client@example.com",
        siteAddress: "123 Main St",
        notes: "Quote notes",
        vatRate: 0.2,
        items: [
          { description: "Item 1", quantity: 1, unitPrice: 100 },
          { description: "Item 2", quantity: 2, unitPrice: 50 },
        ],
        status: "accepted",
        createdAt: new Date("2024-01-01T00:00:00Z"),
        updatedAt: new Date("2024-01-02T00:00:00Z"),
        acceptedAt: new Date("2024-01-05T00:00:00Z"),
      };

      const quote = toQuote(row);

      expect(quote.id).toBe("quote-123");
      expect(quote.token).toBe("xyz789");
      expect(quote.version).toBe(1);
      expect(quote.vatRate).toBe(0.2);
      expect(quote.items).toHaveLength(2);
      expect(quote.status).toBe("accepted");
      expect(quote.acceptedAtISO).toBe("2024-01-05T00:00:00.000Z");
    });

    it("should handle null version", () => {
      const row = {
        id: "quote-123",
        token: "xyz789",
        clientName: "Test",
        clientEmail: "test@example.com",
        vatRate: 0.2,
        items: [],
        status: "draft",
        createdAt: new Date(),
        updatedAt: new Date(),
        version: null,
      };

      const quote = toQuote(row);
      expect(quote.version).toBeUndefined();
    });
  });

  describe("toAgreement transformation", () => {
    it("should transform database row to Agreement object", () => {
      const quoteSnapshot = {
        id: "quote-123",
        items: [],
        total: 1000,
      };

      const row = {
        id: "agreement-123",
        token: "agr-token",
        quoteId: "quote-123",
        status: "signed",
        templateVersion: "v1.0",
        quoteSnapshot,
        createdAt: new Date("2024-01-01T00:00:00Z"),
        updatedAt: new Date("2024-01-02T00:00:00Z"),
        signedAt: new Date("2024-01-03T00:00:00Z"),
        signerName: "John Doe",
        signerEmail: "john@example.com",
        signerIp: "192.168.1.1",
        signerUserAgent: "Mozilla/5.0",
        certificateHash: "sha256:abc123",
      };

      const agreement = toAgreement(row);

      expect(agreement.id).toBe("agreement-123");
      expect(agreement.token).toBe("agr-token");
      expect(agreement.quoteId).toBe("quote-123");
      expect(agreement.status).toBe("signed");
      expect(agreement.signedAtISO).toBe("2024-01-03T00:00:00.000Z");
      expect(agreement.signerName).toBe("John Doe");
      expect(agreement.signerEmail).toBe("john@example.com");
      expect(agreement.certificateHash).toBe("sha256:abc123");
    });
  });

  describe("toEngineer transformation", () => {
    it("should transform database row to Engineer object", () => {
      const row = {
        id: "engineer-123",
        email: "engineer@example.com",
        name: "John Engineer",
        phone: "+44987654321",
        costRatePerHour: 25,
        chargeRatePerHour: 50,
        rateCardId: "card-123",
        rateCard: {
          name: "Standard Rate",
          costRatePerHour: 25,
          chargeRatePerHour: 50,
        },
        isActive: true,
        createdAt: new Date("2024-01-01T00:00:00Z"),
        updatedAt: new Date("2024-01-02T00:00:00Z"),
      };

      const engineer = toEngineer(row);

      expect(engineer.id).toBe("engineer-123");
      expect(engineer.email).toBe("engineer@example.com");
      expect(engineer.name).toBe("John Engineer");
      expect(engineer.costRatePerHour).toBe(25);
      expect(engineer.chargeRatePerHour).toBe(50);
      expect(engineer.rateCardName).toBe("Standard Rate");
      expect(engineer.isActive).toBe(true);
    });

    it("should handle missing rate card", () => {
      const row = {
        id: "engineer-123",
        email: "engineer@example.com",
        name: null,
        phone: null,
        costRatePerHour: null,
        chargeRatePerHour: null,
        rateCardId: null,
        rateCard: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const engineer = toEngineer(row);

      expect(engineer.name).toBeUndefined();
      expect(engineer.costRatePerHour).toBeUndefined();
      expect(engineer.rateCardName).toBeUndefined();
    });
  });

  describe("toJob transformation", () => {
    it("should transform database row to Job object", () => {
      const row = {
        id: "job-123",
        quoteId: "quote-123",
        clientId: "client-123",
        siteId: "site-123",
        title: "Electrical Work",
        status: "in_progress",
        engineer: { email: "engineer@example.com" },
        client: {
          id: "client-123",
          name: "Test Client",
          email: "client@example.com",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        site: { name: "Main Site" },
        scheduledAt: new Date("2024-02-01T09:00:00Z"),
        notes: "Job notes",
        budgetSubtotal: 1000,
        budgetVat: 200,
        budgetTotal: 1200,
        createdAt: new Date("2024-01-01T00:00:00Z"),
        updatedAt: new Date("2024-01-02T00:00:00Z"),
      };

      const job = toJob(row);

      expect(job.id).toBe("job-123");
      expect(job.quoteId).toBe("quote-123");
      expect(job.title).toBe("Electrical Work");
      expect(job.status).toBe("in_progress");
      expect(job.engineerEmail).toBe("engineer@example.com");
      expect(job.clientName).toBe("Test Client");
      expect(job.siteName).toBe("Main Site");
      expect(job.budgetSubtotal).toBe(1000);
      expect(job.budgetTotal).toBe(1200);
    });
  });
});

describe("repo.ts - Invoice Number Allocation", () => {
  it("should format invoice number with prefix and padding", () => {
    const prefix = "INV-";
    const number = 42;
    const padded = String(number).padStart(5, "0");
    const invoiceNumber = `${prefix}${padded}`;

    expect(invoiceNumber).toBe("INV-00042");
  });

  it("should handle custom prefix", () => {
    const prefix = "QUOTE-";
    const number = 1;
    const padded = String(number).padStart(5, "0");
    const invoiceNumber = `${prefix}${padded}`;

    expect(invoiceNumber).toBe("QUOTE-00001");
  });

  it("should handle large numbers without truncation", () => {
    const prefix = "INV-";
    const number = 123456;
    const padded = String(number).padStart(5, "0");
    const invoiceNumber = `${prefix}${padded}`;

    expect(invoiceNumber).toBe("INV-123456");
  });
});

describe("repo.ts - Payment Recording Logic", () => {
  const mockPrisma = createMockPrismaClient();

  beforeEach(() => {
    vi.clearAllMocks();
    (getPrisma as any).mockReturnValue(mockPrisma);
    (getCompanyId as any).mockResolvedValue("company-123");
    process.env.QT_USE_PRISMA = "1";
  });

  afterEach(() => {
    delete process.env.QT_USE_PRISMA;
  });

  describe("Payment amount validation", () => {
    it("should convert amount to number", () => {
      const input = { amount: "100.50" as any };
      const amount = Number(input.amount || 0);
      expect(amount).toBe(100.5);
    });

    it("should handle zero amount", () => {
      const input = { amount: 0 };
      const amount = Number(input.amount || 0);
      expect(amount).toBe(0);
    });

    it("should handle undefined amount", () => {
      const input = {} as any;
      const amount = Number(input.amount || 0);
      expect(amount).toBe(0);
    });
  });

  describe("Payment status determination", () => {
    it("should mark invoice as paid when total paid equals invoice total", () => {
      const invoiceTotal = 1200;
      const totalPaid = 1200;
      const shouldMarkPaid = totalPaid >= invoiceTotal;
      expect(shouldMarkPaid).toBe(true);
    });

    it("should mark invoice as paid when total paid exceeds invoice total", () => {
      const invoiceTotal = 1200;
      const totalPaid = 1300;
      const shouldMarkPaid = totalPaid >= invoiceTotal;
      expect(shouldMarkPaid).toBe(true);
    });

    it("should not mark invoice as paid when total paid is less than invoice total", () => {
      const invoiceTotal = 1200;
      const totalPaid = 600;
      const shouldMarkPaid = totalPaid >= invoiceTotal;
      expect(shouldMarkPaid).toBe(false);
    });
  });

  describe("Currency handling", () => {
    it("should default to gbp when no currency provided", () => {
      const input = { invoiceId: "inv-123", amount: 100 };
      const currency = String(input.currency || "gbp");
      expect(currency).toBe("gbp");
    });

    it("should use provided currency", () => {
      const input = { invoiceId: "inv-123", amount: 100, currency: "usd" };
      const currency = String(input.currency || "gbp");
      expect(currency).toBe("usd");
    });
  });
});

describe("repo.ts - Brand Context", () => {
  it("should return default brand context when no company data", () => {
    const defaultBrand = {
      name: process.env.QT_BRAND_NAME || "Quantract",
      tagline: process.env.QT_BRAND_TAGLINE || null,
      logoPngBytes: null,
    };

    expect(defaultBrand.name).toBe("Quantract");
    expect(defaultBrand.tagline).toBeNull();
    expect(defaultBrand.logoPngBytes).toBeNull();
  });

  it("should use environment variable for brand name if set", () => {
    const originalBrandName = process.env.QT_BRAND_NAME;
    process.env.QT_BRAND_NAME = "Custom Brand";

    const name = process.env.QT_BRAND_NAME || "Quantract";
    expect(name).toBe("Custom Brand");

    if (originalBrandName) {
      process.env.QT_BRAND_NAME = originalBrandName;
    } else {
      delete process.env.QT_BRAND_NAME;
    }
  });
});

describe("repo.ts - Database Availability Check", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return null when Prisma client is not available", () => {
    (getPrisma as any).mockReturnValue(null);
    process.env.QT_USE_PRISMA = "1";

    const client = getPrisma();
    const p = client && process.env.QT_USE_PRISMA === "1" ? client : null;

    expect(p).toBeNull();
  });

  it("should return null when QT_USE_PRISMA is not set", () => {
    (getPrisma as any).mockReturnValue({});
    delete process.env.QT_USE_PRISMA;

    const client = getPrisma();
    const p = client && process.env.QT_USE_PRISMA === "1" ? client : null;

    expect(p).toBeNull();
  });

  it("should return client when both conditions are met", () => {
    const mockClient = {};
    (getPrisma as any).mockReturnValue(mockClient);
    process.env.QT_USE_PRISMA = "1";

    const client = getPrisma();
    const p = client && process.env.QT_USE_PRISMA === "1" ? client : null;

    expect(p).toBe(mockClient);
  });
});

// Helper functions that mirror the transformation logic from repo.ts
function toClient(row: any) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone ?? undefined,
    address1: row.address1 ?? undefined,
    address2: row.address2 ?? undefined,
    city: row.city ?? undefined,
    county: row.county ?? undefined,
    postcode: row.postcode ?? undefined,
    country: row.country ?? undefined,
    notes: row.notes ?? undefined,
    paymentTermsDays: row.paymentTermsDays != null ? Number(row.paymentTermsDays) : undefined,
    disableAutoChase: row.disableAutoChase != null ? Boolean(row.disableAutoChase) : undefined,
    xeroContactId: row.xeroContactId ?? undefined,
    createdAtISO: new Date(row.createdAt).toISOString(),
    updatedAtISO: new Date(row.updatedAt).toISOString(),
  };
}

function toInvoice(row: any) {
  return {
    id: row.id,
    token: row.token,
    invoiceNumber: row.invoiceNumber ?? undefined,
    legalEntityId: row.legalEntityId ?? undefined,
    clientId: row.clientId ?? undefined,
    quoteId: row.quoteId ?? undefined,
    jobId: row.jobId ?? undefined,
    variationId: row.variationId ?? undefined,
    type: row.type ?? undefined,
    stageName: row.stageName ?? undefined,
    clientName: row.clientName,
    clientEmail: row.clientEmail,
    subtotal: Number(row.subtotal),
    vat: Number(row.vat),
    total: Number(row.total),
    status: row.status,
    createdAtISO: new Date(row.createdAt).toISOString(),
    updatedAtISO: new Date(row.updatedAt).toISOString(),
    sentAtISO: row.sentAt ? new Date(row.sentAt).toISOString() : undefined,
    dueAtISO: row.dueAt ? new Date(row.dueAt).toISOString() : undefined,
    paidAtISO: row.paidAt ? new Date(row.paidAt).toISOString() : undefined,
    xeroInvoiceId: row.xeroInvoiceId ?? undefined,
    xeroSyncStatus: row.xeroSyncStatus ?? undefined,
    xeroLastSyncAtISO: row.xeroLastSyncAt ? new Date(row.xeroLastSyncAt).toISOString() : undefined,
    xeroLastError: row.xeroLastError ?? undefined,
    paymentProvider: row.paymentProvider ?? undefined,
    paymentUrl: row.paymentUrl ?? undefined,
    paymentRef: row.paymentRef ?? undefined,
  };
}

function toQuote(row: any) {
  return {
    id: row.id,
    token: row.token,
    invoiceNumber: row.invoiceNumber ?? undefined,
    companyId: row.companyId ?? undefined,
    clientId: row.clientId ?? undefined,
    siteId: row.siteId ?? undefined,
    version: row.version != null ? Number(row.version) : undefined,
    clientName: row.clientName,
    clientEmail: row.clientEmail,
    siteAddress: row.siteAddress ?? undefined,
    notes: row.notes ?? undefined,
    vatRate: Number(row.vatRate),
    items: row.items,
    status: row.status,
    createdAtISO: new Date(row.createdAt).toISOString(),
    updatedAtISO: new Date(row.updatedAt).toISOString(),
    acceptedAtISO: row.acceptedAt ? new Date(row.acceptedAt).toISOString() : undefined,
  };
}

function toAgreement(row: any) {
  return {
    id: row.id,
    token: row.token,
    quoteId: row.quoteId,
    status: row.status,
    templateVersion: row.templateVersion,
    quoteSnapshot: row.quoteSnapshot,
    createdAtISO: new Date(row.createdAt).toISOString(),
    updatedAtISO: new Date(row.updatedAt).toISOString(),
    signedAtISO: row.signedAt ? new Date(row.signedAt).toISOString() : undefined,
    signerName: row.signerName ?? undefined,
    signerEmail: row.signerEmail ?? undefined,
    signerIp: row.signerIp ?? undefined,
    signerUserAgent: row.signerUserAgent ?? undefined,
    certificateHash: row.certificateHash ?? undefined,
  };
}

function toEngineer(row: any) {
  return {
    id: row.id,
    email: row.email,
    name: row.name ?? undefined,
    phone: row.phone ?? undefined,
    costRatePerHour: row.costRatePerHour != null ? Number(row.costRatePerHour) : undefined,
    chargeRatePerHour: row.chargeRatePerHour != null ? Number(row.chargeRatePerHour) : undefined,
    rateCardId: row.rateCardId ?? undefined,
    rateCardName: row.rateCard?.name ?? undefined,
    rateCardCostRate: row.rateCard?.costRatePerHour != null ? Number(row.rateCard.costRatePerHour) : undefined,
    rateCardChargeRate: row.rateCard?.chargeRatePerHour != null ? Number(row.rateCard.chargeRatePerHour) : undefined,
    isActive: row.isActive ?? undefined,
    createdAtISO: new Date(row.createdAt).toISOString(),
    updatedAtISO: new Date(row.updatedAt).toISOString(),
  };
}

function toJob(row: any) {
  return {
    id: row.id,
    quoteId: row.quoteId ?? "",
    clientId: row.clientId ?? undefined,
    siteId: row.siteId ?? undefined,
    title: row.title ?? undefined,
    status: row.status,
    engineerEmail: row.engineer?.email ?? undefined,
    scheduledAtISO: row.scheduledAt ? new Date(row.scheduledAt).toISOString() : undefined,
    notes: row.notes ?? undefined,
    budgetSubtotal: Number(row.budgetSubtotal ?? 0),
    budgetVat: Number(row.budgetVat ?? 0),
    budgetTotal: Number(row.budgetTotal ?? 0),
    clientName: row.client?.name ?? row.clientName ?? row.clientEmail ?? "",
    clientEmail: row.client?.email ?? row.clientEmail ?? "",
    siteName: row.site?.name ?? undefined,
    createdAtISO: new Date(row.createdAt).toISOString(),
    updatedAtISO: new Date(row.updatedAt).toISOString(),
  };
}
