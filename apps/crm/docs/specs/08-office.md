# 08 — Office

**Status:** DONE

## Intent
Speed up scheduling, quoting, invoicing, and bookkeeping flows for office staff.

## Scope
- Scheduler
- Quotes/invoices
- Receipts groundwork (if exists)

## Out of Scope
- Full accounting integration redesign

## Deliverables
- [x] `apps/crm/app/api/admin/jobs/bulk-update/route.ts` Bulk actions: assign engineer, change status (via BulkActionBar)
- [x] `apps/crm/app/admin/invoices/page.tsx` Invoice reminders — Chase Overdue button calling `/api/admin/invoices/auto-chase/run`
- [x] `apps/crm/app/admin/expenses/page.tsx` Receipt capture with category selector (10 preset categories)

## Acceptance Criteria
- [x] Bulk ops reduce repeated clicks
- [x] Reminders are configurable and logged (via InvoiceChase model)
- [x] Receipts are searchable + exportable (export endpoint with category filter exists)

## Execution Notes (for orchestrator)
- Claude should not create new folders for these docs.
- If a deliverable is not applicable after discovery, mark it as **N/A** and explain why.
- Prefer thin wrappers and minimal diffs where possible.
