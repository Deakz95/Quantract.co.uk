import { beforeEach, describe, expect, it, vi } from "vitest";
import { validateInviteToken, markInviteAsUsed } from "./inviteValidation";
import * as prismaModule from "./prisma";

// Mock Prisma
vi.mock("./prisma", () => ({
  prisma: {
    invite: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
  getPrisma: vi.fn(() => ({
    invite: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  })),
}));

const mockPrisma = prismaModule.prisma;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("validateInviteToken", () => {
  it("returns valid for a valid unused non-expired invite", async () => {
    const mockInvite = {
      id: "invite-1",
      companyId: "company-1",
      role: "client",
      email: "user@example.com",
      name: "Test User",
      token: "valid-token-123",
      expiresAt: new Date(Date.now() + 86400000), // 1 day in future
      usedAt: null,
      createdAt: new Date(),
    };

    vi.mocked(mockPrisma.invite.findUnique).mockResolvedValue(mockInvite);

    const result = await validateInviteToken("valid-token-123");

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.invite.id).toBe("invite-1");
      expect(result.invite.email).toBe("user@example.com");
    }
  });

  it("returns not_found for non-existent token", async () => {
    vi.mocked(mockPrisma.invite.findUnique).mockResolvedValue(null);

    const result = await validateInviteToken("non-existent-token");

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toBe("not_found");
    }
  });

  it("returns already_used for used invite", async () => {
    const mockInvite = {
      id: "invite-1",
      companyId: "company-1",
      role: "client",
      email: "user@example.com",
      name: "Test User",
      token: "used-token-123",
      expiresAt: new Date(Date.now() + 86400000),
      usedAt: new Date(Date.now() - 3600000), // Used 1 hour ago
      createdAt: new Date(),
    };

    vi.mocked(mockPrisma.invite.findUnique).mockResolvedValue(mockInvite);

    const result = await validateInviteToken("used-token-123");

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toBe("already_used");
    }
  });

  it("returns expired for invite past expiry date", async () => {
    const mockInvite = {
      id: "invite-1",
      companyId: "company-1",
      role: "client",
      email: "user@example.com",
      name: "Test User",
      token: "expired-token-123",
      expiresAt: new Date(Date.now() - 86400000), // Expired 1 day ago
      usedAt: null,
      createdAt: new Date(),
    };

    vi.mocked(mockPrisma.invite.findUnique).mockResolvedValue(mockInvite);

    const result = await validateInviteToken("expired-token-123");

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toBe("expired");
    }
  });

  it("returns expired for invite without expiresAt", async () => {
    const mockInvite = {
      id: "invite-1",
      companyId: "company-1",
      role: "client",
      email: "user@example.com",
      name: "Test User",
      token: "no-expiry-token-123",
      expiresAt: null,
      usedAt: null,
      createdAt: new Date(),
    };

    vi.mocked(mockPrisma.invite.findUnique).mockResolvedValue(mockInvite);

    const result = await validateInviteToken("no-expiry-token-123");

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toBe("expired");
    }
  });

  it("returns expired for invite at exact expiry time", async () => {
    const now = Date.now();
    const mockInvite = {
      id: "invite-1",
      companyId: "company-1",
      role: "client",
      email: "user@example.com",
      name: "Test User",
      token: "expiring-now-token-123",
      expiresAt: new Date(now), // Expires right now
      usedAt: null,
      createdAt: new Date(),
    };

    vi.mocked(mockPrisma.invite.findUnique).mockResolvedValue(mockInvite);

    const result = await validateInviteToken("expiring-now-token-123");

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toBe("expired");
    }
  });
});

describe("markInviteAsUsed", () => {
  it("updates invite with usedAt timestamp", async () => {
    const mockUpdatedInvite = {
      id: "invite-1",
      companyId: "company-1",
      role: "client",
      email: "user@example.com",
      name: "Test User",
      token: "token-123",
      expiresAt: new Date(),
      usedAt: new Date(),
      createdAt: new Date(),
    };

    vi.mocked(mockPrisma.invite.update).mockResolvedValue(mockUpdatedInvite);

    await markInviteAsUsed("invite-1");

    expect(mockPrisma.invite.update).toHaveBeenCalledWith({
      where: { id: "invite-1" },
      data: { usedAt: expect.any(Date) },
    });
  });
});
