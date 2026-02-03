\# Quantract Product Spec (Source of Truth)



\## Core flows

\### QR Certificates

\- QR codes (sticky/printable) can be purchased

\- Engineer scans/takes photo of QR and assigns certificate to QR

\- Public scan resolves to latest certificate PDF



\### Documents \& Storage

\- Certificates, photos, docs stored internally by default

\- Paid storage caps by plan (profitable per month)

\- Optional BYOS storage: link to customer storage (e.g. Google Drive / external URL provider) instead of us hosting



\### PDFs Customisation

\- All PDFs (quotes, invoices, certificates, etc.) must be company-brandable

\- Admin/Office can customise: logo, colours, header/footer text, layout positions, images

\- Company defaults per document type; permissioned editing (admin assigns editor)



\### Billing + Paywall

\- Stripe plans everywhere (Free/Pro/Pro+/Enterprise)

\- Add-ons (storage, QR packs, AI maintenance, etc.)

\- Paywall/guard features; UI shows “locked/purchase” tag



\### Domain gating bug

\- Free users should not see domain entry

\- Pro custom domain upsell section should disappear once Pro+ active

\- Enterprise (your company) must not be blocked



\### Receipts

\- Engineer can add receipts (fuel/office/clothes)

\- Categorised; stored as documents; exportable for accountant



\### Checks

\- Vehicle checks daily/weekly/monthly

\- Ladder/scaffold checks

\- Logged, PDF generated, view/download, stored



\## Non-negotiables

\- Strict staged delivery

\- No big refactors

\- End each stage with build/typecheck verification

\- Public routes must be unguessable + rate limited + audited



