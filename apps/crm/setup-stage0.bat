@echo off
REM Stage 0 Local Development Setup Script (Windows)
REM This script sets up a local Docker Postgres database and applies Stage 0 migrations

echo ========================================
echo Setting up Stage 0 Local Development
echo ========================================
echo.

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo ERROR: Docker is not running
    echo Please start Docker Desktop and try again
    exit /b 1
)
echo [OK] Docker is running

REM Backup existing .env and use Docker env
if exist ".env" (
    if not exist ".env.production.backup" (
        echo.
        echo Backing up .env to .env.production.backup...
        copy .env .env.production.backup >nul
        echo [OK] Production env backed up
    )
)

REM Use Docker environment
echo.
echo Switching to Docker environment...
copy .env.docker .env >nul
echo [OK] Using .env.docker for local development

REM Start Docker Postgres
echo.
echo Starting PostgreSQL in Docker...
call npm run docker:up
echo [OK] PostgreSQL started on port 5433

REM Wait for Postgres
echo.
echo Waiting for PostgreSQL to be ready...
timeout /t 5 /nobreak >nul

:wait_postgres
docker exec quantract-dev-db pg_isready -U quantract -d quantract_dev >nul 2>&1
if errorlevel 1 (
    echo    Waiting for Postgres...
    timeout /t 2 /nobreak >nul
    goto wait_postgres
)
echo [OK] PostgreSQL is ready

REM Install dependencies
if not exist "node_modules" (
    echo.
    echo Installing dependencies...
    call npm install
    echo [OK] Dependencies installed
) else (
    echo [OK] Dependencies already installed
)

REM Generate Prisma Client
echo.
echo Generating Prisma Client...
call npx prisma generate
echo [OK] Prisma Client generated

REM Run migrations
echo.
echo Running database migrations...
call npx prisma migrate dev --name initial_with_stage0_security
echo [OK] Migrations applied

REM Seed database
echo.
echo Seeding database with test data...
call npm run prisma:seed
echo [OK] Database seeded

REM Summary
echo.
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo Test Credentials:
echo    Admin:    admin@test.com / admin123
echo    Engineer: engineer@test.com / engineer123
echo    Client:   client@test.com / client123
echo.
echo Next Steps:
echo    1. Start dev server:  npm run dev
echo    2. Visit:             http://localhost:3000/admin/login
echo    3. Open Prisma Studio: npm run prisma:studio
echo    4. Run tests:         npm run test:e2e -- e2e-rate-limiting.spec.ts
echo.
echo Database Management:
echo    View logs:    npm run docker:logs
echo    Stop DB:      npm run docker:down
echo    Reset DB:     npm run docker:reset
echo.
echo Switch Back to Production:
echo    copy .env.production.backup .env
echo.
echo Documentation:
echo    Setup guide:  SETUP_LOCAL_DEV.md
echo    Stage 0:      STAGE_0_COMPLETE.md
echo.
pause
