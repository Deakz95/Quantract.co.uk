// src/lib/clientStore.ts
"use client";

export type ClientRecord = {
  id: string;
  name: string;
  email?: string;
  phone?: string;

  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  county?: string;
  postcode?: string;
  country?: string;

  notes?: string;

  createdAtISO: string;
  updatedAtISO: string;
};

const KEY = "qt_clients_v1";

function uid(prefix = "CLT") {
  return `${prefix}-${Math.random().toString(16).slice(2, 8).toUpperCase()}`;
}

function loadAll(): ClientRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as ClientRecord[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveAll(all: ClientRecord[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(all));
}

export function ensureDemoClients() {
  const all = loadAll();
  if (all.length > 0) return;
  const now = new Date().toISOString();
  const demo: ClientRecord[] = [
    {
      id: uid(),
      name: "Alex Smith",
      email: "alex@example.com",
      phone: "07911 123 456",
      addressLine1: "12 High Street",
      city: "London",
      postcode: "SW1A 1AA",
      country: "UK",
      notes: "Preferred contact: email.",
      createdAtISO: now,
      updatedAtISO: now,
    },
    {
      id: uid(),
      name: "Jamie Patel",
      email: "jamie@example.com",
      phone: "07888 555 000",
      addressLine1: "4 Station Road",
      city: "Manchester",
      postcode: "M1 1AE",
      country: "UK",
      notes: "New build. Needs weekend access.",
      createdAtISO: now,
      updatedAtISO: now,
    },
  ];
  saveAll(demo);
}

export function getAllClients(): ClientRecord[] {
  return loadAll().sort((a, b) => (a.updatedAtISO < b.updatedAtISO ? 1 : -1));
}

export function getClient(id: string): ClientRecord | null {
  return loadAll().find((c) => c.id === id) ?? null;
}

export function upsertClient(input: Partial<ClientRecord> & { id?: string; name: string }): ClientRecord {
  const all = loadAll();
  const now = new Date().toISOString();

  const next: ClientRecord = {
    id: input.id ?? uid(),
    name: input.name.trim(),
    email: input.email?.trim() || undefined,
    phone: input.phone?.trim() || undefined,
    addressLine1: input.addressLine1?.trim() || undefined,
    addressLine2: input.addressLine2?.trim() || undefined,
    city: input.city?.trim() || undefined,
    county: input.county?.trim() || undefined,
    postcode: input.postcode?.trim() || undefined,
    country: input.country?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    createdAtISO: input.id ? (getClient(input.id)?.createdAtISO ?? now) : now,
    updatedAtISO: now,
  };

  const idx = all.findIndex((c) => c.id === next.id);
  if (idx === -1) all.push(next);
  else all[idx] = next;
  saveAll(all);
  return next;
}

export function deleteClient(id: string) {
  const all = loadAll();
  saveAll(all.filter((c) => c.id !== id));
}
