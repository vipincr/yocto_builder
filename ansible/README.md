# YoctoBuilder Ansible Deployment

This directory contains Ansible playbooks and roles for deploying YoctoBuilder to AWS EC2 or local servers.

## Overview

The Ansible deployment is designed to be:
- **Idempotent**: Can be run multiple times safely
- **Comprehensive**: Handles all configuration automatically
- **Flexible**: Supports both first-time setup and updates

## Playbooks

### `playbooks/aws-full-deploy.yml`
Complete deployment playbook that handles:
- EC2 instance provisioning (if needed)
- Full application deployment
- All service configuration

**Usage:**
```bash
cd ansible
ansible-playbook playbooks/aws-full-deploy.yml
```

### `playbooks/aws-provision.yml`
Provisions a new EC2 instance only.

**Usage:**
```bash
cd ansible
ansible-playbook -i inventory/aws-ec2-static.yml playbooks/aws-provision.yml
```

### `playbooks/aws-deploy.yml`
Deploys/updates the application on an existing EC2 instance.

**Usage:**
```bash
cd ansible
ansible-playbook -i inventory/aws-ec2-static.yml playbooks/aws-deploy.yml
```

## Roles

### `common`
- System configuration
- User/group creation
- Directory setup
- Package installation

### `docker`
- Docker installation
- Docker daemon configuration
- Service management

### `postgresql`
- PostgreSQL installation
- Database and user creation
- Authentication configuration

### `nodejs`
- Node.js installation
- PM2 installation

### `nginx`
- Nginx installation
- Reverse proxy configuration
- SSL certificate setup (Let's Encrypt)

### `yocto_builder`
- Application repository management (clone/update)
- Node.js dependencies installation
- Environment file creation
- Prisma client generation
- Database migrations
- Next.js build
- PM2 service management

## Configuration

All configuration is read from environment variables (see `.env.example`):

- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`: AWS credentials
- `AWS_REGION`: AWS region (default: ap-south-1)
- `AWS_EC2_INSTANCE_TYPE`: Instance type (default: m5.2xlarge)
- `AWS_EC2_KEY_NAME`: SSH key pair name
- `AWS_EC2_KEY_PATH`: Path to SSH private key
- `APP_REPO`: Git repository URL
- `APP_BRANCH`: Git branch (default: main)
- `POSTGRESQL_PASSWORD`: Database password
- `NEXTAUTH_SECRET`: NextAuth secret
- `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`: GitHub OAuth
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: Google OAuth
- And more...

## Deployment Flow

### First-Time Deployment

1. **Provision Instance** (if needed)
   - Creates EC2 instance
   - Configures security groups
   - Allocates Elastic IP

2. **System Setup**
   - Installs system packages
   - Creates application user
   - Sets up directories

3. **Service Installation**
   - PostgreSQL (with database/user creation)
   - Docker
   - Node.js and PM2
   - Nginx

4. **Application Deployment**
   - Clones repository
   - Installs dependencies
   - Generates Prisma client
   - Creates environment file
   - Runs database migrations
   - Builds Next.js application
   - Starts PM2 service

### Update Deployment

When running on an existing instance:
- Updates repository (git pull)
- Reinstalls dependencies (if package.json changed)
- Regenerates Prisma client
- Updates environment file (if changed)
- Runs new migrations
- Rebuilds application
- Restarts PM2 service

## Idempotency

All tasks are designed to be idempotent:
- Repository: Uses `git` module with `update: yes`
- Dependencies: Uses `npm` module (only installs if needed)
- Database: Checks existence before creating
- PM2: Checks status before starting
- Services: Uses `systemd` module (idempotent by default)

## Handlers

Handlers are used for service restarts:
- `restart application`: Restarts PM2 application (triggered by code/config changes)
- `Restart PostgreSQL`: Restarts PostgreSQL service
- `Restart Docker`: Restarts Docker service
- `Reload nginx`: Reloads Nginx configuration

## Troubleshooting

### Check deployment status
```bash
ssh -i .secrets/ec2_vipinr.pem ec2-user@<instance-ip>
sudo -u yocto pm2 list
sudo -u yocto pm2 logs yocto-builder
```

### Re-run deployment
```bash
./deploy-aws.sh <instance-ip>
```

### Check service status
```bash
systemctl status postgresql
systemctl status docker
systemctl status nginx
```

## Best Practices

1. **Always use the deployment script**: `./deploy-aws.sh` handles all prerequisites
2. **Keep .env updated**: All configuration comes from environment variables
3. **Use tags for selective updates**: `ansible-playbook --tags provision` for instance only
4. **Check logs**: PM2 logs are in `/var/log/yocto_builder/`
5. **Monitor services**: Use `pm2 monit` for real-time monitoring

