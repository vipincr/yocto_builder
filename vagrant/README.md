# Vagrant Setup for Yocto Builder

This directory contains Vagrant configuration and provisioning scripts for testing the Yocto Builder platform.

## Prerequisites

- [Vagrant](https://www.vagrantup.com/) installed
- [VirtualBox](https://www.virtualbox.org/) or another Vagrant provider

## Quick Start

1. Start the Vagrant box:
   ```bash
   vagrant up
   ```

2. SSH into the box:
   ```bash
   vagrant ssh
   ```

3. Navigate to the project:
   ```bash
   cd /vagrant
   ```

4. Run tests:
   ```bash
   /vagrant/vagrant/test.sh
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Access the application:
   - Open http://localhost:3000 in your browser

## Provisioning

The provisioning scripts will automatically:
- Install Docker and Docker Compose
- Install Node.js 22
- Install PostgreSQL 16
- Install all build dependencies
- Set up the database
- Create necessary directories

## Manual Setup

If you need to manually set up the environment:

```bash
# Run provisioning
/vagrant/vagrant/provision.sh

# Setup application
/vagrant/vagrant/setup-app.sh
```

## Troubleshooting

### Docker Permission Issues
If you get permission errors with Docker:
```bash
sudo usermod -aG docker $USER
newgrp docker
```

### PostgreSQL Connection Issues
Check if PostgreSQL is running:
```bash
sudo systemctl status postgresql
sudo systemctl start postgresql
```

### Port Already in Use
If port 3000 is already in use, you can change it:
```bash
PORT=3001 npm run dev
```

## Notes

- The Vagrant box uses 4GB RAM and 4 CPUs (reduced from production requirements for testing)
- Database credentials are set to development defaults
- OAuth credentials need to be configured in `.env` for full functionality

