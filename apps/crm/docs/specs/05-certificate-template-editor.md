# 05 — Certificate Template Editor (Moat Feature)

**Status:** PROPOSED

## Intent
Deliver a visual PDF template editor so each company can make certificates look like their legacy pads; add versioning so issued certs are reproducible.

## Scope
- Certificates app
- PDF generation pipeline
- Branding (CompanyBrand) integration
- Template versioning + preview

## Out of Scope
- Rewrite the PDF renderer from scratch
- Non-certificate document templates (quotes/invoices) unless already aligned
- Advanced WYSIWYG beyond required fields

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
- [ ] `TODO: <path>` Identify current PDF render entrypoint(s) for cert generation (server and client)
- [ ] Stage 1 — Data model: CertificateTemplate + TemplateVersion; store templateVersionId on issued certificates
- [ ] `TODO: <path>` Migration: add template tables + backfill default template for existing tenants
- [ ] Stage 2 — Visual editor UI: drag/drop fields, set fonts, margins, logo position; save template version
- [ ] `TODO: <path>` Preview: server endpoint renders preview PDF for a template version and sample data
- [ ] Stage 3 — Validation rules per cert type: required fields, formatting constraints, signature/photo blocks
- [ ] `TODO: <path>` Embed media: engineer signature + photos placed consistently in output
- [ ] `TODO: <path>` Audit: record template changes and which template version was used to issue each cert

## Acceptance Criteria
- [ ] Company can create/edit templates without code changes
- [ ] Issued certificates permanently reference the exact template version used
- [ ] Preview shows accurate PDF before issuing
- [ ] Invalid certificates cannot be issued when required fields missing
- [ ] Signature/photos render reliably across devices and printers

## Execution Notes (for orchestrator)
- Start with a minimal editor (positioning + fonts) before advanced features.
- Store template layout as JSON with schema validation (avoid arbitrary HTML).
- Keep versioning immutable: edits create new versions; old certs remain reproducible.
- If already using a PDF library, reuse it; avoid multi-library complexity.
