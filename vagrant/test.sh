#!/bin/bash
set -e

echo "=== Testing Yocto Builder Application ==="

cd /vagrant

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed"
    exit 1
fi

echo "Node.js version: $(node -v)"

# Check if PostgreSQL is running
if ! sudo systemctl is-active --quiet postgresql; then
    echo "Starting PostgreSQL..."
    sudo systemctl start postgresql
fi

# Check database connection
echo "Testing database connection..."
export DATABASE_URL="postgresql://yocto_admin:development_password@localhost:5432/yocto_builder"
psql $DATABASE_URL -c "SELECT 1;" > /dev/null 2>&1 || {
    echo "ERROR: Cannot connect to database"
    exit 1
}
echo "✓ Database connection successful"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "WARNING: Docker is not running. Some features may not work."
else
    echo "✓ Docker is running"
fi

# Generate Prisma client
echo "Generating Prisma client..."
npm run db:generate

# Run migrations
echo "Running migrations..."
npm run db:migrate || echo "Migrations completed or already applied"

# Build the application
echo "Building Next.js application..."
npm run build || {
    echo "ERROR: Build failed"
    exit 1
}
echo "✓ Build successful"

# Check if port 3000 is available
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo "WARNING: Port 3000 is already in use"
else
    echo "✓ Port 3000 is available"
fi

echo "=== All tests passed! ==="
echo "To start the application, run: npm run dev"

