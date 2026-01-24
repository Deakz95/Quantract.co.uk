# V1 SaaS Launch Checklist (Actionable)

Print this. Tick it. Launch.

> **How to use**
> - Each item has **Acceptance Criteria** (what must be true to tick it).
> - Keep changes **additive**: don't refactor core logic unless an item forces it.
> - For every checked item, you should be able to demonstrate it in under 60 seconds.

---

## 🟢 PHASE 1 — PRODUCT READINESS

### Core

- [ ] **Admin can create company**
  - Acceptance criteria:
    - First admin login auto-provisions a company (or admin can create one in Settings).
    - `companyId` is persisted (DB + session cookie) and visible in Admin Settings.
    - Re-login returns the same company.

- [ ] **Admin can create client**
  - Acceptance criteria:
    - `/admin/clients` shows empty state when none exist.
    - Admin can create a client (name + email required) and it appears in the table.
    - Client record persists after refresh.

- [ ] **Admin can create quote**
  - Acceptance criteria:
    - `/admin/quotes/new` allows manual client name/email + line items.
    - Saving creates a quote and redirects to `/admin/quotes/[quoteId]`.
    - Quote totals render and are correct.

- [ ] **Client can accept quote**
  - Acceptance criteria:
    - Client can open the token link `/client/quotes/[token]`.
    - Clicking **Accept quote** changes status to `accepted` and persists after refresh.
    - Audit event is recorded for acceptance.

- [ ] **Agreement auto-generated**
  - Acceptance criteria:
    - Accepting a quote generates an Agreement linked to the quote.
    - Client quote page shows **Open agreement** after acceptance.

- [ ] **Client signs agreement**
  - Acceptance criteria:
    - Agreement token link loads and shows status `draft`.
    - Client enters name, checks the authorisation checkbox, clicks **Sign agreement**.
    - Status becomes `signed`, signed timestamp is shown, and certificate link appears.
    - Signature evidence (IP/user agent/timestamp minimum) is stored.

- [ ] **Job auto-created**
  - Acceptance criteria:
    - After quote acceptance (or agreement signing), a Job record exists tied to the quote/client.
    - Admin can see the job in `/admin/jobs`.

- [ ] **Invoice generated**
  - Acceptance criteria:
    - Admin can generate an invoice for a quote/job (manual action is acceptable for v1).
    - Invoice has a token link and totals.

- [ ] **Client downloads invoice**
  - Acceptance criteria:
    - Client can access `/api/client/invoices/[token]/pdf` and receives a PDF.
    - The invoice is visible in the client portal inbox.

### UX

- [ ] **Empty states explain next step**
  - Acceptance criteria:
    - Empty tables show a clear CTA (e.g., “Create your first quote”).
    - No empty screen without instruction.

- [ ] **No dead ends**
  - Acceptance criteria:
    - Every primary screen has a path forward (CTA or navigation).
    - 404s only occur on invalid tokens.

- [ ] **Mobile client flow tested**
  - Acceptance criteria:
    - Quote → Accept → Agreement → Sign → Invoice PDF works on mobile viewport.

- [ ] **PDF looks professional**
  - Acceptance criteria:
    - Quote/Agreement/Invoice PDFs have consistent typography, spacing, totals, and branding.
    - PDFs render correctly in-browser and downloaded.

---

## 🟢 PHASE 2 — LEGAL & TRUST

- [ ] **Agreement templates reviewed**
  - Acceptance criteria:
    - You have chosen the template version used in v1.
    - Template text is present in the app and can be updated via versioning.

- [ ] **Signature evidence stored**
  - Acceptance criteria:
    - Store: signer name, optional email, timestamp, agreement id, quote id, token used.
    - Store at least one of: IP address / user agent (best: both).

- [ ] **Audit log visible (admin)**
  - Acceptance criteria:
    - Admin can see quote + agreement audit trail for a quote.
    - Includes: action, actor role, timestamp.

