#!/usr/bin/env node
/**
 * with-neon-conn.mjs
 *
 * Dynamically retrieves DATABASE_URL and DIRECT_URL from Neon API,
 * then executes the command passed after "--".
 *
 * Usage:
 *   node scripts/with-neon-conn.mjs -- prisma migrate deploy
 *   node scripts/with-neon-conn.mjs -- next start -p 3000
 *
 * Required env vars:
 *   NEON_API_KEY      - Neon API key (secret)
 *   NEON_PROJECT_ID   - Neon project ID
 *   NEON_DATABASE     - Database name (default: neondb)
 *   NEON_ROLE         - Role name (default: neondb_owner)
 */

import { spawn } from "node:child_process";

const NEON_API_BASE = "https://console.neon.tech/api/v2";

/**
 * Fetch connection URI from Neon API
 * @param {Object} options
 * @param {string} options.apiKey - Neon API key
 * @param {string} options.projectId - Neon project ID
 * @param {string} options.database - Database name
 * @param {string} options.role - Role name
 * @param {boolean} options.pooled - Whether to get pooled connection
 * @returns {Promise<string>} Connection URI
 */
async function getConnectionUri({ apiKey, projectId, database, role, pooled }) {
  const params = new URLSearchParams({
    database_name: database,
    role_name: role,
    pooled: pooled.toString(),
  });

  const url = `${NEON_API_BASE}/projects/${projectId}/connection_uri?${params}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");

    if (response.status === 401) {
      throw new Error(
        `Neon API authentication failed (401). Check NEON_API_KEY is valid and not expired.`
      );
    }
    if (response.status === 404) {
      throw new Error(
        `Neon API resource not found (404). Check NEON_PROJECT_ID="${projectId}" exists.`
      );
    }
    if (response.status === 400) {
      throw new Error(
        `Neon API bad request (400). Check NEON_DATABASE="${database}" and NEON_ROLE="${role}" exist. Details: ${errorText}`
      );
    }

    throw new Error(
      `Neon API request failed with status ${response.status}: ${errorText}`
    );
  }

  const data = await response.json();

  if (!data.uri) {
    throw new Error(
      `Neon API returned unexpected response format. Expected { uri: "..." }, got: ${JSON.stringify(data)}`
    );
  }

  return data.uri;
}

/**
 * Main entry point
 */
async function main() {
  // Parse arguments - everything after "--" is the command to run
  const args = process.argv.slice(2);
  const separatorIndex = args.indexOf("--");

  if (separatorIndex === -1 || separatorIndex === args.length - 1) {
    console.error("Usage: node scripts/with-neon-conn.mjs -- <command> [args...]");
    console.error("Example: node scripts/with-neon-conn.mjs -- prisma migrate deploy");
    process.exit(1);
  }

  const commandArgs = args.slice(separatorIndex + 1);
  const command = commandArgs[0];
  const commandArgsRest = commandArgs.slice(1);

  // Read required env vars
  const apiKey = process.env.NEON_API_KEY;
  const projectId = process.env.NEON_PROJECT_ID;
  const database = process.env.NEON_DATABASE || "neondb";
  const role = process.env.NEON_ROLE || "neondb_owner";

  // Validate required env vars
  const missing = [];
  if (!apiKey) missing.push("NEON_API_KEY");
  if (!projectId) missing.push("NEON_PROJECT_ID");

  if (missing.length > 0) {
    console.error(`Error: Missing required environment variables: ${missing.join(", ")}`);
    console.error("");
    console.error("Required:");
    console.error("  NEON_API_KEY      - Your Neon API key");
    console.error("  NEON_PROJECT_ID   - Your Neon project ID");
    console.error("");
    console.error("Optional:");
    console.error("  NEON_DATABASE     - Database name (default: neondb)");
    console.error("  NEON_ROLE         - Role name (default: neondb_owner)");
    process.exit(1);
  }

  console.log("[with-neon-conn] Fetching connection URIs from Neon API...");
  console.log(`[with-neon-conn] Project: ${projectId}`);
  console.log(`[with-neon-conn] Database: ${database}`);
  console.log(`[with-neon-conn] Role: ${role}`);

  try {
    // Fetch both pooled (for runtime) and direct (for migrations) URIs
    const [pooledUri, directUri] = await Promise.all([
      getConnectionUri({ apiKey, projectId, database, role, pooled: true }),
      getConnectionUri({ apiKey, projectId, database, role, pooled: false }),
    ]);

    // Add Prisma-recommended connection params to pooled URI
    // pgbouncer=true tells Prisma to use transaction mode compatible queries
    // connection_limit=1 is recommended for serverless
    const pooledUrl = new URL(pooledUri);
    pooledUrl.searchParams.set("pgbouncer", "true");
    pooledUrl.searchParams.set("connection_limit", "1");
    const databaseUrl = pooledUrl.toString();

    // Direct URL is used for migrations - no modifications needed
    // but ensure sslmode is present
    const directUrl = new URL(directUri);
    if (!directUrl.searchParams.has("sslmode")) {
      directUrl.searchParams.set("sslmode", "require");
    }
    const directUrlStr = directUrl.toString();

    console.log("[with-neon-conn] Connection URIs retrieved successfully");
    console.log(`[with-neon-conn] DATABASE_URL: postgresql://***@${pooledUrl.host}/***`);
    console.log(`[with-neon-conn] DIRECT_URL: postgresql://***@${directUrl.host}/***`);
    console.log(`[with-neon-conn] Executing: ${command} ${commandArgsRest.join(" ")}`);
    console.log("");

    // Spawn the child process with the connection URIs in env
    const child = spawn(command, commandArgsRest, {
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
        DIRECT_URL: directUrlStr,
      },
      stdio: "inherit",
      shell: process.platform === "win32",
    });

    child.on("error", (err) => {
      console.error(`[with-neon-conn] Failed to start command: ${err.message}`);
      process.exit(1);
    });

    child.on("close", (code) => {
      process.exit(code ?? 0);
    });

  } catch (err) {
    console.error(`[with-neon-conn] Error: ${err.message}`);
    process.exit(1);
  }
}

main();
