/**
 * Tests for certificates module
 */
import { describe, expect, it } from "vitest";
import {
  CERTIFICATE_TYPES,
  getCertificateTemplate,
  normalizeCertificateData,
  signatureIsPresent,
  certificateIsReadyForCompletion,
  certificateDataSchema,
  eicCertificateSchema,
  eicrCertificateSchema,
  mwcCertificateSchema,
  type CertificateType,
  type CertificateData,
  type CertificateSignature,
} from "./certificates";

describe("certificates", () => {
  describe("CERTIFICATE_TYPES", () => {
    it("should have EIC, EICR, and MWC types", () => {
      expect(CERTIFICATE_TYPES).toContain("EIC");
      expect(CERTIFICATE_TYPES).toContain("EICR");
      expect(CERTIFICATE_TYPES).toContain("MWC");
      expect(CERTIFICATE_TYPES).toHaveLength(3);
    });
  });

  describe("getCertificateTemplate", () => {
    it("should create EIC template", () => {
      const template = getCertificateTemplate("EIC");
      expect(template.type).toBe("EIC");
      expect(template.version).toBe(1);
    });

    it("should create EICR template", () => {
      const template = getCertificateTemplate("EICR");
      expect(template.type).toBe("EICR");
    });

    it("should create MWC template", () => {
      const template = getCertificateTemplate("MWC");
      expect(template.type).toBe("MWC");
    });

    it("should populate context into template", () => {
      const template = getCertificateTemplate("EIC", {
        jobId: "JOB-123",
        siteName: "Test Site",
        siteAddress: "123 Test Street",
        clientName: "John Doe",
        clientEmail: "john@example.com",
        jobDescription: "New installation",
        inspectorName: "Inspector Smith",
      });

      expect(template.overview.jobReference).toBe("JOB-123");
      expect(template.overview.siteName).toBe("Test Site");
      expect(template.overview.installationAddress).toBe("123 Test Street");
      expect(template.overview.clientName).toBe("John Doe");
      expect(template.overview.clientEmail).toBe("john@example.com");
      expect(template.overview.jobDescription).toBe("New installation");
      expect(template.signatures.engineer.name).toBe("Inspector Smith");
      expect(template.signatures.customer.name).toBe("John Doe");
    });

    it("should handle missing context", () => {
      const template = getCertificateTemplate("EIC", {});
      expect(template.overview.jobReference).toBe("");
      expect(template.overview.siteName).toBe("");
    });

    it("should handle undefined context", () => {
      const template = getCertificateTemplate("EIC");
      expect(template.overview.jobReference).toBe("");
    });

    it("should have all required sections", () => {
      const template = getCertificateTemplate("EIC");
      expect(template.overview).toBeDefined();
      expect(template.installation).toBeDefined();
      expect(template.inspection).toBeDefined();
      expect(template.declarations).toBeDefined();
      expect(template.assessment).toBeDefined();
      expect(template.signatures).toBeDefined();
    });
  });

  describe("normalizeCertificateData", () => {
    it("should return template for null input", () => {
      const result = normalizeCertificateData("EIC", null);
      expect(result.type).toBe("EIC");
      expect(result.version).toBe(1);
    });

    it("should return template for undefined input", () => {
      const result = normalizeCertificateData("EIC", undefined);
      expect(result.type).toBe("EIC");
    });

    it("should return template for non-object input", () => {
      const result = normalizeCertificateData("EIC", "string");
      expect(result.type).toBe("EIC");
    });

    it("should merge input with template", () => {
      const input = {
        overview: {
          siteName: "Custom Site",
        },
      };
      const result = normalizeCertificateData("EIC", input);
      expect(result.overview.siteName).toBe("Custom Site");
      expect(result.overview.jobReference).toBe(""); // Default preserved
    });

    it("should preserve all input fields", () => {
      const input = {
        version: 1,
        type: "EIC",
        overview: {
          siteName: "Site",
          installationAddress: "Address",
          clientName: "Client",
          clientEmail: "email@test.com",
          jobDescription: "Description",
        },
      };
      const result = normalizeCertificateData("EIC", input);
      expect(result.overview.siteName).toBe("Site");
      expect(result.overview.installationAddress).toBe("Address");
    });

    it("should apply context to template before merge", () => {
      const input = { overview: { siteName: "Override" } };
      const context = { siteName: "Context Site" };
      const result = normalizeCertificateData("EIC", input, context);
      expect(result.overview.siteName).toBe("Override"); // Input overrides context
    });
  });

  describe("signatureIsPresent", () => {
    it("should return true for complete signature", () => {
      const signature: CertificateSignature = {
        name: "John Doe",
        signatureText: "JD",
        signedAtISO: "2024-01-15T10:00:00Z",
      };
      expect(signatureIsPresent(signature)).toBe(true);
    });

    it("should return true with signatureText and date", () => {
      const signature: CertificateSignature = {
        signatureText: "JD",
        signedAtISO: "2024-01-15T10:00:00Z",
      };
      expect(signatureIsPresent(signature)).toBe(true);
    });

    it("should return true with name and date", () => {
      const signature: CertificateSignature = {
        name: "John Doe",
        signedAtISO: "2024-01-15T10:00:00Z",
      };
      expect(signatureIsPresent(signature)).toBe(true);
    });

    it("should return false without date", () => {
      const signature: CertificateSignature = {
        name: "John Doe",
        signatureText: "JD",
      };
      expect(signatureIsPresent(signature)).toBe(false);
    });

    it("should return false without name or signatureText", () => {
      const signature: CertificateSignature = {
        signedAtISO: "2024-01-15T10:00:00Z",
      };
      expect(signatureIsPresent(signature)).toBe(false);
    });

    it("should return false for null", () => {
      expect(signatureIsPresent(null)).toBe(false);
    });

    it("should return false for undefined", () => {
      expect(signatureIsPresent(undefined)).toBe(false);
    });

    it("should return false for empty strings", () => {
      const signature: CertificateSignature = {
        name: "",
        signatureText: "",
        signedAtISO: "",
      };
      expect(signatureIsPresent(signature)).toBe(false);
    });

    it("should return false for whitespace-only name", () => {
      const signature: CertificateSignature = {
        name: "   ",
        signedAtISO: "2024-01-15T10:00:00Z",
      };
      expect(signatureIsPresent(signature)).toBe(false);
    });
  });

  describe("certificateIsReadyForCompletion", () => {
    it("should return ok:true when both signatures present", () => {
      const data: CertificateData = {
        version: 1,
        type: "EIC",
        overview: { jobReference: "", siteName: "", installationAddress: "", clientName: "", clientEmail: "", jobDescription: "" },
        installation: { descriptionOfWork: "", supplyType: "", earthingArrangement: "", distributionType: "", maxDemand: "" },
        inspection: { limitations: "", observations: "", nextInspectionDate: "" },
        declarations: { extentOfWork: "", worksTested: "", comments: "" },
        assessment: { overallAssessment: "", recommendations: "" },
        signatures: {
          engineer: { name: "Engineer", signatureText: "E", signedAtISO: "2024-01-15T10:00:00Z" },
          customer: { name: "Customer", signatureText: "C", signedAtISO: "2024-01-15T11:00:00Z" },
        },
      };

      const result = certificateIsReadyForCompletion(data);
      expect(result.ok).toBe(true);
      expect(result.missing).toHaveLength(0);
    });

    it("should return ok:false when engineer signature missing", () => {
      const data: CertificateData = {
        version: 1,
        type: "EIC",
        overview: { jobReference: "", siteName: "", installationAddress: "", clientName: "", clientEmail: "", jobDescription: "" },
        installation: { descriptionOfWork: "", supplyType: "", earthingArrangement: "", distributionType: "", maxDemand: "" },
        inspection: { limitations: "", observations: "", nextInspectionDate: "" },
        declarations: { extentOfWork: "", worksTested: "", comments: "" },
        assessment: { overallAssessment: "", recommendations: "" },
        signatures: {
          engineer: { name: "", signatureText: "", signedAtISO: "" },
          customer: { name: "Customer", signatureText: "C", signedAtISO: "2024-01-15T11:00:00Z" },
        },
      };

      const result = certificateIsReadyForCompletion(data);
      expect(result.ok).toBe(false);
      expect(result.missing).toContain("engineer signature");
    });

    it("should return ok:false when customer signature missing", () => {
      const data: CertificateData = {
        version: 1,
        type: "EIC",
        overview: { jobReference: "", siteName: "", installationAddress: "", clientName: "", clientEmail: "", jobDescription: "" },
        installation: { descriptionOfWork: "", supplyType: "", earthingArrangement: "", distributionType: "", maxDemand: "" },
        inspection: { limitations: "", observations: "", nextInspectionDate: "" },
        declarations: { extentOfWork: "", worksTested: "", comments: "" },
        assessment: { overallAssessment: "", recommendations: "" },
        signatures: {
          engineer: { name: "Engineer", signatureText: "E", signedAtISO: "2024-01-15T10:00:00Z" },
          customer: { name: "", signatureText: "", signedAtISO: "" },
        },
      };

      const result = certificateIsReadyForCompletion(data);
      expect(result.ok).toBe(false);
      expect(result.missing).toContain("customer signature");
    });

    it("should return both signatures in missing when both absent", () => {
      const data: CertificateData = {
        version: 1,
        type: "EIC",
        overview: { jobReference: "", siteName: "", installationAddress: "", clientName: "", clientEmail: "", jobDescription: "" },
        installation: { descriptionOfWork: "", supplyType: "", earthingArrangement: "", distributionType: "", maxDemand: "" },
        inspection: { limitations: "", observations: "", nextInspectionDate: "" },
        declarations: { extentOfWork: "", worksTested: "", comments: "" },
        assessment: { overallAssessment: "", recommendations: "" },
        signatures: {
          engineer: { name: "", signatureText: "", signedAtISO: "" },
          customer: { name: "", signatureText: "", signedAtISO: "" },
        },
      };

      const result = certificateIsReadyForCompletion(data);
      expect(result.ok).toBe(false);
      expect(result.missing).toContain("engineer signature");
      expect(result.missing).toContain("customer signature");
      expect(result.missing).toHaveLength(2);
    });
  });

  describe("schemas", () => {
    it("should validate EIC certificate", () => {
      const data = {
        version: 1,
        type: "EIC",
        overview: {},
        installation: {},
        inspection: {},
        declarations: {},
        assessment: {},
        signatures: {},
      };
      const result = eicCertificateSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("should validate EICR certificate", () => {
      const data = {
        version: 1,
        type: "EICR",
        overview: {},
        installation: {},
        inspection: {},
        declarations: {},
        assessment: {},
        signatures: {},
      };
      const result = eicrCertificateSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("should validate MWC certificate", () => {
      const data = {
        version: 1,
        type: "MWC",
        overview: {},
        installation: {},
        inspection: {},
        declarations: {},
        assessment: {},
        signatures: {},
      };
      const result = mwcCertificateSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("should reject invalid version", () => {
      const data = {
        version: 2,
        type: "EIC",
      };
      const result = certificateDataSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("should reject invalid type", () => {
      const data = {
        version: 1,
        type: "INVALID",
      };
      const result = certificateDataSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("should apply defaults for missing sections", () => {
      const data = {
        version: 1,
        type: "EIC",
      };
      const result = certificateDataSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.overview).toBeDefined();
        expect(result.data.installation).toBeDefined();
        expect(result.data.signatures).toBeDefined();
      }
    });
  });
});
