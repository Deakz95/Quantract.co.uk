/**
 * Tests for docPack utility
 */
import { describe, expect, it } from "vitest";
import { buildSignedPackItems, type PackItem } from "./docPack";

describe("buildSignedPackItems", () => {
  it("should return all items as ready when all docs present", () => {
    const items = buildSignedPackItems({
      hasQuotePdf: true,
      hasAgreementPdf: true,
      hasTermsPdf: true,
      hasCertificate: true,
    });

    expect(items).toHaveLength(4);
    expect(items.every((item) => item.status === "ready")).toBe(true);
  });

  it("should return all items as missing when no docs present", () => {
    const items = buildSignedPackItems({
      hasQuotePdf: false,
      hasAgreementPdf: false,
      hasTermsPdf: false,
      hasCertificate: false,
    });

    expect(items).toHaveLength(4);
    expect(items.every((item) => item.status === "missing")).toBe(true);
  });

  it("should return correct keys", () => {
    const items = buildSignedPackItems({
      hasQuotePdf: true,
      hasAgreementPdf: true,
      hasTermsPdf: true,
      hasCertificate: true,
    });

    const keys = items.map((item) => item.key);
    expect(keys).toContain("quote");
    expect(keys).toContain("agreement");
    expect(keys).toContain("terms");
    expect(keys).toContain("certificate");
  });

  it("should return correct labels", () => {
    const items = buildSignedPackItems({
      hasQuotePdf: true,
      hasAgreementPdf: true,
      hasTermsPdf: true,
      hasCertificate: true,
    });

    const labels = items.map((item) => item.label);
    expect(labels).toContain("Quote PDF");
    expect(labels).toContain("Agreement PDF");
    expect(labels).toContain("Terms & Conditions (snapshot)");
    expect(labels).toContain("Signing Certificate");
  });

  it("should handle mixed availability", () => {
    const items = buildSignedPackItems({
      hasQuotePdf: true,
      hasAgreementPdf: false,
      hasTermsPdf: true,
      hasCertificate: false,
    });

    const quoteItem = items.find((item) => item.key === "quote");
    const agreementItem = items.find((item) => item.key === "agreement");
    const termsItem = items.find((item) => item.key === "terms");
    const certItem = items.find((item) => item.key === "certificate");

    expect(quoteItem?.status).toBe("ready");
    expect(agreementItem?.status).toBe("missing");
    expect(termsItem?.status).toBe("ready");
    expect(certItem?.status).toBe("missing");
  });

  it("should return items in consistent order", () => {
    const items1 = buildSignedPackItems({
      hasQuotePdf: true,
      hasAgreementPdf: true,
      hasTermsPdf: true,
      hasCertificate: true,
    });

    const items2 = buildSignedPackItems({
      hasQuotePdf: false,
      hasAgreementPdf: false,
      hasTermsPdf: false,
      hasCertificate: false,
    });

    expect(items1.map((i) => i.key)).toEqual(items2.map((i) => i.key));
  });

  it("should have quote as first item", () => {
    const items = buildSignedPackItems({
      hasQuotePdf: true,
      hasAgreementPdf: true,
      hasTermsPdf: true,
      hasCertificate: true,
    });

    expect(items[0].key).toBe("quote");
  });

  it("should have certificate as last item", () => {
    const items = buildSignedPackItems({
      hasQuotePdf: true,
      hasAgreementPdf: true,
      hasTermsPdf: true,
      hasCertificate: true,
    });

    expect(items[items.length - 1].key).toBe("certificate");
  });
});
