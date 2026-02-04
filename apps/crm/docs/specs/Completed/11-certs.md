# 11 — Certificates

**Status:** COMPLETED

## Intent
End-to-end cert lifecycle with QR linking, amendments, distribution, and reporting.

## Scope
- Cert issuance
- QR linking
- PDF storage/access
- Amendments

## Out of Scope
- New certificate types expansion

## Discovery Summary
Certificate system discovered at:
- **Prisma models:** `Certificate`, `CertificateRevision`, `CertificateObservation`, `CertificateChecklist`, `CertificateSignatureRecord`, `CertificateAttachment`, `CertificateTestResult`, `QrTag`, `QrAssignment`
- **Server library:** `apps/crm/src/lib/server/certs/` (issue.ts, amend.ts, canonical.ts, types.ts, rules.ts, analytics.ts, checklists.ts, export.ts)
- **PDF generation:** `apps/crm/src/lib/server/pdf.ts`
- **QR system:** `apps/crm/app/api/admin/qr-tags/`, `apps/crm/app/api/engineer/qr-tags/assign/`, `apps/crm/app/q/[code]/page.tsx`
- **Admin UI:** `apps/crm/app/admin/qr-tags/page.tsx`, `apps/crm/app/admin/qr-tags/print/page.tsx`
- **Certificate admin:** `apps/crm/src/components/admin/certificates/CertificatesPageClient.tsx`
- **Dashboard insights:** `apps/crm/src/components/admin/dashboard/` (16 widgets, all real data)
- **Entitlements:** `module_certificates`, `limit_certificates_per_month` in `apps/crm/src/lib/entitlements.ts`

## Deliverables
- [x] `apps/crm/app/api/engineer/qr-tags/assign/route.ts`, `apps/crm/app/admin/qr-tags/page.tsx`, `apps/crm/app/admin/qr-tags/print/page.tsx` — QR code linking flow (printable + in-app scan). Pre-existing system enhanced with cert status validation, revoke endpoint, and print status filter.
- [x] `apps/crm/app/api/client/certificates/[certificateId]/pdf/route.ts`, `apps/crm/app/q/[code]/page.tsx`, `apps/crm/app/api/documents/[token]/route.ts` — Certificate PDF access control + share links. **Already complete** — three access pathways (admin direct, client portal with email check, public QR with signed URLs).
- [x] `apps/crm/src/lib/server/certs/amend.ts`, `apps/crm/src/lib/server/certs/issue.ts`, `apps/crm/src/lib/server/repo.ts` — Amendment workflow + audit. Enhanced with distinct amendment_created/amendment_issued/amendment_voided audit events.
- [x] **N/A** — Insights widget uses real tenant data. **Already complete** — all 16 dashboard widgets use real database queries via `apps/crm/src/lib/server/certs/analytics.ts`. No demo data found.

## Acceptance Criteria
- [x] Scanning QR loads the correct cert PDF and is permission-safe — QR assignment now validates cert status=issued and pdfKey exists before assignment
- [x] Amendments are tracked and immutable history preserved — amendment_created, amendment_issued, amendment_voided audit events now tracked separately
- [x] Insights reflect tenant data with safe aggregation — already using real tenant data with companyId scoping

## Changes Made
1. **QR Assignment Validation** (`apps/crm/app/api/engineer/qr-tags/assign/route.ts`): Added pre-flight validation ensuring certificate has `status=issued` and a valid `pdfKey` before QR assignment. Returns clear 422 error with reason and certificateId.
2. **QR Tag Revoke Endpoint** (`apps/crm/app/api/admin/qr-tags/[tagId]/revoke/route.ts`): New admin-only POST endpoint for soft-revoking QR tags. Sets status to "revoked" (preserves assignment for audit trail) with audit event.
3. **QR Admin UI Revoke Button** (`apps/crm/app/admin/qr-tags/page.tsx`): Added "Revoke" action button per assigned tag row with confirmation dialog.
4. **Print Page Status Filter** (`apps/crm/app/admin/qr-tags/print/page.tsx`): Added status filter (Available/Assigned/All) so admins can reprint tags after assignment.
5. **Amendment Audit Events** (`apps/crm/src/lib/server/certs/issue.ts`, `apps/crm/src/lib/server/repo.ts`): Distinguished amendment issuance (`certificate.amendment_issued`) and amendment voiding (`certificate.amendment_voided`) from standard certificate lifecycle events.
6. **QR Assignment Audit Event** (`apps/crm/app/api/engineer/qr-tags/assign/route.ts`): Added `qr_tag.assigned` audit event for compliance traceability.
7. **Audit Labels** (`apps/crm/src/lib/auditLabels.ts`): Added human-readable labels for `certificate.amendment_issued`, `certificate.amendment_voided`, `qr_tag.assigned`, `qr_tag.revoked`.

## Execution Notes (for orchestrator)
- No new folders were created for docs.
- Deliverable 4 (Insights) marked as N/A — already complete with real tenant data.
- All changes are thin wrappers with minimal diffs as requested.
