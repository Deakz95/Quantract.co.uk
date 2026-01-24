# Magic-link email login (with optional password)

## Env vars
- DATABASE_URL=...
- RESEND_API_KEY=...
- RESEND_FROM="Quantract <no-reply@yourdomain.com>"
- NEXT_PUBLIC_APP_URL="https://your-domain.com"   (recommended)
- ADMIN_EMAIL="you@yourcompany.com"               (optional bootstrap)

## Migrate
npx prisma migrate dev --name auth_magic_link
npx prisma generate

## How it works
- Login pages send POST /api/auth/magic-link/request (always returns ok to avoid user enumeration).
- Email contains a short-lived link to /api/auth/magic-link/verify?token=...
- Verify sets:
  - qt_session_v1 = role:<role>  (used by middleware for routing)
  - qt_sid_v1 = <session id>     (used by server APIs for real auth)

Optional password:
- Invite registration pages include an optional password field.
- Password login uses POST /api/auth/password/login.
