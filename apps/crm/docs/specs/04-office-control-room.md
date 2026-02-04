# 04 — Office Control Room

**Status:** PROPOSED

## Intent
Create a single Office surface that ties together dispatch, approvals, compliance, and financial ops so office staff can run the business from one place.

## Scope
- CRM (new Office area under /office or /admin/office)
- Dispatch board embed/links
- Approvals inbox (timesheets, expenses, checks)
- Compliance overview (cert expiry, asset checks due)
- Exports (payroll CSV, VAT-ready exports where applicable)

## Out of Scope
- Rebuilding accounting/billing system
- Complex BI dashboards (warehouse, cube, etc.)
- Marketing analytics or website changes

## Discovery (Claude must run read-only first)
> Purpose: bind this phase to the *real app* by discovering the exact paths/components in your repo.

Run these commands (read-only):
- `git status`
- `git rev-parse --show-toplevel`
- `ls`
- `find . -maxdepth 3 -type d -name "apps" -o -name "packages"`
- `find . -maxdepth 4 -type f \( -name "package.json" -o -name "pnpm-workspace.yaml" -o -name "turbo.json" -o -name "nx.json" \) -print`
- `find . -maxdepth 5 -type f \( -name "schema.prisma" -o -name "*.sql" \) -print`
- `find . -maxdepth 6 -type f \( -iname "*schedule*" -o -iname "*dispatch*" -o -iname "*timesheet*" -o -iname "*expense*" -o -iname "*certificate*" -o -iname "*pdf*" -o -iname "*storage*" -o -iname "*ops*" \) -print | head -n 200`
- `find . -maxdepth 6 -type f \( -path "*app/api/*" -o -path "*pages/api/*" \) -print | head -n 200`

Then, based on findings, Claude must **replace TODO paths below** with the real ones.

## Deliverables
- [ ] `TODO: <path>` Create Office navigation entry and route container (decide /office vs /admin/office after discovery)
- [ ] Stage 1 — Office Dashboard shell: widgets for Dispatch, Approvals, Today’s Problems, Upcoming Compliance, Profit Leakage
- [ ] `TODO: <path>` Approvals inbox: timesheets + expenses + checks in one list with bulk actions
- [ ] Stage 2 — Timesheets approval: approve/reject + lock + export payroll CSV
- [ ] `TODO: <path>` Expenses review: approve/reject + category enforcement + export CSV for accountant
- [ ] Stage 3 — Purchasing & supplier invoices: add minimal supplier invoice capture + attachments + status (draft/approved/paid)
- [ ] `TODO: <path>` Compliance dashboard: asset checks due, cert expiry, engineer overdue checks, QR-tag exceptions
- [ ] `TODO: <path>` Alerts: define "Today’s problems" rules (overdue jobs, unscheduled emergencies, failed checks, missing photos)

## Acceptance Criteria
- [ ] Office user can complete daily workflow without navigating across multiple admin pages
- [ ] Bulk approvals work for timesheets and expenses
- [ ] Payroll export CSV generates correctly from approved timesheets
- [ ] Compliance dashboard shows due/overdue items with direct links to fix
- [ ] Profit leakage alerts surface obvious misses (unbilled completed jobs, overdue invoices, repeated no-shows if tracked)

## Execution Notes (for orchestrator)
- Keep Office UI thin: mostly aggregates existing pages and APIs first.
- Prefer server-side aggregation endpoint for Office widgets to reduce client chatter.
- If role-based access exists, ensure Office is only visible to permitted roles.
- Do not overbuild: Stage 1 should feel useful immediately.
