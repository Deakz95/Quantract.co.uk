# Backup & Restore Procedure

## Neon Automatic Backups

Neon provides automatic backups for all projects:

- **Point-in-time recovery (PITR)** — restore to any point within the retention window
- **Retention** — depends on Neon plan (Free: 7 days, Pro: 30 days)
- **Branching** — create a branch from any point in time for safe verification

## Restore Steps

### 1. Create a branch from a point in time

```bash
# Via Neon Console or CLI
neonctl branches create \
  --project-id $NEON_PROJECT_ID \
  --name restore-drill-$(date +%Y%m%d) \
  --parent-timestamp "2026-02-01T12:00:00Z"
```

### 2. Verify the branch

Connect to the new branch and verify data integrity:

```bash
# Get connection string from Neon Console for the new branch
psql $RESTORE_BRANCH_URL -c "SELECT COUNT(*) FROM \"Company\";"
psql $RESTORE_BRANCH_URL -c "SELECT COUNT(*) FROM \"Job\";"
psql $RESTORE_BRANCH_URL -c "SELECT MAX(\"createdAt\") FROM \"Invoice\";"
```

### 3. Promote (if restoring to production)

- In Neon Console: set the restore branch as the primary branch
- Update the CRM service to use the new branch connection string
- Verify `/api/health` returns healthy
- Run staging smoke tests against the restored DB

### 4. Clean up

Delete the temporary branch if it was only a drill:

```bash
neonctl branches delete --project-id $NEON_PROJECT_ID --name restore-drill-YYYYMMDD
```

## Restore Drill Log

| Date | Operator | Target Time | Result | Notes |
|------|----------|-------------|--------|-------|
| _TBD_ | _name_ | _timestamp_ | _pass/fail_ | _first drill_ |
