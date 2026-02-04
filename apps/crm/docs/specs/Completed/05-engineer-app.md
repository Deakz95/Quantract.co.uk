# 05 — Engineer App

**Status:** IN_PROGRESS

## Intent
Field-first workflows: offline tolerance, fast job execution, cert issuance and photo capture.

## Scope
- Engineer mobile app
- Sync + caching
- Job tools

## Out of Scope
- Native rewrite
- Complex conflict resolution v2

## Discovery (Claude must run read-only first)
> Purpose: bind this phase to the *real app* by discovering the exact paths/components in your repo.

Run these commands (read-only):
- `git status`
- `git rev-parse --show-toplevel`
- `ls`
- `find . -maxdepth 3 -type d -name "apps" -o -name "packages"`
- `find . -maxdepth 4 -type f \( -name "package.json" -o -name "pnpm-workspace.yaml" -o -name "turbo.json" -o -name "nx.json" \) -print`
- `find . -maxdepth 5 -type f \( -name "schema.prisma" -o -name "*.sql" \) -print`
- `find . -maxdepth 6 -type f \( -iname "*entitle*" -o -iname "*plan*" -o -iname "*feature*flag*" -o -iname "*domain*" \) -print`
- `find . -maxdepth 6 -type f \( -path "*app/api/*" -o -path "*pages/api/*" \) -print | head -n 200`

Then, based on findings, Claude must **replace TODO paths below** with the real ones.

## Deliverables
- [x] `apps/mobile/engineer/src/api/jobsCache.ts`, `apps/mobile/engineer/src/api/jobDetailCache.ts`, `apps/mobile/engineer/src/screens/JobsScreen.tsx`, `apps/mobile/engineer/src/screens/TodayScreen.tsx`, `apps/mobile/engineer/src/screens/JobDetailScreen.tsx` — Offline-safe job list + detail caching
- [x] `apps/mobile/engineer/src/offline/outbox.ts`, `apps/mobile/engineer/src/offline/OutboxContext.tsx` — Sync queue with retries + conflict strategy notes
- [x] `apps/mobile/engineer/src/screens/ScanCertScreen.tsx`, `apps/mobile/engineer/src/navigation/BottomTabs.tsx` — In-app QR scan/link to certificates
- [x] `apps/mobile/engineer/src/components/PhotoCapture.tsx`, `apps/crm/app/api/engineer/certificates/[certificateId]/attachments/route.ts`, `apps/crm/app/api/engineer/jobs/[jobId]/photos/route.ts` — Photo capture attachments per job/cert with size limits

## Acceptance Criteria
- [ ] Engineer can open today's jobs without network after initial sync
- [ ] Queued actions retry safely and surface errors
- [ ] QR scan links to a cert PDF reliably

## Execution Notes (for orchestrator)
- Claude should not create new folders for these docs.
- If a deliverable is not applicable after discovery, mark it as **N/A** and explain why.
- Prefer thin wrappers and minimal diffs where possible.
