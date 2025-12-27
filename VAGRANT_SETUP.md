# Vagrant Setup and Testing Guide

This guide will help you set up and test the Yocto Builder platform using Vagrant.

## Prerequisites

- [Vagrant](https://www.vagrantup.com/) installed
- [VirtualBox](https://www.virtualbox.org/) installed
- At least 8GB free RAM (Vagrant box uses 4GB)

## Quick Start

1. **Start the Vagrant box:**
   ```bash
   vagrant up
   ```
   This will:
   - Download Ubuntu 22.04 base box
   - Install Docker, Node.js 22, PostgreSQL 16
   - Install all build dependencies
   - Set up the database
   - Install npm dependencies
   - Run database migrations

2. **SSH into the box:**
   ```bash
   vagrant ssh
   ```

3. **Navigate to the project:**
   ```bash
   cd /vagrant
   ```

4. **Run tests:**
   ```bash
   /vagrant/vagrant/test.sh
   ```

5. **Start the development server:**
   ```bash
   npm run dev
   ```

6. **Access the application:**
   - Open http://localhost:3000 in your browser
   - You should see the login page

## Manual Setup (if needed)

If provisioning didn't complete successfully:

```bash
# Run provisioning script
/vagrant/vagrant/provision.sh

# Setup application
/vagrant/vagrant/setup-app.sh
```

## Testing Checklist

- [ ] Vagrant box starts successfully
- [ ] All dependencies are installed
- [ ] Database is accessible
- [ ] Application builds without errors
- [ ] Server starts on port 3000
- [ ] Login page is accessible
- [ ] Database migrations run successfully

## Troubleshooting

### Docker Permission Issues
```bash
sudo usermod -aG docker $USER
newgrp docker
```

### PostgreSQL Not Running
```bash
sudo systemctl status postgresql
sudo systemctl start postgresql
```

### Port Already in Use
Change the port in `Vagrantfile` or use a different port:
```bash
PORT=3001 npm run dev
```

### Database Connection Errors
Check the database is running and credentials are correct:
```bash
sudo -u postgres psql -c "SELECT 1;"
```

## Notes

- The Vagrant box uses reduced resources (4GB RAM, 4 CPUs) for testing
- Production requires 32GB RAM and 8 CPUs minimum
- OAuth credentials need to be configured in `.env` for full functionality
- The `.env` file is created automatically with development defaults

## Next Steps

After successful setup:
1. Configure OAuth credentials in `.env`
2. Test GitHub repository connection
3. Create a test project
4. Trigger a test build

