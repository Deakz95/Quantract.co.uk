# 21 — Client App (Mobile + Tablet + Desktop Install, PWA)

**Status:** PROPOSED

## Intent
Deliver a client-facing portal that works on phone/tablet/desktop, supports magic-link read access, and provides a professional experience for viewing jobs, documents, and certificates.

## Scope
- Client PWA (installable) — mobile + tablet + desktop
- Read-only magic-link access for viewing documents/certs
- Optional full login for write actions (if any)
- Certificate viewing/download + QR verification flow
- Job timeline and appointment updates

## Out of Scope
- Admin controls, dispatch management, internal-only notes
- Editing certificates or back-office financial workflows
- Complex messaging system (keep it minimal initially)

## Discovery (Claude must run read-only first)
> Purpose: bind this phase to the *real app* by discovering the exact paths/components in your repo.

Run these commands (read-only):
- `git status`
- `git rev-parse --show-toplevel`
- `ls`
- `find . -maxdepth 3 -type d -name "apps" -o -name "packages"`
- `find . -maxdepth 4 -type f \( -name "package.json" -o -name "pnpm-workspace.yaml" -o -name "turbo.json" -o -name "nx.json" \) -print`
- `find . -maxdepth 5 -type f \( -name "schema.prisma" -o -name "*.sql" \) -print`
- `find . -maxdepth 6 -type f \( -iname "*engineer*" -o -iname "*client*" -o -iname "*office*" -o -iname "*admin*" -o -iname "*cert*" -o -iname "*tool*" -o -iname "*schedule*" \) -print | head -n 200`
- `find . -maxdepth 6 -type f \( -path "*app/api/*" -o -path "*pages/api/*" \) -print | head -n 200`

Then, based on findings, Claude must **replace TODO paths below** with the real ones.


## Deliverables
- [ ] `TODO: <apps/crm/app/(client|portal)>` Implement magic-link read-only client session for portal routes
- [ ] `TODO: <apps/crm/app/api/client/*>` Add endpoints: list jobs, job timeline, download cert PDFs, list documents
- [ ] `TODO: <apps/crm/app/q/[code]>` Ensure public QR resolver routes can deep-link into client portal view
- [ ] `TODO: <apps/crm>` Add PWA install + offline skeleton for client portal (cache shell + last-viewed docs list)
- [ ] `TODO: <apps/crm>` Add branded viewer for certificates and documents in client portal

## Acceptance Criteria
- [ ] Client can open a magic link and view certificate PDF without creating an account
- [ ] Desktop-only clients can install as PWA and use portal reliably
- [ ] All client endpoints are read-only under magic-link and cannot mutate data
- [ ] Certificate download and QR verify flow works end-to-end

## Execution Notes (for orchestrator)
- Keep the client portal as a separate route group/surface; do not merge with admin UI components.
- Magic-link must have expiry + revocation and be scoped to tenant + client.
- Add rate limiting to public/magic-link endpoints.