- [ ] **Data export possible**
  - Acceptance criteria:
    - Admin can export at least: clients, quotes, invoices (CSV is fine).

- [ ] **GDPR notice page**
  - Acceptance criteria:
    - Public route `/gdpr` (or `/legal/gdpr`) exists.
    - Explains data handling and retention at a high level.

- [ ] **Terms of Service page**
  - Acceptance criteria:
    - Public route `/terms` exists.

- [ ] **Privacy Policy page**
  - Acceptance criteria:
    - Public route `/privacy` exists.

---

## 🟢 PHASE 3 — BILLING READINESS (EVEN IF MANUAL)

- [ ] **Pricing page exists**
  - Acceptance criteria:
    - Public route `/pricing` exists with 3 tiers.
    - Includes CTA to start trial / contact.

- [ ] **Plans defined in code**
  - Acceptance criteria:
    - A single source of truth (e.g., `src/lib/plans.ts`) defines plan IDs + limits.

- [ ] **Feature flags exist**
  - Acceptance criteria:
    - App checks plan/flags before showing premium actions.
    - Upgrade prompt exists instead of broken actions.

- [ ] **Manual invoice process ready**
  - Acceptance criteria:
    - You can bill a customer manually and mark them “paid” in-app.

- [ ] **Stripe account created (not live)**
  - Acceptance criteria:
    - Test keys configured.
    - Checkout/portal endpoints respond in test mode.

---

## 🟢 PHASE 4 — ONBOARDING (CRITICAL)

- [ ] **First-login setup wizard**
  - Acceptance criteria:
    - First admin login routes to `/admin/onboarding` until complete.
    - Wizard captures brand + company details.

- [ ] **“Create your first quote” CTA**
  - Acceptance criteria:
    - Visible on admin dashboard and empty states.

- [ ] **Sample client option**
  - Acceptance criteria:
    - One click creates a demo client + demo quote (safe to delete).

- [ ] **Tooltips for first 3 actions**
  - Acceptance criteria:
    - On first run: tooltips guide “Create client”, “Create quote”, “Send quote”.

> 🚨 Most SaaS fails here. If users don’t reach “Quote sent” in 2 minutes, churn spikes.

---

## 🟢 PHASE 5 — OPERATIONS

- [ ] **Error logging (Sentry or similar)**
  - Acceptance criteria:
    - Client + server errors are captured.
    - You can identify user + route for an error.

- [ ] **Backup strategy**
  - Acceptance criteria:
    - DB backups scheduled (or provider backups enabled).
    - Restore procedure documented.

- [ ] **Admin support email**
  - Acceptance criteria:
    - `/support` page or footer shows support email.
    - Resend configured for outbound.

- [ ] **Password reset flows tested**
  - Acceptance criteria:
    - Magic link works.
    - Password login works (where enabled).
    - Password change/reset works.

- [ ] **Invite links expiry tested**
  - Acceptance criteria:
    - Invite link shows “expired” state after expiry.
    - Expired tokens cannot create accounts.

---

## 🟢 PHASE 6 — SALES LAUNCH

- [ ] **Landing page**
  - Acceptance criteria:
    - `/` clearly explains the niche + outcome.

- [ ] **Clear niche message**
  - Acceptance criteria:
    - Headline states who it’s for and the core benefit.

- [ ] **3-tier pricing**
  - Acceptance criteria:
    - Clearly differentiated limits/features.

- [ ] **Demo video (Loom)**
  - Acceptance criteria:
    - 2–4 minute walk-through: create quote → accept → sign → invoice.

- [ ] **3 pilot users onboarded**
  - Acceptance criteria:
    - At least 3 real businesses actively use it this week.

- [ ] **Feedback loop open**
  - Acceptance criteria:
    - A feedback button / email + a weekly review cadence exists.

---

## Quality gates (run before every deploy)

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run test:pw` (Playwright smoke)

