/**
 * Shared test utilities and mock factories for API route testing.
 * These help create consistent mocks across different test files.
 */

import { vi } from "vitest";

/**
 * Create a mock user object
 */
export function createMockUser(overrides: Partial<{
  id: string;
  email: string;
  role: string;
  name: string;
  companyId: string | null;
  passwordHash: string | null;
  profileComplete: boolean;
}> = {}) {
  return {
    id: "user-123",
    email: "test@example.com",
    role: "admin",
    name: "Test User",
    companyId: "company-123",
    passwordHash: null,
    profileComplete: true,
    ...overrides,
  };
}

/**
 * Create a mock session object
 */
export function createMockSession(overrides: Partial<{
  id: string;
  userId: string;
  expiresAt: Date;
  revokedAt: Date | null;
  user: ReturnType<typeof createMockUser>;
}> = {}) {
  return {
    id: "session-123",
    userId: "user-123",
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    revokedAt: null,
    user: createMockUser(),
    ...overrides,
  };
}

/**
 * Create a mock company object
 */
export function createMockCompany(overrides: Partial<{
  id: string;
  name: string;
  slug: string;
  plan: string | null;
  subscriptionStatus: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}> = {}) {
  return {
    id: "company-123",
    name: "Test Company",
    slug: "test-company",
    plan: null,
    subscriptionStatus: null,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    ...overrides,
  };
}

/**
 * Create a mock invoice object
 */
export function createMockInvoice(overrides: Partial<{
  id: string;
  companyId: string;
  amount: number;
  status: string;
}> = {}) {
  return {
    id: "invoice-123",
    companyId: "company-123",
    amount: 1000,
    status: "pending",
    ...overrides,
  };
}

/**
 * Create a mock Request object for testing API routes
 */
export function createMockRequest(
  method: string,
  body?: unknown,
  headers?: Record<string, string>
): Request {
  const url = "http://localhost:3000/api/test";
  const init: RequestInit = {
    method,
    headers: {
      "content-type": "application/json",
      ...headers,
    },
  };

  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }

  return new Request(url, init);
}

/**
 * Create mock Prisma client methods
 */
export function createMockPrismaClient() {
  return {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
    },
    company: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    authSession: {
      findUnique: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
    },
    magicLinkToken: {
      findUnique: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
    },
    invoice: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    payment: {
      create: vi.fn(),
    },
  };
}

/**
 * Create a mock Stripe event for webhook testing
 */
export function createMockStripeEvent(
  type: string,
  data: Record<string, unknown>
) {
  return {
    id: `evt_${Date.now()}`,
    type,
    data: {
      object: data,
    },
    created: Math.floor(Date.now() / 1000),
  };
}

/**
 * Create a mock Stripe checkout session
 */
export function createMockStripeCheckoutSession(overrides: Partial<{
  id: string;
  mode: string;
  payment_status: string;
  amount_total: number;
  currency: string;
  metadata: Record<string, string>;
  subscription: string | null;
  customer: string | null;
}> = {}) {
  return {
    id: "cs_test_123",
    mode: "payment",
    payment_status: "paid",
    amount_total: 10000,
    currency: "gbp",
    metadata: {},
    subscription: null,
    customer: null,
    ...overrides,
  };
}

/**
 * Create a mock Stripe subscription
 */
export function createMockStripeSubscription(overrides: Partial<{
  id: string;
  status: string;
  current_period_end: number;
  trial_end: number | null;
  metadata: Record<string, string>;
  customer: string;
}> = {}) {
  return {
    id: "sub_test_123",
    status: "active",
    current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
    trial_end: null,
    metadata: {},
    customer: "cus_test_123",
    ...overrides,
  };
}

/**
 * Extract JSON response from NextResponse
 */
export async function getJsonResponse(response: Response) {
  return response.json();
}
