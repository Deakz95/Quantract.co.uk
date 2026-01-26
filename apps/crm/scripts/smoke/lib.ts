/**
 * Smoke Test Utilities
 *
 * Simple HTTP client and assertions for smoke testing.
 */

// ANSI color codes
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

export class TestError extends Error {
  constructor(message: string, public details?: unknown) {
    super(message);
    this.name = "TestError";
  }
}

export interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
  details?: unknown;
}

// Global test results
const results: TestResult[] = [];
let currentGroup = "";

/**
 * Logger with colors
 */
export const log = {
  info: (msg: string) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg: string) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg: string) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warn: (msg: string) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  group: (msg: string) => {
    currentGroup = msg;
    console.log(`\n${colors.bright}${colors.cyan}▶ ${msg}${colors.reset}`);
  },
  dim: (msg: string) => console.log(`  ${colors.dim}${msg}${colors.reset}`),
};

/**
 * Sleep for ms milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Parse JSON from response
 */
export async function json<T = unknown>(res: Response): Promise<T> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new TestError(`Failed to parse JSON: ${text.slice(0, 200)}`);
  }
}

/**
 * Assert response is OK (2xx status)
 */
export function assertOk(res: Response, label: string): void {
  if (!res.ok) {
    throw new TestError(`${label}: Expected 2xx, got ${res.status}`, {
      status: res.status,
      statusText: res.statusText,
    });
  }
}

/**
 * Assert response has specific status code
 */
export function assertStatus(res: Response, expected: number | number[], label: string): void {
  const expectedArr = Array.isArray(expected) ? expected : [expected];
  if (!expectedArr.includes(res.status)) {
    throw new TestError(
      `${label}: Expected status ${expectedArr.join(" or ")}, got ${res.status}`,
      { status: res.status }
    );
  }
}

/**
 * Assert equality
 */
