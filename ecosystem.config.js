module.exports = {
  apps: [
    {
      name: 'deeper-prime-hq',
      script: 'node_modules/.bin/next',
      args: 'start',
      cwd: __dirname,
      watch: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};
