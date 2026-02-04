# 09 — Staff

**Status:** IMPLEMENTED

## Intent
Internal staff management: roles, permissions, activity logs, and accountability.

## Scope
- Roles/permissions
- Timesheets
- Activity logging

## Out of Scope
- Payroll/HR suite

## Deliverables
- [x] `apps/crm/src/lib/permissions.ts` — Role presets (Engineer, Office, Finance, Admin) with explainable capability matrix via `ROLE_PRESETS` and `CAPABILITY_LABELS`
- [x] `apps/crm/app/admin/users/page.tsx` — Role preset selector cards on the Users admin page that auto-populate capability checkboxes
- [x] `apps/crm/app/api/admin/staff/[userId]/activity/route.ts` — Activity feed API per staff member (jobs touched, certs issued, time logged) with IDOR protection
- [x] `apps/crm/src/components/admin/engineers/EngineersPageClient.tsx` — Activity feed section with filter chips (All, Jobs, Certs, Time) on engineer detail panel
- [x] `apps/crm/app/engineer/timesheets/timesheetsClient.tsx` — Timesheet UX improvements: Full Day / Half Day / Copy Yesterday quick-entry presets, auto-select first job, hours column
- [x] `apps/crm/app/admin/timesheets/page.tsx` — Admin timesheet review: status filter tabs (All/Submitted/Approved/Rejected), engineer names, total hours column, bulk approve

## Acceptance Criteria
- [x] Role presets map to real permissions and are explainable — `ROLE_PRESETS` provides label, description, and capability list for each role; Users page renders clickable preset cards
- [x] Activity feed loads fast and is filterable — paginated API with take/skip limits, filter by type (all/jobs/certs/timesheets), indexed queries on companyId/actor/engineerId
- [x] Timesheets can be completed in under 60 seconds per day entry — Full Day preset fills 08:00–16:30 with 30min break in one click; Copy Yesterday duplicates prior day; auto-selects first job

## Files Changed
- `apps/crm/src/lib/permissions.ts` — Added `ROLE_PRESETS`, `CAPABILITY_LABELS`; derived `ROLE_DEFAULTS` from presets for backwards compatibility
- `apps/crm/app/admin/users/page.tsx` — Added role preset selector cards above the capabilities grid
- `apps/crm/app/api/admin/staff/[userId]/activity/route.ts` — **NEW** — Staff activity feed API with admin/office auth, IDOR protection, paginated results
- `apps/crm/src/components/admin/engineers/EngineersPageClient.tsx` — Added Activity card with filter chips and scrollable feed
- `apps/crm/app/engineer/timesheets/timesheetsClient.tsx` — Added quick-entry presets, auto-select job, hours column
- `apps/crm/app/admin/timesheets/page.tsx` — Added status filter tabs, engineer name display, hours column, bulk approve
- `apps/crm/app/api/admin/timesheets/route.ts` — Added `timeEntries` include for hours computation

## Execution Notes
- No new Prisma models or migrations needed — all data models were already in place.
- The activity feed API reuses `formatAuditDescription` and `formatAction` from `auditLabels.ts` for consistent labelling.
- `ROLE_DEFAULTS` is now derived from `ROLE_PRESETS` to avoid duplication while maintaining backward compatibility for all existing `hasCapability()` callers.
