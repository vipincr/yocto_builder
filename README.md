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
- Ansible 2.14+ (for deployment)

## Quick Start

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

Copy the example environment file and configure it:

```bash
cp .env.example .env
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

### Local Machine Deployment

1. **Install Ansible dependencies:**
   ```bash
   cd ansible
   ./install-dependencies.sh
   ```

2. **Configure inventory:**
   Edit `ansible/inventory/local.yml` with your server details

3. **Deploy:**
   ```bash
   ansible-playbook -i inventory/local.yml playbooks/deploy.yml
   ```

### AWS EC2 Deployment

#### Prerequisites

1. **AWS Account Setup:**
   - Create an IAM user with the permissions in `AWS-IAM-POLICY.json`
   - Create an EC2 Key Pair and save the private key to `.secrets/your-key.pem`
   - Set `chmod 600 .secrets/your-key.pem`

2. **Configure AWS in `.env`:**
   ```bash
   AWS_ACCESS_KEY_ID="your_access_key"
   AWS_SECRET_ACCESS_KEY="your_secret_key"
   AWS_REGION="ap-south-1"
   AWS_EC2_INSTANCE_TYPE="m5.2xlarge"
   AWS_EC2_KEY_NAME="your-key-pair-name"
   AWS_EC2_KEY_PATH=".secrets/your-key.pem"
   ```

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

**Option 1: Provision new instance and deploy**
```bash
./deploy-aws.sh
```

**Option 2: Deploy to existing instance**
```bash
./deploy-aws.sh <instance-ip>
```

The script will:
1. Provision an EC2 instance (if new)
2. Install all dependencies (PostgreSQL, Docker, Node.js, Nginx)
3. Deploy the application
4. Configure Nginx as reverse proxy
5. Set up SSL certificates (Let's Encrypt)

After deployment, access the application at `http://<instance-ip>` or `https://<instance-ip>`

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
│   ├── app/               # Next.js app directory
│   ├── lib/               # Libraries and utilities
│   └── types/             # TypeScript type definitions
├── ansible/               # Ansible deployment playbooks
│   ├── playbooks/         # Deployment playbooks
│   ├── roles/             # Ansible roles
│   └── inventory/         # Server inventory files
├── docker/                # Docker configurations
│   └── poky/              # Yocto Poky Dockerfiles
├── prisma/                # Database schema and migrations
├── .env.example           # Environment variables template
├── deploy-aws.sh          # AWS deployment script
└── AWS-IAM-POLICY.json    # AWS IAM policy document
```

## Configuration

All configuration is managed through environment variables in `.env`. See `.env.example` for all available options:

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

## License

See LICENSE file.

## Support

For issues and questions, please open an issue on GitHub.
