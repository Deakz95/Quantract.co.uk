# Stage I: Upgrade to Next.js 16 + Neon Auth (removes Better Auth)

This stage:
- Upgrades Next.js to 16.1.0 (per npm latest) and React to 19.2.0
- Removes Better Auth
- Adds Neon Auth UI routes and API handler:
  - /auth/sign-in, /auth/sign-up, /auth/sign-out
  - /account/settings, /account/security
  - /api/auth/[...path]

After unzip:
1) Delete node_modules
2) npm install
3) npx prisma migrate dev
4) npm run typecheck
5) npm run dev

Env needed:
- NEON_AUTH_BASE_URL (from Neon Console -> Auth)
- DATABASE_URL (already)
