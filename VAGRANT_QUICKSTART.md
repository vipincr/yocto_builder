# Vagrant Quick Start Guide

## Prerequisites

Install the following on your host machine:
- [Vagrant](https://www.vagrantup.com/downloads) (latest version)
- [VirtualBox](https://www.virtualbox.org/wiki/Downloads) (latest version)

## Quick Start

1. **Start the Vagrant box:**
   ```bash
   vagrant up
   ```
   This will:
   - Download Ubuntu 22.04 base box (first time only)
   - Provision the VM with all dependencies
   - Set up the application

2. **SSH into the box:**
   ```bash
   vagrant ssh
   ```

3. **Navigate to project:**
   ```bash
   cd /vagrant
   ```

4. **Run tests:**
   ```bash
   /vagrant/vagrant/test.sh
   ```

5. **Start the application:**
   ```bash
   /vagrant/vagrant/start.sh
   ```
   Or manually:
   ```bash
   npm run dev
   ```

6. **Access the application:**
   - Open http://localhost:3000 in your browser

## What Gets Installed

- Docker 27.x
- Node.js 22.x
- PostgreSQL 16.x
- All Yocto build dependencies
- Application dependencies (via npm)

## VM Resources

- **Memory:** 4GB (reduced from production 32GB for testing)
- **CPUs:** 4 (reduced from production 8 for testing)
- **Storage:** Shared with host via `/vagrant`

## Troubleshooting

### Vagrant box won't start
```bash
# Check VirtualBox is running
# Check system resources (need at least 4GB free RAM)
```

### Provisioning fails
```bash
# Re-run provisioning
vagrant provision
```

### Port conflicts
Edit `Vagrantfile` and change port mappings:
```ruby
config.vm.network "forwarded_port", guest: 3000, host: 3001
```

### Database connection issues
```bash
# Inside Vagrant box
sudo systemctl status postgresql
sudo systemctl start postgresql
```

## Stopping the Box

```bash
# Suspend (saves state)
vagrant suspend

# Halt (shuts down)
vagrant halt

# Destroy (removes VM)
vagrant destroy
```

## Next Steps After Setup

1. Configure OAuth credentials in `.env`
2. Test GitHub repository connection
3. Create a test project
4. Trigger a build
5. Monitor real-time logs

