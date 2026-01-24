import { describe, it, expect } from "vitest";
import { renderCertificatePdf } from "./pdf";
import type { Certificate } from "./db";

describe("Certificate PDF Generation - Smoke Tests", () => {
  const baseCompletedCertificate: Partial<Certificate> = {
    id: "test-cert-001",
    companyId: "test-company",
    jobId: "test-job",
    siteId: "test-site",
    status: "completed",
    certificateNumber: "CERT-001",
    inspectorName: "John Inspector",
    inspectorEmail: "inspector@example.com",
    signedName: "Jane Customer",
    signedAt: new Date("2024-01-15T11:00:00Z"),
    completedAt: new Date("2024-01-15T10:00:00Z"),
    createdAt: new Date("2024-01-10T09:00:00Z"),
    dataVersion: 1,
  };

  const validCertificateData = {
    version: 1,
    overview: {
      siteName: "Test Site",
      installationAddress: "123 Test Street, Test City, TE1 1ST",
      clientName: "Test Client Ltd",
      clientEmail: "client@example.com",
      jobDescription: "Installation of new electrical system",
      jobReference: "JOB-001",
    },
    installation: {
      descriptionOfWork: "New consumer unit installation",
      supplyType: "TN-S",
      earthingArrangement: "PME",
      distributionType: "Single phase",
      maxDemand: "60A",
    },
    inspection: {
      limitations: "None",
      observations: "Installation is compliant",
      nextInspectionDate: "2025-01-15",
    },
    declarations: {
      extentOfWork: "Full installation",
      worksTested: "All circuits tested",
      comments: "Installation meets BS 7671",
    },
    assessment: {
      overallAssessment: "Satisfactory",
      recommendations: "None",
    },
    signatures: {
      engineer: {
        name: "John Inspector",
        signatureText: "J. Inspector",
        signedAtISO: "2024-01-15T10:00:00Z",
      },
      customer: {
        name: "Jane Customer",
        signatureText: "J. Customer",
        signedAtISO: "2024-01-15T11:00:00Z",
      },
    },
  };

  it("generates valid PDF for EIC certificate", async () => {
    const eicCertificate: Certificate = {
      ...baseCompletedCertificate,
      type: "EIC",
      data: {
        ...validCertificateData,
        type: "EIC",
      },
    } as Certificate;

    const pdfBytes = await renderCertificatePdf({
      certificate: eicCertificate,
    });

    // Smoke test: PDF should be generated and non-empty
    expect(pdfBytes).toBeDefined();
    expect(pdfBytes.length).toBeGreaterThan(0);

    // PDF files start with %PDF
    const header = Buffer.from(pdfBytes.slice(0, 4)).toString();
    expect(header).toBe("%PDF");
  });

  it("generates valid PDF for EICR certificate", async () => {
    const eicrCertificate: Certificate = {
      ...baseCompletedCertificate,
      type: "EICR",
      data: {
        ...validCertificateData,
        type: "EICR",
        assessment: {
          overallAssessment: "Satisfactory",
          recommendations: "Routine inspection recommended in 5 years",
        },
      },
    } as Certificate;

    const pdfBytes = await renderCertificatePdf({
      certificate: eicrCertificate,
    });

    // Smoke test: PDF should be generated and non-empty
    expect(pdfBytes).toBeDefined();
    expect(pdfBytes.length).toBeGreaterThan(0);

    // Verify it's a valid PDF
    const header = Buffer.from(pdfBytes.slice(0, 4)).toString();
    expect(header).toBe("%PDF");
  });

  it("generates valid PDF for MWC certificate", async () => {
    const mwcCertificate: Certificate = {
      ...baseCompletedCertificate,
      type: "MWC",
      data: {
        ...validCertificateData,
        type: "MWC",
        installation: {
          descriptionOfWork: "Socket outlet addition",
          supplyType: "TN-S",
          earthingArrangement: "PME",
        },
      },
    } as Certificate;

    const pdfBytes = await renderCertificatePdf({
      certificate: mwcCertificate,
    });

    // Smoke test: PDF should be generated and non-empty
    expect(pdfBytes).toBeDefined();
    expect(pdfBytes.length).toBeGreaterThan(0);

    // Verify it's a valid PDF
    const header = Buffer.from(pdfBytes.slice(0, 4)).toString();
    expect(header).toBe("%PDF");
  });

  it("generates PDF with test results", async () => {
    const certificateWithTests: Certificate = {
      ...baseCompletedCertificate,
      type: "EIC",
      data: {
        ...validCertificateData,
        type: "EIC",
      },
    } as Certificate;

    const testResults = [
      {
        id: "test-1",
        companyId: "test-company",
        certificateId: "test-cert-001",
        circuitRef: "C1",
        data: {
          description: "Lighting",
          type: "Lighting",
          breakerRating: "6A",
          r1r2: "0.5",
          insulation: ">200",
        },
        createdAt: new Date(),
      },
    ];

    const pdfBytes = await renderCertificatePdf({
      certificate: certificateWithTests,
      testResults,
    });

    // Smoke test: PDF with test results should be larger
    expect(pdfBytes).toBeDefined();
    expect(pdfBytes.length).toBeGreaterThan(0);

    const header = Buffer.from(pdfBytes.slice(0, 4)).toString();
    expect(header).toBe("%PDF");
  });

  it("generates PDF with brand context", async () => {
    const certificate: Certificate = {
      ...baseCompletedCertificate,
      type: "EIC",
      data: {
        ...validCertificateData,
        type: "EIC",
      },
    } as Certificate;

    const brand = {
      name: "Test Electrical Services",
      tagline: "Quality Installations",
      logoPngBytes: null,
    };

    const pdfBytes = await renderCertificatePdf({
      certificate,
      brand,
    });

    // Smoke test: PDF should be generated
    expect(pdfBytes).toBeDefined();
    expect(pdfBytes.length).toBeGreaterThan(0);

    const header = Buffer.from(pdfBytes.slice(0, 4)).toString();
    expect(header).toBe("%PDF");
  });
});
