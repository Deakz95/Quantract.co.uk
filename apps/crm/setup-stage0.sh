#!/bin/bash

# Stage 0 Local Development Setup Script
# This script sets up a local Docker Postgres database and applies Stage 0 migrations

set -e  # Exit on error

echo "🚀 Setting up Stage 0 Local Development Environment"
echo "=================================================="
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop and try again."
    exit 1
fi
echo "✅ Docker is running"

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "📝 Creating .env.local from example..."
    cp .env.local.example .env.local
    echo "✅ Created .env.local"
    echo "⚠️  Please review .env.local and update if needed (especially RESEND_API_KEY for email testing)"
else
    echo "✅ .env.local already exists"
fi

# Start Docker Postgres
echo ""
echo "🐘 Starting PostgreSQL in Docker..."
npm run docker:up
echo "✅ PostgreSQL started on port 5433"

# Wait for Postgres to be ready
echo ""
echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 5

# Check if Postgres is healthy
until docker exec quantract-dev-db pg_isready -U quantract -d quantract_dev > /dev/null 2>&1; do
    echo "   Waiting for Postgres..."
    sleep 2
done
echo "✅ PostgreSQL is ready"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo ""
    echo "📦 Installing dependencies..."
    npm install
    echo "✅ Dependencies installed"
else
    echo "✅ Dependencies already installed"
fi

# Generate Prisma Client
echo ""
echo "🔧 Generating Prisma Client..."
npx prisma generate
echo "✅ Prisma Client generated"

# Run migrations
echo ""
echo "🗄️  Running database migrations (creates all tables + Stage 0 security)..."
npx prisma migrate dev --name initial_with_stage0_security
echo "✅ Migrations applied"

# Seed database
echo ""
echo "🌱 Seeding database with test data..."
npm run prisma:seed
echo "✅ Database seeded"

# Summary
echo ""
echo "=================================================="
echo "✅ Setup Complete!"
echo "=================================================="
echo ""
echo "📝 Test Credentials:"
echo "   Admin:    admin@test.com / admin123"
echo "   Engineer: engineer@test.com / engineer123"
echo "   Client:   client@test.com / client123"
echo ""
echo "🌐 Next Steps:"
echo "   1. Start dev server:  npm run dev"
echo "   2. Visit:             http://localhost:3000/admin/login"
echo "   3. Open Prisma Studio: npm run prisma:studio"
echo "   4. Run tests:         npm run test:e2e -- e2e-rate-limiting.spec.ts"
echo ""
echo "📊 Database Management:"
echo "   View logs:    npm run docker:logs"
echo "   Stop DB:      npm run docker:down"
echo "   Reset DB:     npm run docker:reset"
echo ""
echo "📖 Documentation:"
echo "   Setup guide:  ./SETUP_LOCAL_DEV.md"
echo "   Stage 0:      ./STAGE_0_COMPLETE.md"
echo ""
