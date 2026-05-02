module.exports = {
  apps: [
    {
      name: 'webcrawler-buzz',
      script: './dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      env_production: {
        NODE_ENV: 'production',
      },
      max_memory_restart: '512M',
      error_file: '/root/webcrawler-buzz/logs/err.log',
      out_file: '/root/webcrawler-buzz/logs/out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};
