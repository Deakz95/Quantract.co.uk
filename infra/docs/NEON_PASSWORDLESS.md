# Neon Passwordless Connection Setup

This document explains how the CRM app connects to Neon Postgres **without storing database passwords**.

## How It Works

Instead of storing `DATABASE_URL` and `DIRECT_URL` with embedded passwords, we:

1. Store only Neon API credentials (`NEON_API_KEY`, `NEON_PROJECT_ID`)
2. At runtime, call the Neon API to retrieve connection URIs dynamically
3. The script `apps/crm/scripts/with-neon-conn.mjs` handles this transparently

## Benefits

- **No password rotation headaches** - Neon API key can be rotated independently
- **No password exposure in logs** - Connection strings are never stored in env vars
- **Audit trail** - Neon API logs all connection URI requests
- **Granular access** - API keys can have different scopes than database credentials

---

## Render Environment Variables

### Required (Secrets - set in Render Dashboard)

| Variable | Description | Example |
|----------|-------------|---------|
| `NEON_API_KEY` | Neon API key from console.neon.tech | `neon_api_key_abc123...` |
| `NEON_PROJECT_ID` | Your Neon project ID | `proud-paper-12345678` |

### Required (Can be in render.yaml)

| Variable | Description | Default |
|----------|-------------|---------|
| `NEON_DATABASE` | Database name | `neondb` |
| `NEON_ROLE` | Database role | `neondb_owner` |

### Other Required Variables

| Variable | Description |
|----------|-------------|
| `NODE_ENV` | `production` |
| `APP_ORIGIN` | `https://crm.quantract.co.uk` |
| `NEXT_PUBLIC_APP_ORIGIN` | `https://crm.quantract.co.uk` |
| `QT_USE_PRISMA` | `1` |
| `SENTRY_DSN` | Sentry DSN (optional but recommended) |
| `RESEND_API_KEY` | Resend email API key |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret |

---

## Getting Your Neon Credentials

### 1. Get NEON_API_KEY

1. Go to [console.neon.tech](https://console.neon.tech)
2. Click your profile icon → **Account settings**
3. Go to **API keys** tab
4. Click **Create new API key**
5. Copy the key (it starts with `neon_api_key_`)

### 2. Get NEON_PROJECT_ID

1. Go to [console.neon.tech](https://console.neon.tech)
2. Select your project
3. The project ID is in the URL: `console.neon.tech/app/projects/{PROJECT_ID}`
4. Or find it in **Project settings** → **General**

### 3. Confirm Database and Role Names

Default Neon setup uses:
- Database: `neondb`
- Role: `neondb_owner`

To verify or find different values:
1. Go to your project in Neon console
2. Click **Databases** to see database names
3. Click **Roles** to see role names

---

## How the Script Works

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Render Start   │────▶│ with-neon-conn   │────▶│  Child Process  │
│  Command        │     │ .mjs             │     │  (prisma/next)  │
└─────────────────┘     └────────┬─────────┘     └─────────────────┘
                                 │
                                 │ GET /api/v2/projects/{id}/connection_uri
                                 ▼
                        ┌──────────────────┐
                        │   Neon API       │
                        │   (pooled=true)  │
                        │   (pooled=false) │
                        └──────────────────┘
```

The script:
1. Reads `NEON_API_KEY`, `NEON_PROJECT_ID`, `NEON_DATABASE`, `NEON_ROLE`
2. Calls Neon API twice:
   - `pooled=true` → `DATABASE_URL` (for runtime queries via PgBouncer)
   - `pooled=false` → `DIRECT_URL` (for migrations/DDL)
3. Adds Prisma-recommended params (`pgbouncer=true&connection_limit=1`)
4. Sets `DATABASE_URL` and `DIRECT_URL` in child process environment
5. Executes the command (e.g., `prisma migrate deploy` or `next start`)

---

## Local Development

For local development, you can still use a `.env.local` file with static credentials:

```bash
# apps/crm/.env.local (local dev only)
DATABASE_URL="postgresql://quantract:dev_password@localhost:5433/quantract_dev"
DIRECT_URL="postgresql://quantract:dev_password@localhost:5433/quantract_dev"
```

Or test the Neon API flow locally:

```bash
cd apps/crm
NEON_API_KEY="neon_api_key_..." \
NEON_PROJECT_ID="proud-paper-12345678" \
NEON_DATABASE="neondb" \
NEON_ROLE="neondb_owner" \
node scripts/with-neon-conn.mjs -- prisma migrate status
```

---

## Validation Commands

### Test Migration (uses Neon API)

```bash
cd apps/crm
NEON_API_KEY="your_key" \
NEON_PROJECT_ID="your_project_id" \
node scripts/with-neon-conn.mjs -- prisma migrate status
```

### Test Runtime (uses Neon API)

```bash
cd apps/crm
NEON_API_KEY="your_key" \
NEON_PROJECT_ID="your_project_id" \
node scripts/with-neon-conn.mjs -- next start -p 3000
```

Then verify health endpoint:
```bash
curl http://localhost:3000/api/health
# Should return: {"status":"healthy","database":"connected",...}
```

---

## Troubleshooting

### Error: "Neon API authentication failed (401)"

- Check `NEON_API_KEY` is correct and not expired
- Regenerate API key in Neon console if needed

### Error: "Neon API resource not found (404)"

- Check `NEON_PROJECT_ID` matches your project
- Ensure the project hasn't been deleted

### Error: "Neon API bad request (400)"

- Check `NEON_DATABASE` exists in your project
- Check `NEON_ROLE` exists in your project
- View Neon console → Databases/Roles tabs

### Health check returns "database: disconnected"

- Check Render logs for Neon API errors
- Verify Neon project is active (not suspended due to inactivity)
- Check Neon console for any branch issues

---

## Security Notes

1. **NEON_API_KEY** is the only secret - treat it like a password
2. **Never log** the full connection URI (the script redacts credentials)
3. **API key rotation**: Generate new key in Neon, update Render, delete old key
4. **Audit**: Neon logs all API requests for compliance
