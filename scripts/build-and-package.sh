#!/bin/bash
set -e

# ============================================
# Yocto Builder - Local Build and Package Script
# ============================================
# This script builds the Next.js application locally and creates
# a deployment tarball that can be uploaded to the server.
#
# Usage:
#   ./scripts/build-and-package.sh
# ============================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BUILD_DIR=".build"
TARBALL_NAME="yocto-builder-deploy.tar.gz"

echo -e "${GREEN}==========================================${NC}"
echo -e "${GREEN}Building Yocto Builder for Deployment${NC}"
echo -e "${GREEN}==========================================${NC}"

# Step 1: Clean previous build
echo -e "${YELLOW}Cleaning previous build...${NC}"
rm -rf "$BUILD_DIR"
rm -f "$TARBALL_NAME"
rm -rf .next

# Step 2: Install dependencies (production only for smaller package)
echo -e "${YELLOW}Installing dependencies...${NC}"
npm ci --production=false

# Step 3: Generate Prisma client
echo -e "${YELLOW}Generating Prisma client...${NC}"
npm run db:generate

# Step 4: Build Next.js application
echo -e "${YELLOW}Building Next.js application...${NC}"
NODE_ENV=production npm run build

if [ ! -d ".next" ]; then
    echo -e "${RED}Error: Build failed - .next directory not found${NC}"
    exit 1
fi

# Step 5: Create build directory structure
echo -e "${YELLOW}Creating deployment package...${NC}"
mkdir -p "$BUILD_DIR"

# Copy essential files and directories
echo -e "${YELLOW}Copying application files...${NC}"

# Core application files
cp -r .next "$BUILD_DIR/"
cp -r public "$BUILD_DIR/" 2>/dev/null || true
cp -r prisma "$BUILD_DIR/"
cp package.json "$BUILD_DIR/"
cp package-lock.json "$BUILD_DIR/" 2>/dev/null || true
cp next.config.ts "$BUILD_DIR/" 2>/dev/null || true
cp tsconfig.json "$BUILD_DIR/" 2>/dev/null || true

# Copy source files needed for server-side rendering
if [ -d "src" ]; then
    cp -r src "$BUILD_DIR/"
fi

# Copy any other required files
if [ -f "tailwind.config.ts" ]; then
    cp tailwind.config.ts "$BUILD_DIR/"
fi
if [ -f "postcss.config.js" ]; then
    cp postcss.config.js "$BUILD_DIR/"
fi

# Step 6: Install production dependencies in build directory
echo -e "${YELLOW}Installing production dependencies...${NC}"
cd "$BUILD_DIR"
# Copy package files first
cp "$PROJECT_ROOT/package.json" .
cp "$PROJECT_ROOT/package-lock.json" . 2>/dev/null || true
# Install only production dependencies
npm ci --production --ignore-scripts
cd "$PROJECT_ROOT"

# Step 7: Create tarball
echo -e "${YELLOW}Creating deployment tarball...${NC}"
tar -czf "$TARBALL_NAME" -C "$BUILD_DIR" .

# Step 8: Display results
TARBALL_SIZE=$(du -h "$TARBALL_NAME" | cut -f1)
echo ""
echo -e "${GREEN}==========================================${NC}"
echo -e "${GREEN}Build Complete!${NC}"
echo -e "${GREEN}==========================================${NC}"
echo "Tarball: $TARBALL_NAME"
echo "Size: $TARBALL_SIZE"
echo ""
echo "The tarball is ready for deployment."
echo "It contains:"
echo "  - Built Next.js application (.next/)"
echo "  - Public assets (public/)"
echo "  - Prisma schema and migrations (prisma/)"
echo "  - Source code (src/)"
echo "  - Production dependencies (node_modules/)"
echo "  - Configuration files"

