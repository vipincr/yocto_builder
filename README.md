# YoctoBuilder

A self-hosted CI/CD platform for building Yocto Linux distributions with GitHub integration, real-time build logs, and automated deployment.

**Created by [Gramini Labs](https://gramini.com)**

## Features

- **GitHub Integration**: Connect repositories, manage branches, and trigger builds on push
- **Real-time Build Logs**: Monitor build progress with WebSocket streaming
- **OAuth Authentication**: Sign in with Google or GitHub
- **Multi-version Support**: Build with Kirkstone, Scarthgap, or Styhead
- **Automated Deployment**: Ansible playbooks for local and AWS EC2 deployment
- **Persistent Builds**: Build artifacts are never cleared automatically

## Prerequisites

### Local Development
- Node.js 22.x
- PostgreSQL 16.x
- Docker 27.x

### Production Deployment
- **Minimum Server Specs**: 8 vCPUs, 32GB RAM, 1TB storage
- **Recommended**: AWS EC2 m5.2xlarge or equivalent
- Ansible 2.20+ (for deployment)

## Quick Start

### Option 1: Local Development with Vagrant (Easiest)

The easiest way to get started is using Vagrant, which sets up a complete development environment automatically.

**Prerequisites:**
- [Vagrant](https://www.vagrantup.com/downloads)
- [VirtualBox](https://www.virtualbox.org/wiki/Downloads)

**Setup:**
```bash
# Start/provision/update the VM and deploy YoctoBuilder (idempotent)
./deploy.sh
```

The application will be available at **http://localhost:3000** once provisioning completes.

**Important Vagrant notes (dev mode):**
- **Runs in dev mode on the VM**: PM2 starts the app using `npm run dev` for fast iteration/hot reload.
- **Boot recovery**: after a VM reboot, systemd starts `pm2-yocto`, which resurrects the app automatically.
- **After changing `Vagrantfile`** (e.g. synced-folder options): run `vagrant reload` to apply changes.
- **Native deps safety**: on Vagrant we keep Linux `node_modules` inside the VM (and symlink it into `/vagrant`)
  to avoid macOS/Linux native module mismatches (e.g. `esbuild`).

**Useful commands:**
```bash
# Re-apply Ansible to an already-running VM (recommended after code/ansible changes)
./deploy.sh --no-up

# Reboot VM (validates boot recovery)
vagrant reload

# Inside VM: inspect app/process status
vagrant ssh -c "systemctl status pm2-yocto --no-pager"
vagrant ssh -c "sudo -u yocto pm2 list"
vagrant ssh -c "sudo -u yocto pm2 logs yocto-builder --lines 200 --nostream"
```

**Vagrant Details:**
- Uses ARM64 Ubuntu 24.04 box (`net9/ubuntu-24.04-arm64`) on ARM Macs
- Uses x86_64 Ubuntu 22.04 box (`ubuntu/jammy64`) on Intel Macs
- Requires VirtualBox 7.1+ for ARM Mac support
- VM resources: 4GB RAM, 2 CPUs (development)
- Port forwarding: 3000 (app), 5433 (PostgreSQL)

### Option 2: Local Development (Manual)

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/yocto_builder.git
cd yocto_builder
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

```bash
# Create a local .env (this file is ignored by git)
touch .env
```

Edit `.env` and set the following required variables:

#### Required Configuration

```bash
# Database
DATABASE_URL="postgresql://yocto_admin:your_password@localhost:5432/yocto_builder"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"  # Use https://your-domain.com for production
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"

# OAuth Providers (at least one required)
GITHUB_CLIENT_ID="your_github_client_id"
GITHUB_CLIENT_SECRET="your_github_client_secret"
GOOGLE_CLIENT_ID="your_google_client_id"
GOOGLE_CLIENT_SECRET="your_google_client_secret"
```

#### OAuth Setup

**GitHub OAuth:**
1. Go to https://github.com/settings/developers
2. Create a new OAuth App
3. Set Authorization callback URL: `http://localhost:3000/api/auth/callback/github` (or your production URL)
4. Copy Client ID and Secret to `.env`

**Google OAuth:**
1. Go to https://console.cloud.google.com/apis/credentials
2. Create OAuth 2.0 Client ID
3. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
4. Copy Client ID and Secret to `.env`

### 4. Set Up Database

```bash
# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate
```

### 5. Start Development Server

```bash
npm run dev
```

The application will be available at http://localhost:3000

## Production Deployment

### Deploy (single entrypoint)

Use `deploy.sh` for all deployments:

```bash
# Vagrant (default)
./deploy.sh

# Vagrant (skip vagrant up)
./deploy.sh --no-up

# AWS (provision/reuse + deploy)
./deploy.sh --aws
```

### AWS EC2 Deployment

#### Prerequisites

1. **AWS Account Setup:**
   - Create an IAM user with the permissions in `AWS-IAM-POLICY.json`
   - Create an EC2 Key Pair and save the private key to `.secrets/your-key.pem`
   - Set `chmod 600 .secrets/your-key.pem`

2. **Configure AWS in `.env`:**
   ```bash
   AWS_REGION="ap-south-1"
   AWS_EC2_INSTANCE_TYPE="m5.2xlarge"
   AWS_EC2_KEY_NAME="your-key-pair-name"
   AWS_EC2_KEY_PATH=".secrets/your-key.pem"
   ```
   Add your AWS credentials to `.env` (do not commit). `deploy.sh --aws` reads them from `.env`.

3. **Update application repository:**
   ```bash
   APP_REPO="https://github.com/your-org/yocto_builder.git"
   APP_BRANCH="main"
   ```

4. **Set PostgreSQL password (for deployment):**
   ```bash
   POSTGRESQL_PASSWORD="your_secure_password"
   ```
   Note: This password will be used for the PostgreSQL database on the deployed server.

#### Deploy to AWS

```bash
./deploy.sh --aws
```

The deployment is **fully automated** and **idempotent** (safe to run multiple times):

**First-time deployment:**
1. Provisions (or reuses) an EC2 instance named **yocto-builder** (Name tag)
2. Installs all system dependencies (PostgreSQL, Docker, Node.js, PM2, Nginx)
3. Creates database and user automatically
4. Builds the Next.js application **locally** and uploads a prebuilt tarball (no server-side build)
5. Generates Prisma client (server)
6. Runs database migrations (server)
7. Configures Nginx as reverse proxy
8. Starts application with PM2 (**production mode**: `next start`)
9. Ensures `pm2-yocto` is enabled so the app comes back after reboot

**Subsequent deployments (updates):**
- Rebuilds the app **locally** and uploads a fresh tarball
- Applies migrations and restarts the PM2 process

All configuration is managed through Ansible playbooks - no manual commands or scripts needed!

After deployment, access the application at `http://<instance-ip>` or `https://<instance-ip>`

#### Deployment Details

**Ansible Playbooks (internal):**
- `ansible/playbooks/deploy.yml`: unified deployment (Vagrant + AWS targets)
- `ansible/playbooks/aws-full-deploy.yml`: AWS provision/reuse + deploy

**Ansible Roles:**
- `common`: System configuration, user/group creation, directory setup
- `docker`: Docker installation and configuration
- `postgresql`: PostgreSQL installation, database/user creation
- `nodejs`: Node.js and PM2 installation
- `nginx`: Nginx reverse proxy and SSL setup
- `yocto_builder`: Application deployment (supports both Vagrant and remote)

**Idempotency:** All tasks are idempotent - safe to run multiple times. The deployment automatically detects existing resources and only updates what's changed.

#### AWS IAM Policy

Attach the IAM policy from `AWS-IAM-POLICY.json` to your IAM user. The policy includes permissions for:
- EC2 instance management
- Security group management
- Elastic IP allocation
- AMI and snapshot access

## Project Structure

```
yocto_builder/
├── src/                    # Application source code
│   ├── app/               # Next.js app directory (pages, API routes)
│   ├── lib/               # Libraries and utilities
│   │   ├── auth/          # Authentication (NextAuth)
│   │   ├── build/          # Build execution and queue
│   │   ├── db/            # Database queries and setup
│   │   ├── docker/        # Docker integration
│   │   ├── github/        # GitHub API integration
│   │   ├── pm2/           # PM2 process management
│   │   └── socket/        # WebSocket server
│   └── types/             # TypeScript type definitions
├── ansible/               # Ansible deployment automation
│   ├── playbooks/         # Deployment playbooks
│   │   ├── aws-full-deploy.yml    # Complete AWS deployment
│   │   ├── aws-deploy.yml         # Application deployment only
│   │   └── vagrant-deploy.yml     # Vagrant VM deployment
│   ├── roles/             # Reusable Ansible roles
│   │   ├── common/        # System setup
│   │   ├── docker/        # Docker installation
│   │   ├── postgresql/    # PostgreSQL setup
│   │   ├── nodejs/        # Node.js and PM2
│   │   ├── nginx/         # Nginx reverse proxy
│   │   └── yocto_builder/ # Application deployment
│   └── inventory/         # Server inventory files
├── docker/                # Docker configurations
│   └── poky/              # Yocto Poky Dockerfiles (Kirkstone, Scarthgap)
├── prisma/                # Database schema and migrations
├── deploy.sh              # Single deployment entrypoint (Vagrant + AWS)
└── AWS-IAM-POLICY.json    # AWS IAM policy document
```

## Configuration

All configuration is managed through environment variables in `.env` (this file is ignored by git):

- **Database**: PostgreSQL connection string
- **Authentication**: NextAuth URL and secret, OAuth credentials
- **Application**: Build directories, Docker settings
- **Resources**: Build container CPU and memory limits
- **AWS**: Deployment credentials and instance configuration

## Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run db:generate  # Generate Prisma client
npm run db:migrate   # Run database migrations
npm run db:studio    # Open Prisma Studio
```

### Database Management

```bash
# Create migration
npx prisma migrate dev --name migration_name

# Apply migrations
npm run db:migrate

# Reset database (development only)
npx prisma migrate reset
```

## Troubleshooting

### Port Already in Use
If port 3000 is already in use:
```bash
# Find and kill the process
lsof -ti:3000 | xargs kill -9
```

### Database Connection Issues
- Verify PostgreSQL is running: `sudo systemctl status postgresql`
- Check connection string in `.env`
- Ensure database exists: `createdb yocto_builder`

### OAuth Not Working
- Verify OAuth credentials in `.env`
- Check callback URLs match your application URL
- Ensure `NEXTAUTH_URL` matches your actual URL

### AWS Deployment Issues
- Verify IAM permissions match `AWS-IAM-POLICY.json`
- Check security group allows SSH (port 22) and HTTP/HTTPS (ports 80/443)
- Ensure SSH key has correct permissions: `chmod 600 .secrets/your-key.pem`
- Check vCPU limits if instance creation fails (request increase via AWS support)
- Verify AWS credentials are set in `.env`

### Deployment Troubleshooting

**Check deployment status:**
```bash
ssh -i .secrets/ec2_vipinr.pem ec2-user@<instance-ip>
sudo -u yocto pm2 list
sudo -u yocto pm2 logs yocto-builder
sudo systemctl status pm2-yocto --no-pager
```

**Check service status:**
```bash
systemctl status postgresql
systemctl status docker
systemctl status nginx
```

**Re-run deployment:**
```bash
./deploy.sh --aws
```

## License

See LICENSE file.

## Support

For issues and questions, please open an issue on GitHub.
