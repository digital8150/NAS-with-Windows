module.exports = {
  apps: [
    {
      name: 'nas-drive',
      script: 'server/src/index.js',
      cwd: '/root/repos/NAS-with-Windows',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G'
    }
  ]
};
