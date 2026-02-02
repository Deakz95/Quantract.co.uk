# run.md — Quantract Native Apps + Platform Roadmap Execution

## Operating rules (must follow)
1. Work in STRICT stages. Do not start a later stage until the current stage is merged and verified.
2. No "big refactors". Prefer minimal diffs.
3. Every stage must end with:
   - tsc --noEmit (CRM + Expo)
   - next build (CRM)
   - Expo bundle / typecheck
   - a short verification checklist with pass/fail
4. Never leak sensitive data in logs or API responses.
5. Any new public route must be:
   - unguessable identifiers
   - rate limited
   - audited for info leaks

## Repo layout
- CRM: apps/crm
- Engineer app: apps/mobile/engineer

## How to report back to ChatGPT
At the end of every stage, reply with:
- Files created/modified
- API routes added/changed
- Schema changes + migration name
- Verification outputs (pass/fail)
- Any risks or follow-ups

Format:
- "Stage X.Y complete"
- Then bullet summary

## Current roadmap stages
### Stage A: Platform Foundations
A1. Entitlements/Paywall framework
A2. Stripe systemisation (plans + add-ons + workflow)
A3. Domain/subdomain gating bug fix

### Stage B: Documents + Storage
B1. Document model + providers (internal/BYOS)
B2. Storage usage metering + caps + billing add-on
B3. Document viewer/download + retention rules

### Stage C: QR Codes
C1. QrTag + assignments
C2. Public resolver (/q/:code) to fetch latest certificate PDF
C3. Purchase flow (Stripe product + generate printable codes)

### Stage D: PDF Templates
D1. CompanyBrand + Level 1 branding
D2. Template editor (layout) for invoices/quotes/certs
D3. Versioning + apply default per doc type

### Stage E: Receipts
E1. Receipt capture (photo + fields)
E2. Review/approval + export (CSV, bundles)

### Stage F: Checks
F1. Check templates (daily/weekly/monthly)
F2. Check entry + PDF generation + storage

### Stage G: Mobile apps
Engineer app continues:
- 4.4 Cost items
- 4.5 Certificates offline-first
- 4.6 Photos/docs offline + upload
- 4.7 Stock consume
- 4.8 Release discipline

### Stage H: AI Maintenance
H1. Ops API (safe actions)
H2. Agent integration (read-only then controlled actions)
H3. Audit log + emergency stop

## Execution instructions
- Do not proceed to a stage unless explicitly told: "Do Stage A1" etc.
- If a stage requires choices, propose the default and proceed with it.
