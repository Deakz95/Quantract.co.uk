```approval
status: APPROVE
approved_by: "ChatGPT"
approved_at: "2026-02-02"
scope: stage-a1
final_commands:
  - "git status"
  - "pnpm -r -w lint || true"
  - "pnpm -C apps/crm tsc --noEmit"
  - "pnpm -C apps/crm next build"
  - "pnpm -C apps/mobile/engineer tsc --noEmit"
  - "pnpm -C apps/mobile/engineer expo export --platform ios --dev false || true"
notes: "Implement entitlements framework + GET /api/entitlements/me (company-aware) + minimal CRM/mobile guards + a single non-critical paywalled feature. No Stripe wiring."
```
