/**
 * Codex smoke test runner.
 *
 * Usage examples:
 *   npm run codex:check -- --base-url=http://localhost:3000
 *   npx tsx scripts/codex-check.ts -- --base-url=https://app-7165.onrender.com
 *   CODEX_BASE_URL=https://app-7165.onrender.com npm run codex:check
 *
 * It will:
 *  - Log in as admin/engineer/client using the password auth endpoint
 *  - Call a set of key routes
 *  - Record failures (status != 2xx or ok:false)
 *  - Print an end summary and exit with non-zero if any failed
 */

type Result = { name: string; ok: boolean; status?: number; error?: string };

const DEBUG = process.env.CODEX_DEBUG === "1" || process.env.CODEX_DEBUG === "true";

function dbg(...args: any[]) {
  if (DEBUG) console.log("[codex-check]", ...args);
}

function getArgValue(names: string[]): string | undefined {
  // supports:
  //  --base-url=value
  //  --base-url value
  // and multiple alias names
  for (const name of names) {
    const idx = process.argv.findIndex((a) => a === name || a.startsWith(name + "="));
    if (idx === -1) continue;

    const token = process.argv[idx];
    const v = token.includes("=") ? token.split("=", 2)[1] : process.argv[idx + 1];
    if (v && !v.startsWith("--")) return v;
  }
  return undefined;
}

