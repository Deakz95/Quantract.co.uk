-- This script resolves the failed migration by removing the failed entry from _prisma_migrations
-- Run this manually against your database if the migration fails

DELETE FROM "_prisma_migrations" WHERE "migration_name" = 'add_quote_templates';
