import { describe, it, expect } from "vitest";
import {
  validateCertificateForCompletion,
  isCertificateReadyForCompletion,
  eicCompletionSchema,
  eicrCompletionSchema,
  mwcCompletionSchema,
} from "./certificateValidation";
import type { CertificateData } from "./certificates";

describe("Certificate Validation - Compliance and Correctness", () => {
  const validSignatures = {
    engineer: {
      name: "John Engineer",
      signatureText: "J. Engineer",
      signedAtISO: "2024-01-15T10:00:00Z",
    },
    customer: {
      name: "Jane Customer",
      signatureText: "J. Customer",
      signedAtISO: "2024-01-15T11:00:00Z",
    },
  };

  const validOverview = {
    siteName: "Test Site",
    installationAddress: "123 Test Street, Test City, TE1 1ST",
    clientName: "Test Client Ltd",
    clientEmail: "client@example.com",
    jobDescription: "Installation of new electrical system",
    jobReference: "JOB-001",
  };

  const validInstallation = {
    descriptionOfWork: "New consumer unit installation",
    supplyType: "TN-S",
    earthingArrangement: "PME",
    distributionType: "Single phase",
    maxDemand: "60A",
  };

  describe("EIC (Electrical Installation Certificate)", () => {
    it("validates complete EIC certificate", () => {
      const validEIC: CertificateData = {
        version: 1,
        type: "EIC",
        overview: validOverview,
        installation: validInstallation,
        inspection: {},
        declarations: {},
        assessment: {},
        signatures: validSignatures,
      };

      const result = validateCertificateForCompletion("EIC", validEIC);
      expect(result.ok).toBe(true);
    });

    it("rejects EIC without engineer signature", () => {
      const invalidEIC = {
        version: 1,
        type: "EIC",
        overview: validOverview,
        installation: validInstallation,
        signatures: {
          engineer: {}, // Missing signature
          customer: validSignatures.customer,
        },
      };

      const result = validateCertificateForCompletion("EIC", invalidEIC);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((e) => e.includes("engineer"))).toBe(true);
      }
    });

    it("rejects EIC without customer signature", () => {
      const invalidEIC = {
        version: 1,
        type: "EIC",
        overview: validOverview,
        installation: validInstallation,
        signatures: {
          engineer: validSignatures.engineer,
          customer: {
            name: "",
            signatureText: "",
            signedAtISO: "",
          },
        },
      };

      const result = validateCertificateForCompletion("EIC", invalidEIC);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((e) => e.includes("customer"))).toBe(true);
      }
    });

    it("rejects EIC without site name", () => {
      const invalidEIC = {
        version: 1,
        type: "EIC",
        overview: { ...validOverview, siteName: "" },
        installation: validInstallation,
        signatures: validSignatures,
      };

      const result = validateCertificateForCompletion("EIC", invalidEIC);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((e) => e.includes("siteName"))).toBe(true);
      }
    });

    it("rejects EIC without installation address", () => {
      const invalidEIC = {
        version: 1,
        type: "EIC",
        overview: { ...validOverview, installationAddress: "" },
        installation: validInstallation,
        signatures: validSignatures,
      };

      const result = validateCertificateForCompletion("EIC", invalidEIC);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((e) => e.includes("installationAddress"))).toBe(true);
      }
    });

    it("rejects EIC without supply type", () => {
      const invalidEIC = {
        version: 1,
        type: "EIC",
        overview: validOverview,
        installation: { ...validInstallation, supplyType: "" },
        signatures: validSignatures,
      };

      const result = validateCertificateForCompletion("EIC", invalidEIC);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((e) => e.includes("supplyType"))).toBe(true);
      }
    });

    it("rejects EIC without earthing arrangement", () => {
      const invalidEIC = {
        version: 1,
        type: "EIC",
        overview: validOverview,
        installation: { ...validInstallation, earthingArrangement: "" },
        signatures: validSignatures,
      };

      const result = validateCertificateForCompletion("EIC", invalidEIC);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((e) => e.includes("earthingArrangement"))).toBe(true);
      }
    });
  });

  describe("EICR (Electrical Installation Condition Report)", () => {
    it("validates complete EICR certificate with assessment", () => {
      const validEICR: CertificateData = {
        version: 1,
        type: "EICR",
        overview: validOverview,
        installation: validInstallation,
        inspection: {},
        declarations: {},
        assessment: {
          overallAssessment: "Satisfactory",
          recommendations: "None",
        },
        signatures: validSignatures,
      };

      const result = validateCertificateForCompletion("EICR", validEICR);
      expect(result.ok).toBe(true);
    });

    it("rejects EICR without overall assessment", () => {
      const invalidEICR = {
        version: 1,
        type: "EICR",
        overview: validOverview,
        installation: validInstallation,
        assessment: {
          overallAssessment: "", // Missing assessment
        },
        signatures: validSignatures,
      };

      const result = validateCertificateForCompletion("EICR", invalidEICR);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((e) => e.includes("overallAssessment"))).toBe(true);
      }
    });

    it("validates EICR with unsatisfactory assessment", () => {
      const validEICR = {
        version: 1,
        type: "EICR",
        overview: validOverview,
        installation: validInstallation,
        assessment: {
          overallAssessment: "Unsatisfactory",
          recommendations: "Immediate remedial work required",
        },
        signatures: validSignatures,
      };

      const result = validateCertificateForCompletion("EICR", validEICR);
      expect(result.ok).toBe(true);
    });
  });

  describe("MWC (Minor Works Certificate)", () => {
    it("validates complete MWC certificate", () => {
      const validMWC: CertificateData = {
        version: 1,
        type: "MWC",
        overview: validOverview,
        installation: validInstallation,
        inspection: {},
        declarations: {},
        assessment: {},
        signatures: validSignatures,
      };

      const result = validateCertificateForCompletion("MWC", validMWC);
      expect(result.ok).toBe(true);
    });

    it("rejects MWC without job description", () => {
      const invalidMWC = {
        version: 1,
        type: "MWC",
        overview: { ...validOverview, jobDescription: "" },
        installation: validInstallation,
        signatures: validSignatures,
      };

      const result = validateCertificateForCompletion("MWC", invalidMWC);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((e) => e.includes("jobDescription"))).toBe(true);
      }
    });
  });

  describe("isCertificateReadyForCompletion - Lightweight check", () => {
    it("returns true for complete EIC", () => {
      const validEIC: CertificateData = {
        version: 1,
        type: "EIC",
        overview: validOverview,
        installation: validInstallation,
        inspection: {},
        declarations: {},
        assessment: {},
        signatures: validSignatures,
      };

      expect(isCertificateReadyForCompletion(validEIC)).toBe(true);
    });

    it("returns false for EIC without signatures", () => {
      const invalidEIC: CertificateData = {
        version: 1,
        type: "EIC",
        overview: validOverview,
        installation: validInstallation,
        inspection: {},
        declarations: {},
        assessment: {},
        signatures: {
          engineer: { name: "", signatureText: "", signedAtISO: "" },
          customer: { name: "", signatureText: "", signedAtISO: "" },
        },
      };

      expect(isCertificateReadyForCompletion(invalidEIC)).toBe(false);
    });

    it("returns false for EICR without overall assessment", () => {
      const invalidEICR: CertificateData = {
        version: 1,
        type: "EICR",
        overview: validOverview,
        installation: validInstallation,
        inspection: {},
        declarations: {},
        assessment: { overallAssessment: "" }, // Missing
        signatures: validSignatures,
      };

      expect(isCertificateReadyForCompletion(invalidEICR)).toBe(false);
    });

    it("returns true for EICR with overall assessment", () => {
      const validEICR: CertificateData = {
        version: 1,
        type: "EICR",
        overview: validOverview,
        installation: validInstallation,
        inspection: {},
        declarations: {},
        assessment: { overallAssessment: "Satisfactory" },
        signatures: validSignatures,
      };

      expect(isCertificateReadyForCompletion(validEICR)).toBe(true);
    });
  });

  describe("Schema enforcement", () => {
    it("EIC schema requires all critical fields", () => {
      const minimalEIC = {
        version: 1,
        type: "EIC",
        overview: {
          siteName: "Site",
          installationAddress: "Address",
          clientName: "Client",
          jobDescription: "Work",
        },
        installation: {
          descriptionOfWork: "Work",
          supplyType: "TN-S",
          earthingArrangement: "PME",
        },
        signatures: {
          engineer: {
            name: "Eng",
            signatureText: "E",
            signedAtISO: "2024-01-01T00:00:00Z",
          },
          customer: {
            name: "Cust",
            signatureText: "C",
            signedAtISO: "2024-01-01T00:00:00Z",
          },
        },
      };

      const result = eicCompletionSchema.safeParse(minimalEIC);
      expect(result.success).toBe(true);
    });

    it("EICR schema requires overall assessment", () => {
      const eicrWithoutAssessment = {
        version: 1,
        type: "EICR",
        overview: {
          siteName: "Site",
          installationAddress: "Address",
          clientName: "Client",
          jobDescription: "Inspection",
        },
        installation: {
          descriptionOfWork: "Inspection",
          supplyType: "TN-S",
          earthingArrangement: "PME",
        },
        assessment: {
          overallAssessment: "", // Empty - should fail
        },
        signatures: {
          engineer: {
            name: "Eng",
            signatureText: "E",
            signedAtISO: "2024-01-01T00:00:00Z",
          },
          customer: {
            name: "Cust",
            signatureText: "C",
            signedAtISO: "2024-01-01T00:00:00Z",
          },
        },
      };

      const result = eicrCompletionSchema.safeParse(eicrWithoutAssessment);
      expect(result.success).toBe(false);
    });
  });
});
