# 10 — Tools

**Status:** IMPLEMENTED

## Intent
Make trade tools first-class, fast, and trustworthy (RAMS, calculators, checklists).

## Scope
- Tools pages
- Mobile tool access
- Saved outputs

## Out of Scope
- Building new calculators from scratch

## Deliverables
- [x] `apps/crm/app/api/tools/outputs/route.ts` + `[id]/route.ts` — Persist tool outputs to job/client/certificate
- [x] `apps/crm/app/api/admin/scheduled-checks/route.ts` + `[id]/route.ts` — Scheduled checks (van/ladder/scaffold)
- [x] `apps/crm/app/api/admin/rams/route.ts` + `[id]/route.ts` + `[id]/issue/route.ts` — RAMS audit trail
- [x] `apps/crm/src/lib/auditLabels.ts` — Audit labels for all tool actions

## Schema Changes
- `ToolOutput` model — persists calculator inputs + outputs with optional job/client/certificate FKs
- `ScheduledCheck` + `ScheduledCheckItem` models — recurring inspection tracking
- `ChecklistTemplate` extended with `recurrenceType`, `recurrenceDay`, `assignToRole`
- Migrations: `20260204900000_add_tool_output`, `20260205000000_add_scheduled_checks`

## Default Check Templates
Admins can create recurring check templates via the existing ChecklistTemplate admin UI:
- **Daily Van Check** — `recurrenceType: "daily"`, items: tyre check, lights, first aid kit, fire extinguisher, PPE
- **Weekly Ladder Inspection** — `recurrenceType: "weekly"`, `recurrenceDay: 0` (Monday), items: stiles, rungs, feet, locking mechanism
- **Monthly Scaffold Inspection** — `recurrenceType: "monthly"`, `recurrenceDay: 1`, items: base plates, standards, ledgers, bracing, ties, toe boards

## Bug Fix
- Fixed `checklistGating.ts:overrideJobCompletionGating` — was using non-existent AuditEvent fields (`userId`, `metadata`, `ipAddress`, `userAgent`). Corrected to canonical pattern (`actorRole`, `actor`, `meta`).

## Acceptance Criteria
- [x] Tool outputs can be attached to jobs/certs (via ToolOutput API with jobId/clientId/certificateId)
- [x] Checks are scheduled and trackable (ScheduledCheck model + admin page)
- [x] Audit trail exists for compliance evidence (RAMS CRUD + tool output + scheduled check events)

## Execution Notes (for orchestrator)
- No new folders for docs.
- Default check templates are documented above for admin creation rather than runtime seeding (avoids duplicate creation risk).
