# Testing Guide

## Local Testing (without Vagrant)

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Set up database:**
   ```bash
   # Start PostgreSQL (if using Docker)
   docker-compose -f docker/docker-compose.yml up -d postgres

   # Run migrations
   npm run db:generate
   npm run db:migrate
   ```

4. **Build and test:**
   ```bash
   npm run build
   npm run dev
   ```

## Vagrant Testing

1. **Start Vagrant box:**
   ```bash
   vagrant up
   ```

2. **SSH into the box:**
   ```bash
   vagrant ssh
   ```

3. **Run tests:**
   ```bash
   /vagrant/vagrant/test.sh
   ```

4. **Start the application:**
   ```bash
   /vagrant/vagrant/start.sh
   ```

5. **Access the application:**
   - Open http://localhost:3000 in your browser

## Test Checklist

- [ ] Application builds without errors
- [ ] Database migrations run successfully
- [ ] Server starts on port 3000
- [ ] Login page is accessible
- [ ] Can navigate to dashboard (after auth)
- [ ] API routes respond correctly
- [ ] WebSocket connection works (for build logs)

## Known Issues

- OAuth providers need to be configured in `.env` for full functionality
- Docker must be running for build functionality
- Some features require GitHub account linking

