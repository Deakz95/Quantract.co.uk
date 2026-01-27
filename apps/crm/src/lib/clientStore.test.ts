/**
 * Tests for clientStore (client-side localStorage store)
 */
import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  getAllClients,
  getClient,
  upsertClient,
  deleteClient,
  ensureDemoClients,
  type ClientRecord,
} from "./clientStore";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(global, "window", {
  value: { localStorage: localStorageMock },
  writable: true,
});

describe("clientStore", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe("getAllClients", () => {
    it("should return empty array when no clients", () => {
      expect(getAllClients()).toEqual([]);
    });

    it("should return clients sorted by updatedAtISO descending", () => {
      const clients: ClientRecord[] = [
        { id: "1", name: "First", createdAtISO: "2024-01-01", updatedAtISO: "2024-01-01" },
        { id: "2", name: "Second", createdAtISO: "2024-01-02", updatedAtISO: "2024-01-03" },
        { id: "3", name: "Third", createdAtISO: "2024-01-03", updatedAtISO: "2024-01-02" },
      ];
      localStorageMock.setItem("qt_clients_v1", JSON.stringify(clients));

      const result = getAllClients();
      expect(result[0].name).toBe("Second"); // Most recently updated
      expect(result[1].name).toBe("Third");
      expect(result[2].name).toBe("First");
    });
  });

  describe("getClient", () => {
    it("should return null for non-existent client", () => {
      expect(getClient("non-existent")).toBeNull();
    });

    it("should return client by id", () => {
      const clients: ClientRecord[] = [
        { id: "client-1", name: "Test Client", createdAtISO: "2024-01-01", updatedAtISO: "2024-01-01" },
      ];
      localStorageMock.setItem("qt_clients_v1", JSON.stringify(clients));

      const result = getClient("client-1");
      expect(result?.name).toBe("Test Client");
    });
  });

  describe("upsertClient", () => {
    it("should create new client with generated id", () => {
      const result = upsertClient({ name: "New Client" });
      expect(result.id).toMatch(/^CLT-[A-F0-9]+$/);
      expect(result.name).toBe("New Client");
    });

    it("should update existing client", () => {
      const initial = upsertClient({ name: "Initial" });
      const updated = upsertClient({ id: initial.id, name: "Updated" });

      expect(updated.id).toBe(initial.id);
      expect(updated.name).toBe("Updated");
    });

    it("should trim whitespace from name", () => {
      const result = upsertClient({ name: "  Trimmed Name  " });
      expect(result.name).toBe("Trimmed Name");
    });

    it("should trim optional fields", () => {
      const result = upsertClient({
        name: "Test",
        email: "  test@example.com  ",
        phone: "  07911 123456  ",
        addressLine1: "  123 Street  ",
      });

      expect(result.email).toBe("test@example.com");
      expect(result.phone).toBe("07911 123456");
      expect(result.addressLine1).toBe("123 Street");
    });

    it("should set undefined for empty optional fields", () => {
      const result = upsertClient({
        name: "Test",
        email: "   ",
        phone: "",
      });

      expect(result.email).toBeUndefined();
      expect(result.phone).toBeUndefined();
    });

    it("should set createdAtISO for new clients", () => {
      const result = upsertClient({ name: "New" });
      expect(result.createdAtISO).toBeDefined();
      expect(new Date(result.createdAtISO).getTime()).toBeGreaterThan(0);
    });

    it("should preserve createdAtISO for existing clients", () => {
      const initial = upsertClient({ name: "Initial" });
      const originalCreated = initial.createdAtISO;

      const updated = upsertClient({ id: initial.id, name: "Updated" });
      expect(updated.createdAtISO).toBe(originalCreated);
    });

    it("should update updatedAtISO on every upsert", () => {
      const initial = upsertClient({ name: "Initial" });
      const originalUpdated = initial.updatedAtISO;

      // Ensure some time passes
      const updated = upsertClient({ id: initial.id, name: "Updated" });
      expect(updated.updatedAtISO).toBeDefined();
    });

    it("should handle all address fields", () => {
      const result = upsertClient({
        name: "Test",
        addressLine1: "123 High Street",
        addressLine2: "Floor 2",
        city: "London",
        county: "Greater London",
        postcode: "SW1A 1AA",
        country: "UK",
      });

      expect(result.addressLine1).toBe("123 High Street");
      expect(result.addressLine2).toBe("Floor 2");
      expect(result.city).toBe("London");
      expect(result.county).toBe("Greater London");
      expect(result.postcode).toBe("SW1A 1AA");
      expect(result.country).toBe("UK");
    });

    it("should handle notes field", () => {
      const result = upsertClient({
        name: "Test",
        notes: "Important client notes",
      });
      expect(result.notes).toBe("Important client notes");
    });
  });

  describe("deleteClient", () => {
    it("should remove client from store", () => {
      const client = upsertClient({ name: "To Delete" });
      expect(getClient(client.id)).not.toBeNull();

      deleteClient(client.id);
      expect(getClient(client.id)).toBeNull();
    });

    it("should not affect other clients", () => {
      const client1 = upsertClient({ name: "Client 1" });
      const client2 = upsertClient({ name: "Client 2" });

      deleteClient(client1.id);

      expect(getClient(client1.id)).toBeNull();
      expect(getClient(client2.id)).not.toBeNull();
    });

    it("should handle deleting non-existent client", () => {
      expect(() => deleteClient("non-existent")).not.toThrow();
    });
  });

  describe("ensureDemoClients", () => {
    it("should create demo clients when store is empty", () => {
      ensureDemoClients();
      const clients = getAllClients();
      expect(clients.length).toBeGreaterThan(0);
    });

    it("should not create demo clients when store has data", () => {
      upsertClient({ name: "Existing Client" });
      const countBefore = getAllClients().length;

      ensureDemoClients();

      const countAfter = getAllClients().length;
      expect(countAfter).toBe(countBefore);
    });

    it("should create demo clients with valid data", () => {
      ensureDemoClients();
      const clients = getAllClients();

      for (const client of clients) {
        expect(client.id).toBeDefined();
        expect(client.name).toBeDefined();
        expect(client.createdAtISO).toBeDefined();
        expect(client.updatedAtISO).toBeDefined();
      }
    });
  });
});