export function assertEq<T>(actual: T, expected: T, label: string): void {
  if (actual !== expected) {
    throw new TestError(`${label}: Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

/**
 * Assert value is truthy
 */
export function assertTruthy(value: unknown, label: string): void {
  if (!value) {
    throw new TestError(`${label}: Expected truthy value, got ${JSON.stringify(value)}`);
  }
}

/**
 * Assert value matches regex
 */
export function assertMatches(value: string, pattern: RegExp, label: string): void {
  if (!pattern.test(value)) {
    throw new TestError(`${label}: "${value}" does not match ${pattern}`);
  }
}

/**
 * Assert array has length
 */
export function assertLength(arr: unknown[], minLength: number, label: string): void {
  if (arr.length < minLength) {
    throw new TestError(`${label}: Expected at least ${minLength} items, got ${arr.length}`);
  }
}

/**
 * Run a single test
 */
export async function test(name: string, fn: () => Promise<void>): Promise<boolean> {
  const start = Date.now();
  try {
    await fn();
    const duration = Date.now() - start;
    results.push({ name: `${currentGroup}: ${name}`, passed: true, duration });
    log.success(`${name} ${colors.dim}(${duration}ms)${colors.reset}`);
    return true;
  } catch (err) {
    const duration = Date.now() - start;
    const error = err instanceof Error ? err.message : String(err);
    const details = err instanceof TestError ? err.details : undefined;
    results.push({ name: `${currentGroup}: ${name}`, passed: false, duration, error, details });
    log.error(`${name}: ${error}`);
    if (details) {
      log.dim(`  Details: ${JSON.stringify(details)}`);
    }
    return false;
  }
}

/**
 * Skip a test with a reason
 */
export function skip(name: string, reason: string): void {
  results.push({ name: `${currentGroup}: ${name}`, passed: true, duration: 0 });
  log.warn(`${name} - SKIPPED: ${reason}`);
}

/**
 * Get final results summary
 */
export function getResults(): { passed: number; failed: number; results: TestResult[] } {
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  return { passed, failed, results };
}

/**
 * Print final summary and return exit code
 */
export function printSummary(): number {
  const { passed, failed } = getResults();
  const total = passed + failed;

  console.log("\n" + "=".repeat(50));
  console.log(`${colors.bright}SMOKE TEST SUMMARY${colors.reset}`);
  console.log("=".repeat(50));
  console.log(`${colors.green}PASSED: ${passed}${colors.reset}`);
  if (failed > 0) {
    console.log(`${colors.red}FAILED: ${failed}${colors.reset}`);
  }
  console.log(`TOTAL:  ${total}`);
  console.log("=".repeat(50));

  if (failed > 0) {
    console.log(`\n${colors.red}${colors.bright}FAILURES:${colors.reset}`);
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.log(`  ${colors.red}✗${colors.reset} ${r.name}`);
        console.log(`    ${colors.dim}${r.error}${colors.reset}`);
      });
  }

  return failed > 0 ? 1 : 0;
}

/**
 * HTTP client configuration
 */
export interface HttpClientConfig {
  baseUrl: string;
  headers?: Record<string, string>;
  timeout?: number;
}

/**
 * Simple HTTP client
 */
export class HttpClient {
  constructor(private config: HttpClientConfig) {}

  private buildUrl(path: string): string {
    const base = this.config.baseUrl.replace(/\/$/, "");
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    return `${base}${cleanPath}`;
  }

  private buildHeaders(extra?: Record<string, string>): Record<string, string> {
    return {
      ...this.config.headers,
      ...extra,
    };
  }

  async get(path: string, options?: { headers?: Record<string, string> }): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeout || 30000);

    try {
      return await fetch(this.buildUrl(path), {
        method: "GET",
        headers: this.buildHeaders(options?.headers),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  async post(
    path: string,
    body?: unknown,
    options?: { headers?: Record<string, string> }
  ): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeout || 30000);

    try {
      return await fetch(this.buildUrl(path), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...this.buildHeaders(options?.headers),
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  async delete(path: string, options?: { headers?: Record<string, string> }): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeout || 30000);

    try {
      return await fetch(this.buildUrl(path), {
        method: "DELETE",
        headers: this.buildHeaders(options?.headers),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  async patch(
    path: string,
    body?: unknown,
    options?: { headers?: Record<string, string> }
  ): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeout || 30000);

    try {
      return await fetch(this.buildUrl(path), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...this.buildHeaders(options?.headers),
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
  }
}

/**
 * Environment configuration
 */
export interface SmokeConfig {
  baseUrl: string;
  tenantSlug: string;
  allowedDomain: string;
  sessionCookie?: string;
  adminEmail?: string;
  adminPassword?: string;
  databaseUrl?: string;
}

/**
 * Load configuration from environment
 */
export function loadConfig(): SmokeConfig {
  const baseUrl = process.env.SMOKE_BASE_URL || "http://localhost:3000";
  const tenantSlug = process.env.SMOKE_TENANT_SLUG;
  const allowedDomain = process.env.SMOKE_ALLOWED_DOMAIN || "https://example.com";

  if (!tenantSlug) {
    console.error("ERROR: SMOKE_TENANT_SLUG environment variable is required");
    process.exit(1);
  }

  return {
    baseUrl,
    tenantSlug,
    allowedDomain,
    sessionCookie: process.env.SMOKE_SESSION_COOKIE,
    adminEmail: process.env.SMOKE_ADMIN_EMAIL,
    adminPassword: process.env.SMOKE_ADMIN_PASSWORD,
    databaseUrl: process.env.DATABASE_URL,
  };
}

/**
 * Get admin headers (includes session cookie if available)
 */
export function getAdminHeaders(config: SmokeConfig): Record<string, string> {
  if (config.sessionCookie) {
    return {
      Cookie: config.sessionCookie,
    };
  }
  return {};
}

/**
 * Check if admin auth is available
 */
export function hasAdminAuth(config: SmokeConfig): boolean {
  return !!(config.sessionCookie || (config.adminEmail && config.adminPassword));
}
