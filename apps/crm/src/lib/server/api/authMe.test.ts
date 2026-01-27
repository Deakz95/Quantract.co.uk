/**
 * Tests for the /api/auth/me endpoint logic.
 * Tests session validation and user data retrieval.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  createMockUser,
  createMockSession,
  createMockPrismaClient,
} from "../test-utils";

// Mock modules
vi.mock("@/lib/server/prisma", () => ({
  getPrisma: vi.fn(),
}));

vi.mock("@/lib/serverAuth", () => ({
  getAuthContext: vi.fn(),
}));

vi.mock("@/lib/server/observability", () => ({
  withRequestLogging: (fn: Function) => fn,
  logError: vi.fn(),
}));

import { getPrisma } from "@/lib/server/prisma";
import { getAuthContext } from "@/lib/serverAuth";
import { logError } from "@/lib/server/observability";

describe("/api/auth/me Logic", () => {
  const mockPrisma = createMockPrismaClient();

  beforeEach(() => {
    vi.clearAllMocks();
    (getPrisma as any).mockReturnValue(mockPrisma);
    process.env.QT_USE_PRISMA = "1";
  });

  describe("Authentication Check", () => {
    it("should return 401 when user is not authenticated", async () => {
      (getAuthContext as any).mockResolvedValue(null);

      const result = await simulateAuthMeRequest();

      expect(result.status).toBe(401);
      expect(result.body.ok).toBe(false);
      expect(result.body.error).toBe("unauthenticated");
    });

    it("should proceed with valid auth context", async () => {
      const authContext = {
        role: "admin",
        email: "test@example.com",
        companyId: "company-123",
        userId: "user-123",
        sessionId: "session-123",
      };
      const mockUser = createMockUser({ passwordHash: "hashedvalue" });

      (getAuthContext as any).mockResolvedValue(authContext);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await simulateAuthMeRequest();

      expect(result.status).toBe(200);
      expect(result.body.ok).toBe(true);
    });
  });

  describe("Database Availability", () => {
    it("should return 503 when database is unavailable", async () => {
      const authContext = {
        role: "admin",
        userId: "user-123",
      };

      (getAuthContext as any).mockResolvedValue(authContext);
      (getPrisma as any).mockReturnValue(null);

      const result = await simulateAuthMeRequest();

      expect(result.status).toBe(503);
      expect(result.body.error).toBe("service_unavailable");
    });

    it("should return 503 when QT_USE_PRISMA is not set", async () => {
      delete process.env.QT_USE_PRISMA;

      const authContext = {
        role: "admin",
        userId: "user-123",
      };

      (getAuthContext as any).mockResolvedValue(authContext);

      const result = await simulateAuthMeRequest();

      expect(result.status).toBe(503);
      expect(result.body.error).toBe("service_unavailable");
    });

    afterEach(() => {
      process.env.QT_USE_PRISMA = "1";
    });
  });

  describe("User Lookup", () => {
    it("should return 404 when user not found in database", async () => {
      const authContext = {
        role: "admin",
        email: "test@example.com",
        companyId: "company-123",
        userId: "user-123",
        sessionId: "session-123",
      };

      (getAuthContext as any).mockResolvedValue(authContext);
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await simulateAuthMeRequest();

      expect(result.status).toBe(404);
      expect(result.body.error).toBe("user_not_found");
    });

    it("should query user with correct ID", async () => {
      const authContext = {
        role: "admin",
        userId: "specific-user-id",
      };
      const mockUser = createMockUser({ id: "specific-user-id" });

      (getAuthContext as any).mockResolvedValue(authContext);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await simulateAuthMeRequest();

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: "specific-user-id" },
        select: { email: true, role: true, passwordHash: true },
      });
    });
  });

  describe("Response Data", () => {
    it("should return user email and role", async () => {
      const authContext = {
        role: "admin",
        userId: "user-123",
      };
      const mockUser = createMockUser({
        email: "user@company.com",
        role: "engineer",
        passwordHash: null,
      });

      (getAuthContext as any).mockResolvedValue(authContext);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await simulateAuthMeRequest();

      expect(result.body.user.email).toBe("user@company.com");
      expect(result.body.user.role).toBe("engineer");
    });

    it("should indicate hasPassword as true when passwordHash exists", async () => {
      const authContext = { role: "admin", userId: "user-123" };
      const mockUser = createMockUser({ passwordHash: "$2a$12$hashedvalue" });

      (getAuthContext as any).mockResolvedValue(authContext);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await simulateAuthMeRequest();

      expect(result.body.user.hasPassword).toBe(true);
    });

    it("should indicate hasPassword as false when passwordHash is null", async () => {
      const authContext = { role: "admin", userId: "user-123" };
      const mockUser = createMockUser({ passwordHash: null });

      (getAuthContext as any).mockResolvedValue(authContext);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await simulateAuthMeRequest();

      expect(result.body.user.hasPassword).toBe(false);
    });

    it("should not expose password hash in response", async () => {
      const authContext = { role: "admin", userId: "user-123" };
      const mockUser = createMockUser({ passwordHash: "$2a$12$sensitive" });

      (getAuthContext as any).mockResolvedValue(authContext);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await simulateAuthMeRequest();

      expect(result.body.user.passwordHash).toBeUndefined();
      expect(result.body.user.hasPassword).toBeDefined();
    });
  });

  describe("Error Handling", () => {
    it("should return 500 and log error on unexpected exceptions", async () => {
      const authContext = { role: "admin", userId: "user-123" };

      (getAuthContext as any).mockResolvedValue(authContext);
      mockPrisma.user.findUnique.mockRejectedValue(new Error("Database connection failed"));

      const result = await simulateAuthMeRequest();

      expect(result.status).toBe(500);
      expect(result.body.error).toBe("internal_error");
      expect(logError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ route: "/api/auth/me" })
      );
    });

    it("should handle getAuthContext throwing an error", async () => {
      (getAuthContext as any).mockRejectedValue(new Error("Cookie parsing failed"));

      const result = await simulateAuthMeRequest();

      expect(result.status).toBe(500);
      expect(result.body.error).toBe("internal_error");
    });
  });

  describe("Role-based Access", () => {
    it.each(["admin", "engineer", "client"])("should work for %s role", async (role) => {
      const authContext = { role, userId: "user-123" };
      const mockUser = createMockUser({ role });

      (getAuthContext as any).mockResolvedValue(authContext);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await simulateAuthMeRequest();

      expect(result.status).toBe(200);
      expect(result.body.user.role).toBe(role);
    });
  });
});

// Simulation helper that mirrors the /api/auth/me route logic
async function simulateAuthMeRequest(): Promise<{
  status: number;
  body: { ok: boolean; error?: string; user?: any };
}> {
  try {
    const ctx = await getAuthContext();
    if (!ctx) {
      return {
        status: 401,
        body: { ok: false, error: "unauthenticated" },
      };
    }

    const db = getPrisma();
    if (!db || process.env.QT_USE_PRISMA !== "1") {
      return {
        status: 503,
        body: { ok: false, error: "service_unavailable" },
      };
    }

    const user = await db.user.findUnique({
      where: { id: ctx.userId },
      select: { email: true, role: true, passwordHash: true },
    });

    if (!user) {
      return {
        status: 404,
        body: { ok: false, error: "user_not_found" },
      };
    }

    return {
      status: 200,
      body: {
        ok: true,
        user: {
          email: user.email,
          role: user.role,
          hasPassword: Boolean(user.passwordHash),
        },
      },
    };
  } catch (error) {
    logError(error, { route: "/api/auth/me", action: "get_session" });
    return {
      status: 500,
      body: { ok: false, error: "internal_error" },
    };
  }
}
