#!/bin/bash
set -e

echo "=== Testing Yocto Builder Setup ==="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "ERROR: Must run from project root"
    exit 1
fi

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js not found"
    exit 1
fi
echo "✓ Node.js: $(node -v)"

# Check npm
if ! command -v npm &> /dev/null; then
    echo "ERROR: npm not found"
    exit 1
fi
echo "✓ npm: $(npm -v)"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi
echo "✓ Dependencies installed"

# Check Prisma
if ! command -v npx &> /dev/null; then
    echo "ERROR: npx not found"
    exit 1
fi

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate || {
    echo "WARNING: Prisma generate failed (database may not be set up)"
}

echo "=== Setup test complete ==="

