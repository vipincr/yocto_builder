#!/bin/bash
set -e

echo "=== Setting up Yocto Builder Application ==="

cd /vagrant

# Install dependencies
if [ ! -d "node_modules" ]; then
    echo "Installing npm dependencies..."
    npm install
fi

# Generate Prisma client
echo "Generating Prisma client..."
npm run db:generate

# Setup environment
if [ ! -f ".env" ]; then
    echo "Creating .env file..."
    cat > .env << 'ENVEOF'
# Database
DATABASE_URL="postgresql://yocto_admin:development_password@localhost:5432/yocto_builder"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="development-secret-key-change-in-production-$(openssl rand -hex 32)"

# GitHub OAuth (for testing)
GITHUB_CLIENT_ID="test_client_id"
GITHUB_CLIENT_SECRET="test_client_secret"

# Google OAuth (for testing)
GOOGLE_CLIENT_ID="test_google_client_id"
GOOGLE_CLIENT_SECRET="test_google_client_secret"

# Application
BUILDS_DIRECTORY="/home/vagrant/builds"
LOGS_DIRECTORY="/home/vagrant/logs"

# Docker
DOCKER_HOST="unix:///var/run/docker.sock"
POKY_IMAGE_KIRKSTONE="yocto-builder/poky-kirkstone:4.0"
POKY_IMAGE_SCARTHGAP="yocto-builder/poky-scarthgap:5.0"

# Build Resources
BUILD_CONTAINER_CPUS=2
BUILD_CONTAINER_MEMORY="4g"
ENVEOF
fi

# Ensure logs directory exists
mkdir -p /home/vagrant/logs
sudo chown -R vagrant:vagrant /home/vagrant/logs

# Run migrations
echo "Running database migrations..."
export DATABASE_URL="postgresql://yocto_admin:development_password@localhost:5432/yocto_builder"
npm run db:migrate || echo "Migrations may have already been run"

echo "=== Application Setup Complete ==="
echo "To start the application, run: npm run dev"

