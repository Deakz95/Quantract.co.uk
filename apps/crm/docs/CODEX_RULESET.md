# Codex Ruleset (Permanent)

## Prime directive
- Preserve production behavior.
- Prefer additive changes over modifications.
- If uncertain: STOP and report.

## Allowed file changes
- Default: do NOT modify existing files.
- You MAY create new files only under: /tests, /docs, /scripts
- Any exception must be explicitly authorized in the task prompt.

## Forbidden
- No refactors unless explicitly requested.
- Do not touch data access (Prisma/repo layer) unless explicitly requested.
- Do not change auth flows, billing, or PDF generation unless explicitly requested.
- Do not “auto-fix” failing commands. If a command fails: STOP and report the error output.

## Commands allowed
- npm run typecheck
- npm run build
- npm run test:pw

## Test creation guidelines
- Put Playwright tests under /tests/playwright
- Prefer stable selectors (role/text/label) over CSS classes
- Avoid relying on seeded emails unless explicit test env supports it
- Ensure tests can run headless in CI

## Reporting format
When finished, output:
- Summary (what changed)
- Testing (commands run + pass/fail)
- Files changed (list)
- Notes / Risks (anything that might break)
