# Yocto Builder Platform

A self-hosted CI/CD platform for building Yocto Linux distributions with GitHub integration, real-time build logs, and automated deployment.

## Features

- **GitHub Integration**: Connect repositories, manage branches, and trigger builds on push
- **Real-time Build Logs**: Monitor build progress with WebSocket streaming
- **OAuth Authentication**: Sign in with Google or GitHub
- **Multi-version Support**: Build with Kirkstone, Scarthgap, or Styhead
- **Automated Deployment**: Ansible playbooks for Generic Linux, AWS EC2, and GCP

## Prerequisites

- Node.js 22.x
- PostgreSQL 16.x
- Docker 27.x
- 8+ vCPUs, 32GB+ RAM, 1TB+ storage

## Quick Start

### Development

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. Set up the database:
   ```bash
   npm run db:generate
   npm run db:migrate
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

### Production Deployment

Deploy using Ansible:

```bash
cd ansible
ansible-playbook -i inventory/local.yml playbooks/deploy.yml
```

## Documentation

See the plan file for detailed specifications and architecture.

## License

See LICENSE file.
