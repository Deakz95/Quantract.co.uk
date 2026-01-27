/**
 * Tests for checklist gating
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { validateJobCompletion, overrideJobCompletionGating } from "./checklistGating";

// Mock getPrisma
const mockPrisma = {
  jobChecklist: {
    findMany: vi.fn(),
  },
  job: {
    findUnique: vi.fn(),
  },
  auditEvent: {
    create: vi.fn(),
  },
};

vi.mock("./prisma", () => ({
  getPrisma: vi.fn(() => mockPrisma),
}));

describe("checklistGating", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("validateJobCompletion", () => {
    it("should return not allowed when database unavailable", async () => {
      const { getPrisma } = await import("./prisma");
      vi.mocked(getPrisma).mockReturnValueOnce(null as any);

      const result = await validateJobCompletion("job-123");

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("Database not available");
    });

    it("should allow completion when no incomplete required items", async () => {
      mockPrisma.jobChecklist.findMany.mockResolvedValue([
        { id: "cl-1", title: "Checklist 1", items: [] },
        { id: "cl-2", title: "Checklist 2", items: [] },
      ]);

      const result = await validateJobCompletion("job-123");

      expect(result.allowed).toBe(true);
    });

    it("should block completion when required items incomplete", async () => {
      mockPrisma.jobChecklist.findMany.mockResolvedValue([
        {
          id: "cl-1",
          title: "Safety Checklist",
          items: [
            { id: "item-1", title: "Safety inspection", isRequired: true },
            { id: "item-2", title: "Final sign-off", isRequired: true },
          ],
        },
      ]);

      const result = await validateJobCompletion("job-123");

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("2 required checklist item(s) are incomplete");
      expect(result.details?.incompleteItems).toHaveLength(2);
    });

    it("should include checklist details in response", async () => {
      mockPrisma.jobChecklist.findMany.mockResolvedValue([
        {
          id: "cl-1",
          title: "Quality Control",
          items: [
            { id: "item-1", title: "QC Check 1", isRequired: true },
          ],
        },
      ]);

      const result = await validateJobCompletion("job-123");

      expect(result.details?.incompleteItems[0].checklistTitle).toBe("Quality Control");
      expect(result.details?.incompleteItems[0].itemTitle).toBe("QC Check 1");
    });
  });

  describe("overrideJobCompletionGating", () => {
    it("should return false when database unavailable", async () => {
      const { getPrisma } = await import("./prisma");
      vi.mocked(getPrisma).mockReturnValueOnce(null as any);

      const result = await overrideJobCompletionGating("job-123", "user-1", "Testing");

      expect(result).toBe(false);
    });

    it("should return false when job not found", async () => {
      mockPrisma.job.findUnique.mockResolvedValue(null);

      const result = await overrideJobCompletionGating("job-123", "user-1", "Testing");

      expect(result).toBe(false);
    });

    it("should create audit event and return true on success", async () => {
      mockPrisma.job.findUnique.mockResolvedValue({
        id: "job-123",
        companyId: "company-1",
      });
      mockPrisma.auditEvent.create.mockResolvedValue({ id: "audit-1" });

      const result = await overrideJobCompletionGating("job-123", "user-1", "Override reason");

      expect(result).toBe(true);
      expect(mockPrisma.auditEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          companyId: "company-1",
          userId: "user-1",
          action: "job.completion.override",
          entityType: "job",
          entityId: "job-123",
          metadata: expect.objectContaining({
            reason: "Override reason",
          }),
        }),
      });
    });
  });
});
