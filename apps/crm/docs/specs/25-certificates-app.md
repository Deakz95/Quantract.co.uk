# 25 — Certificates App (Tablet + Desktop Install, PWA)

**Status:** PROPOSED

## Intent
Turn Certificates into a standalone-grade product: issuance, amendments, QR verification, branding, and a template editor moat; usable on-site via tablet and in-office via desktop.

## Scope
- Certificates Next.js app/PWA (tablet + desktop)
- Certificate issue/edit/amend flows
- PDF generation + branding
- QR verify + revoke + public resolver experience
- Template editor + versioning
- Media embedding (photos/signatures) for final PDFs

## Out of Scope
- Dispatch and timesheets
- General CRM sales pipeline
- System admin controls

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
- [ ] `TODO: <apps/certificates>` Confirm PWA install + tablet UX pass for issue flows
- [ ] `TODO: <apps/certificates/app/templates>` Add template editor surface + versioning model
- [ ] `TODO: <apps/certificates/lib/pdf>` Ensure PDF renderer supports brand + template placement
- [ ] `TODO: <apps/crm/app/api/certs/*>` Ensure cert APIs support templateVersionId and validation
- [ ] `TODO: <apps/crm/app/q/[code]>` Branded cert viewer for public QR verification

## Acceptance Criteria
- [ ] Certs can be issued on a tablet in the field without UI friction
- [ ] Every issued cert records the template version used
- [ ] Public QR verification is rate-limited and cannot leak tenant data
- [ ] PDF output matches template preview and includes photos/signatures cleanly

## Execution Notes (for orchestrator)
- Keep Certificates isolated as its own deployable; share types via packages/shared where possible.
- Template editor should be staged: model/versioning → editor UI → validation/media.
