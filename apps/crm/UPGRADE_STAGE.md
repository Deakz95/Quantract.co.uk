# Upgrade Stage (Next 14 -> Next 15)

This stage bumps Next.js to v15.5.2 (React remains on 18.2.0 for stability).

Key changes:
- package.json: next + eslint-config-next updated
- lockfiles removed (run npm install fresh)
- critical admin API routes set to dynamic/no-store to avoid stale dashboards/planner data post-upgrade:
  - export const dynamic = "force-dynamic"
  - export const revalidate = 0

After unzip:
1) npm install
2) npm run typecheck
3) npm run dev
