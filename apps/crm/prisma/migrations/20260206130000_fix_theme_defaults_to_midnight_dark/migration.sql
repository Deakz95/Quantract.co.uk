-- Fix theme defaults: old defaults were light-mode colors, causing white backgrounds
-- Update companies still using the old light defaults to Midnight Dark theme

-- Fix background: #f8fafc (light gray) → #0f1115 (midnight dark)
UPDATE "Company" SET "themeBg" = '#0f1115' WHERE "themeBg" = '#f8fafc';

-- Fix primary: #0f172a (slate-900) → #6366f1 (indigo)
UPDATE "Company" SET "themePrimary" = '#6366f1' WHERE "themePrimary" = '#0f172a';

-- Fix accent: #16a34a (green-600) → #22d3ee (cyan)
UPDATE "Company" SET "themeAccent" = '#22d3ee' WHERE "themeAccent" = '#16a34a';

-- Fix text: #0f172a (dark) → #f8fafc (light) for dark backgrounds
UPDATE "Company" SET "themeText" = '#f8fafc' WHERE "themeText" = '#0f172a';

-- Also fix the schema defaults for new companies
ALTER TABLE "Company" ALTER COLUMN "themePrimary" SET DEFAULT '#6366f1';
ALTER TABLE "Company" ALTER COLUMN "themeAccent" SET DEFAULT '#22d3ee';
ALTER TABLE "Company" ALTER COLUMN "themeBg" SET DEFAULT '#0f1115';
ALTER TABLE "Company" ALTER COLUMN "themeText" SET DEFAULT '#f8fafc';
