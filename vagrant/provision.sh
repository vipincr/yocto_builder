#!/bin/bash
set -e

echo "=== Provisioning Yocto Builder Environment ==="

# Update system
sudo apt-get update
sudo apt-get install -y software-properties-common curl wget git

# Install Docker
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
fi

# Install Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "Installing Docker Compose..."
    sudo apt-get install -y docker-compose-plugin
fi

# Install Node.js 22
if ! command -v node &> /dev/null || [ "$(node -v | cut -d'v' -f2 | cut -d'.' -f1)" != "22" ]; then
    echo "Installing Node.js 22..."
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Install PostgreSQL 16
if ! command -v psql &> /dev/null || [ "$(psql --version | awk '{print $3}' | cut -d'.' -f1)" != "16" ]; then
    echo "Installing PostgreSQL 16..."
    sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
    wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
    sudo apt-get update
    sudo apt-get install -y postgresql-16 postgresql-contrib-16
fi

# Install build dependencies
echo "Installing build dependencies..."
sudo apt-get install -y \
    build-essential \
    python3 \
    python3-pip \
    gawk \
    wget \
    git \
    diffstat \
    unzip \
    texinfo \
    gcc \
    chrpath \
    socat \
    cpio \
    python3-pexpect \
    python3-git \
    python3-jinja2 \
    python3-subunit \
    xz-utils \
    debianutils \
    iputils-ping \
    libsdl1.2-dev \
    xterm \
    mesa-common-dev \
    zstd \
    liblz4-tool \
    file \
    locales

# Generate locale
sudo locale-gen en_US.UTF-8

# Setup PostgreSQL
echo "Setting up PostgreSQL..."
sudo -u postgres psql -c "CREATE USER yocto_admin WITH PASSWORD 'development_password' CREATEDB;" || true
sudo -u postgres psql -c "CREATE DATABASE yocto_builder OWNER yocto_admin;" || true

# Create directories
mkdir -p /home/vagrant/builds
mkdir -p /home/vagrant/logs
sudo chown -R vagrant:vagrant /home/vagrant/builds /home/vagrant/logs

echo "=== Provisioning Complete ==="

