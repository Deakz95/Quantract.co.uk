# Database Infrastructure

## Neon Postgres Setup

Quantract uses Neon Postgres as the database provider.

### Connection Strings

Each app that requires a database should use two connection strings:

1. **DATABASE_URL** (pooled) - For runtime queries via PgBouncer
   ```
   postgresql://USER:PASS@HOST-pooler.eu-west-2.aws.neon.tech/DB?sslmode=require&pgbouncer=true&connection_limit=1
   ```

2. **DIRECT_URL** (direct) - For migrations and DDL operations
   ```
   postgresql://USER:PASS@HOST.eu-west-2.aws.neon.tech/DB?sslmode=require
   ```

### Apps with Database

Currently only `apps/crm` uses a database. The Prisma schema is located at:
- `apps/crm/prisma/schema.prisma`

### Running Migrations

```bash
cd apps/crm
npm run prisma:migrate:deploy  # Production
npm run prisma:migrate:dev     # Development
```

### Opening Prisma Studio

```bash
cd apps/crm
npm run prisma:studio
```