function normalizeBaseUrl(input: string): string {
  let v = (input || "").trim();
  // strip quotes if someone pasted them
  v = v.replace(/^["']|["']$/g, "");

  // If someone passes just host without scheme, assume https
  if (!/^https?:\/\//i.test(v)) v = `https://${v}`;

  // remove trailing slash
  v = v.replace(/\/+$/, "");
  return v;
}

const baseUrlRaw =
  getArgValue(["--base-url", "--baseUrl", "--baseurl"]) ||
  process.env.CODEX_BASE_URL ||
  process.env.BASE_URL ||
  "http://localhost:3000";

const baseUrl = normalizeBaseUrl(baseUrlRaw);

dbg("argv:", process.argv.join(" "));
dbg("baseUrlRaw:", baseUrlRaw);
dbg("baseUrlNormalized:", baseUrl);

/**
 * Robust Set-Cookie handling:
 * - In Node/undici, multiple Set-Cookie headers may be exposed via headers.getSetCookie()
 * - A single header may also contain commas in Expires=..., so NEVER split on commas.
 */
function getSetCookies(res: Response): string[] {
  const anyHeaders = res.headers as any;

  // undici / Node >=18 often supports getSetCookie()
  const arr = typeof anyHeaders.getSetCookie === "function" ? (anyHeaders.getSetCookie() as string[]) : null;
  if (arr && Array.isArray(arr) && arr.length) return arr;

  // Fallback: single header value (may be only one cookie)
  const single = res.headers.get("set-cookie");
  return single ? [single] : [];
}

function cookieHeaderFromSetCookies(setCookies: string[]): string {
  // Convert ["a=1; Path=/; HttpOnly", "b=2; Path=/"] -> "a=1; b=2"
  const pairs = setCookies
    .map((sc) => sc.split(";", 1)[0])
    .filter(Boolean);

  // de-dupe by cookie name (keep last)
  const map = new Map<string, string>();
  for (const p of pairs) {
    const eq = p.indexOf("=");
    const k = eq === -1 ? p.trim() : p.slice(0, eq).trim();
    map.set(k, p.trim());
  }
  return Array.from(map.values()).join("; ");
}

async function postJson(url: string, body: any, cookie?: string) {
  dbg("POST", url);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
    redirect: "manual",
  });

  const setCookies = getSetCookies(res);
  dbg("POST status:", res.status, "setCookies:", setCookies.length);

  let json: any = undefined;
  try {
    json = await res.json();
  } catch {
    // ignore non-json
  }
  return { res, json, setCookies };
}

async function getJson(url: string, cookie?: string) {
  dbg("GET", url);
  const res = await fetch(url, {
    headers: { ...(cookie ? { cookie } : {}) },
    redirect: "manual",
  });

  let json: any = undefined;
  try {
    json = await res.json();
  } catch {
    // ignore non-json
  }
  return { res, json };
}

async function login(email: string, password: string) {
  const { res, json, setCookies } = await postJson(`${baseUrl}/api/auth/password/login`, { email, password });
  const cookie = cookieHeaderFromSetCookies(setCookies);

  dbg("login", email, "status", res.status, "cookieLen", cookie.length);

  // Treat ok if:
  // - status 2xx
  // - json.ok not explicitly false
  // - AND we received at least one cookie (SID etc.)
  const ok = res.ok && json?.ok !== false && cookie.length > 0;

  return { ok, cookie, status: res.status, json };
}

async function runForRole(roleName: "admin" | "engineer" | "client", email: string) {
  const results: Result[] = [];

  const loginRes = await login(email, "Password123!");
  if (!loginRes.ok) {
    results.push({
      name: `${roleName}: login`,
      ok: false,
      status: loginRes.status,
      error: JSON.stringify(loginRes.json),
    });
    return results;
  }

  results.push({ name: `${roleName}: login`, ok: true, status: loginRes.status });

  const cookie = loginRes.cookie;

  const endpoints: Array<{ name: string; url: string; method?: "GET" | "POST"; body?: any }> =
    roleName === "admin"
      ? [
          { name: "dashboard", url: "/api/admin/dashboard" },
          { name: "quotes summary", url: "/api/admin/quotes/summary" },
          { name: "planner", url: "/api/admin/planner?from=2026-01-01&to=2026-01-08" },
          { name: "suppliers summary", url: "/api/admin/suppliers/summary" },
          { name: "materials stock items", url: "/api/admin/materials/stock-items" },
          { name: "expenses list", url: "/api/admin/expenses" },
          { name: "invoices list", url: "/api/admin/invoices" },
        ]
      : roleName === "engineer"
      ? [
          { name: "jobs", url: "/api/engineer/jobs" },
          { name: "schedule", url: "/api/engineer/schedule" },
          { name: "timer active", url: "/api/engineer/timer/active" },
        ]
      : [
          { name: "invoices list", url: "/api/client/inbox/invoices" },
          { name: "quotes list", url: "/api/client/inbox/quotes" },
        ];

  for (const ep of endpoints) {
    try {
      if (ep.method === "POST") {
        const { res, json } = await postJson(`${baseUrl}${ep.url}`, ep.body ?? {}, cookie);
        const ok = res.ok && json?.ok !== false;
        results.push({
          name: `${roleName}: ${ep.name}`,
          ok,
          status: res.status,
          error: ok ? undefined : JSON.stringify(json),
        });
      } else {
        const { res, json } = await getJson(`${baseUrl}${ep.url}`, cookie);
        const ok = res.ok && json?.ok !== false;
        results.push({
          name: `${roleName}: ${ep.name}`,
          ok,
          status: res.status,
          error: ok ? undefined : JSON.stringify(json),
        });
      }
    } catch (e: any) {
      results.push({ name: `${roleName}: ${ep.name}`, ok: false, error: e?.message ?? String(e) });
    }
  }

  return results;
}

async function main() {
  console.log(`Running Codex smoke checks against ${baseUrl}`);

  const all: Result[] = [];
  all.push(...(await runForRole("admin", "admin@demo.quantract")));
  all.push(...(await runForRole("engineer", "engineer@demo.quantract")));
  all.push(...(await runForRole("client", "client@demo.quantract")));

  const failed = all.filter((r) => !r.ok);

  console.log("\n=== RESULTS ===");
  for (const r of all) {
    console.log(`${r.ok ? "✅" : "❌"} ${r.name}${r.status ? ` (${r.status})` : ""}${r.error ? ` -> ${r.error}` : ""}`);
  }

  console.log("\n=== SUMMARY ===");
  console.log(`Total: ${all.length}, Passed: ${all.length - failed.length}, Failed: ${failed.length}`);

  if (failed.length) {
    console.log("\nFailed items:");
    for (const f of failed) console.log(`- ${f.name}${f.status ? ` (${f.status})` : ""}`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
