#!/bin/bash
set -e

echo "=== Starting Yocto Builder Application ==="

cd /vagrant

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "ERROR: .env file not found. Run /vagrant/vagrant/setup-app.sh first"
    exit 1
fi

# Check database connection
export DATABASE_URL="postgresql://yocto_admin:development_password@localhost:5432/yocto_builder"
if ! psql $DATABASE_URL -c "SELECT 1;" > /dev/null 2>&1; then
    echo "ERROR: Cannot connect to database. Starting PostgreSQL..."
    sudo systemctl start postgresql
    sleep 2
fi

# Start the application
echo "Starting development server..."
npm run dev

