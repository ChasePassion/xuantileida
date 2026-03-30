module.exports = {
  apps: [
    {
      name: 'topic-radar-backend',
      script: 'dist/main.js',
      cwd: '/opt/topic-radar-backend',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
      },
      env_file: '/opt/topic-radar-backend/.env.production',
      error_file: '/opt/topic-radar-backend/logs/error.log',
      out_file: '/opt/topic-radar-backend/logs/out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      time: true,
    },
  ],
};
