# Quantract CRM - Auth & Tenancy Architecture

## Overview

This document describes the authentication and multi-tenancy architecture used in the Quantract CRM.

## Core Concepts

### Tenancy Model
- **Company** is the tenant container - all CRM data is scoped to a company
- **User** is the identity/auth record (can exist without company during onboarding)
- **CompanyUser** is the membership record (authoritative for company-scoped permissions)

### Roles
The system supports 5 roles with different permission levels:

| Role | Description | Capabilities |
|------|-------------|--------------|
| `admin` | Full access to company data and settings | All capabilities |
| `office` | Back-office staff | invoices.view, planner, expenses, suppliers |
| `finance` | Finance team | invoices.*, expenses, billing.view |
| `engineer` | Field engineers | Job-specific access only |
| `client` | External clients | Portal access only |

### Membership Role vs User Role
- `User.role` - stored on the User record, used for routing/initial access
- `CompanyUser.role` - stored on membership record, authoritative for company-scoped permissions
- When both exist, membership role takes precedence via `getEffectiveRole()`

## Key Auth Helpers

### `requireCompanyContext()`
**Primary helper for all CRM data routes.**

```typescript
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";

export async function GET() {
  const ctx = await requireCompanyContext();
  // ctx.companyId is guaranteed to be non-null
  // ctx.membershipRole contains the authoritative role (if membership exists)

  const effectiveRole = getEffectiveRole(ctx);
  // Use effectiveRole for permission checks
}
```

Throws:
- 401 if not authenticated
- 401 if user has no company context
- 403 if membership exists but is inactive

### `requireAuth()`
Use for routes that don't require company context (onboarding, invite flows).

```typescript
import { requireAuth } from "@/lib/serverAuth";

export async function GET() {
  const ctx = await requireAuth();
  // ctx.companyId may be null
}
```

### `requireCapability()`
Use for fine-grained permission checks.

```typescript
import { requireCapability } from "@/lib/serverAuth";

export async function POST() {
  const ctx = await requireCapability("invoices.manage");
  // User must have invoices.manage capability
}
```

### `getMembership()` / `requireMembership()`
Direct membership lookup.

```typescript
import { getMembership, requireMembership } from "@/lib/serverAuth";

// Optional lookup
const membership = await getMembership(companyId, { userId, email });

// Required lookup (throws 403 if not found/inactive)
const membership = await requireMembership(companyId, { userId, email });
```

## Migration Notes

### CompanyUser.userId FK
The `CompanyUser` table now has a `userId` foreign key linking to `User.id`:

```prisma
model CompanyUser {
  id        String   @id
  companyId String
  userId    String?  // FK to User - nullable for backwards compatibility
  email     String   // Kept for invite flows
  role      String   // Authoritative role
  isActive  Boolean  @default(true)
  // ...
}
```

Run the backfill script after migration:
```bash
npx tsx scripts/backfill-company-user-ids.ts --dry-run  # Preview
npx tsx scripts/backfill-company-user-ids.ts            # Apply
```

### Route Migration Pattern
Old pattern:
```typescript
const authCtx = await getAuthContext();
if (!authCtx) return 401;
if (authCtx.role !== "admin") return 403;
if (!authCtx.companyId) return 401;
```

New pattern:
```typescript
const ctx = await requireCompanyContext();
const effectiveRole = getEffectiveRole(ctx);
if (effectiveRole !== "admin") return 403;
```

## Security Rules

1. **Never query CRM entities without companyId filter** - all queries must include `where: { companyId: ctx.companyId }`
2. **Use requireCompanyContext() for all CRM data routes** - this ensures company context is present
3. **Check membership isActive** - inactive memberships should be denied access
4. **Use effective role for permission checks** - membership role takes precedence

## Manual QA Checklist

1. [ ] User with null companyId can access onboarding pages but cannot access CRM data routes
2. [ ] Admin user can access all company data
3. [ ] Office/finance roles pass requireRole and capabilities work as expected
4. [ ] isActive=false membership is denied access (403)
5. [ ] A user with same email across multiple roles does not cross-tenant leak data
6. [ ] Routes using requireCompanyContext() correctly reject users without company
7. [ ] The backfill script correctly links CompanyUser to User records
