# 26 — Tools App (Mobile + Tablet + Desktop Install)

**Status:** PROPOSED

## Intent
Make Tools a high-retention differentiator: fast calculators + RAMS + saved outputs, usable on mobile and tablet on-site, and on desktop for office documentation.

## Scope
- Tools surface across mobile + tablet + desktop
- Installable PWA for desktop/tablet/mobile
- Optional embed in Engineer app (deep links or webview) for field convenience
- Tool registry + saved outputs + job linking
- RAMS builder + audit trail

## Out of Scope
- Core CRM financial workflows
- Certificate issuance/template editing
- Admin system governance

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
- [ ] `TODO: <apps/tools>` Ensure mobile-responsive UI and PWA install works on iOS/Android
- [ ] `TODO: <apps/tools/app/tools/*>` Standardize tool input/output schema (ToolOutput) and persistence
- [ ] `TODO: <apps/tools/app/rams>` RAMS builder improvements + export to PDF
- [ ] `TODO: <apps/crm/prisma>` Ensure ToolOutput model links to job/client where applicable
- [ ] `TODO: <apps/mobile/engineer>` Add deep-link entry points to Tools (open tool + return to job)

## Acceptance Criteria
- [ ] Tools run comfortably on a phone (no broken layouts, fast inputs)
- [ ] Saved outputs can be linked to jobs and audited
- [ ] RAMS can be generated and exported reliably
- [ ] Tools PWA installs on desktop/tablet/mobile and works with offline shell

## Execution Notes (for orchestrator)
- Do not rebuild tools in native unless required; prefer PWA + deep links first.
- Keep tool computations deterministic and testable (unit tests where feasible).
