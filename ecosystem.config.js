// PM2 process for webcrawler-buzz. Run from /opt/webcrawler-buzz/current/.
module.exports = {
  apps: [
    {
      name: 'webcrawler-buzz',
      cwd: './',
      script: 'dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '512M',
      env: { NODE_ENV: 'production' },
      out_file: '/var/log/webcrawler-buzz/out.log',
      error_file: '/var/log/webcrawler-buzz/err.log',
      merge_logs: true,
      time: true,
    },
  ],
};
