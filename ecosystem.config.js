module.exports = {
  apps: [{
    name: 'yocto-builder',
    // Always run from the project directory (important for vagrant dev mode)
    cwd: '/vagrant',
    // Vagrant: run dev server for faster iteration/debugging
    script: 'npm',
    args: 'run dev',
    instances: '1',
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'development',
      PORT: '3000',
    },
    error_file: '/var/log/yocto_builder/pm2-error.log',
    out_file: '/var/log/yocto_builder/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_memory_restart: '1G',
  }],
};

