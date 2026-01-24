# Prisma schema v2 + production migration notes

These notes assume you're running on **PostgreSQL** with Prisma.

## 1) Environment variables

Set these in your deployment environment:

```bash
# enable prisma-backed repo code
QT_USE_PRISMA=1

# your database
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DBNAME

# optional defaults
QT_DEFAULT_COST_RATE_PER_HOUR=25

# branding (optional)
NEXT_PUBLIC_QT_BRAND_NAME=Quantract
NEXT_PUBLIC_QT_BRAND_TAGLINE="Electrical & Building Services"
QT_BRAND_NAME=Quantract
```

Notes:
- `NEXT_PUBLIC_*` is used by client-side UI.
- `QT_BRAND_NAME` is used by server-side PDF rendering.

## 2) Generate + migrate

From the project root:

```bash
npx prisma generate
npx prisma migrate dev --name schema_v2
```

For production, use:

```bash
npx prisma migrate deploy
```

## 3) Storage

Certificate issuance writes a PDF to your local `uploads` storage (see `src/lib/server/storage.ts`).
If you want S3/Cloud storage later, swap that implementation.

## 4) Data migration (file DB → Prisma)

If you previously used the JSON file DB (when `QT_USE_PRISMA != 1`), you can:

1. Export the JSON file (default `.qt-data.json` or `QT_DATA_PATH`).
2. Write a one-off script to import clients/quotes/invoices/jobs.

This repo intentionally does **not** auto-migrate production data in runtime code.

---

# Pack C2 — Timesheets approvals + locking rules

This pack adds:
- `Timesheet` model
- `TimeEntry.timesheetId`, `TimeEntry.status`, `TimeEntry.lockedAt`

## Migrate

Dev:

```bash
npx prisma generate
npx prisma migrate dev --name timesheets
```

Production:

```bash
npx prisma generate
npx prisma migrate deploy
```

## Behaviour

- Engineers submit a week from **Engineer → Timesheets**.
- Admin reviews and approves/rejects from **Admin → Timesheets**.
- Approved time entries are locked and default costing uses approved entries (unless `include_unapproved=1`).

---

# Pack C3 — Scheduling (multi-engineer, clash warnings, week view)

This pack adds:
- `ScheduleEntry` model (many entries per job, many engineers per job)
- Admin week view + overbook clash warnings
- Engineer "My Schedule" page

## Migrate

Dev:

```bash
npx prisma generate
npx prisma migrate dev --name schedule_entries
```

Production:

```bash
npx prisma generate
npx prisma migrate deploy
```

## Behaviour

- Admin creates schedule entries from **Admin → Schedule**.
- Each entry books an engineer on a job from `startAt` to `endAt`.
- The API returns clash warnings when an engineer has overlapping bookings in the selected range.
- Creating a schedule entry also updates `Job.scheduledAt`, `Job.status = scheduled`, and sets `Job.engineerId` as the booked engineer (lead).

---

# Pack D2 / D1 / D3 (SaaS foundations)

## Prisma migration

1) Ensure Prisma mode is enabled:

- `QT_USE_PRISMA=1`
- `DATABASE_URL=postgres://...`

2) Generate and migrate:

```bash
npx prisma generate
npx prisma migrate dev --name saas_company_billing
# production:
npx prisma migrate deploy
```

## Required env vars

### Multi-tenant defaults
- `QT_DEFAULT_COMPANY_NAME=Quantract` (or your product brand)
- `QT_DEFAULT_COMPANY_SLUG=quantract`
- `QT_ADMIN_EMAIL=admin@yourdomain.com` (demo admin email)

### Stripe Billing (SaaS subscriptions)
- `STRIPE_SECRET_KEY=...`
- `STRIPE_WEBHOOK_SECRET=...`
- `APP_BASE_URL=https://app.yourdomain.com`
- `STRIPE_PRICE_SOLO=price_...`
- `STRIPE_PRICE_TEAM=price_...`
- `STRIPE_PRICE_PRO=price_...`

### Email sending (Resend)
- `RESEND_API_KEY=re_...`
- `FROM_EMAIL=Your App <billing@yourdomain.com>`

If `RESEND_API_KEY` is missing, emails are logged to the server console (dev-safe).
