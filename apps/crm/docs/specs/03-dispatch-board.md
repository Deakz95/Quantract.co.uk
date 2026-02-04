# 03 — Dispatch Board (Ultimate Scheduling Core)

**Status:** PROPOSED

## Intent
Turn the current schedule calendar into a dispatch-grade board (lanes, queue, rules) that becomes the operational heart of Quantract.

## Scope
- CRM (admin schedule)
- Schedule + Job domain (API + DB rules)
- Engineer mobile (Today list + status updates)
- Optional notifications plumbing (SMS/email hooks or internal events)

## Out of Scope
- External calendar sync (Google/Outlook)
- AI auto-optimised routing/planning (v2)
- Major redesign of unrelated CRM modules

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
- [ ] `TODO: <path>` Identify current schedule board route(s) and components (e.g. /admin/schedule) and document them in this spec
- [ ] Stage 1 — Board UX foundation: lane-based view, drag/drop reschedule, resize duration (admin)
- [ ] `TODO: <path>` API: add PUT/PATCH to update ScheduleEntry time/engineer (idempotent) + improved clash checks
- [ ] Stage 2 — Unassigned queue: list jobs needing booking + drag onto board
- [ ] `TODO: <path>` Data/query: define "unassigned" as Jobs with no ScheduleEntry in range (or explicit flag if needed)
- [ ] Stage 3 — Capacity & rules: working hours, breaks, max jobs/day, travel buffer; hard-block invalid drops
- [ ] `TODO: <path>` Data model: store engineer working hours + optional travel buffer in DB (or company settings)
- [ ] Stage 4 — Field workflow: engineer app gets "Today" schedule, offline-safe status changes (Scheduled→Completed)
- [ ] `TODO: <path>` API: endpoints for engineer to fetch assigned schedule + post status timeline events
- [ ] Stage 5 — Recurring & templates: recurring bookings + copy last week + crew templates
- [ ] `TODO: <path>` Add minimal recurring rule representation (RRULE-like or simple weekly/monthly pattern)
- [ ] `TODO: <path>` Add filters: status, trade/skill, postcode, client, emergency

## Acceptance Criteria
- [ ] Dispatcher can schedule/reschedule by drag/drop without opening a job page
- [ ] Duration changes (resize) persist and reflect in UI immediately
- [ ] Clashes are prevented (hard-block) and clearly communicated
- [ ] Engineer mobile shows an accurate "Today" list and supports offline status updates
- [ ] Unassigned jobs can be scheduled onto the board
- [ ] Recurring/template scheduling reduces weekly admin time significantly (copy week works)

## Execution Notes (for orchestrator)
- Claude should not create new folders for these docs.
- Implement in small diffs: Stage 1 first, ship, then iterate.
- If drag/drop is complex, start with server-safe PATCH + optimistic UI, then enhance.
- If a deliverable is not applicable after discovery, mark it as **N/A** and explain why.
- Prefer feature-flagging new board view so you can fall back quickly.
