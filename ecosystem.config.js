module.exports = {
  apps: [
    {
      name: 'quibish-backend',
      script: './backend/server.js',
      cwd: './backend',
      instances: 1,
      autorestart: true,
      watch: false, // Set to true for development if you want auto-reload
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: 5001
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5001
      },
      // Restart strategies
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s',
      
      // Logging
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm Z',
      
      // Health monitoring
      health_check_url: 'http://localhost:5001/api/ping',
      health_check_grace_period: 3000
    },
    {
      name: 'quibish-frontend',
      script: 'npm',
      args: 'start',
      cwd: './',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '2G',
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
        BROWSER: 'none' // Prevent auto-opening browser
      },
      
      // Restart strategies
      restart_delay: 4000,
      max_restarts: 5,
      min_uptime: '30s',
      
      // Logging
      log_file: './logs/frontend-combined.log',
      out_file: './logs/frontend-out.log',
      error_file: './logs/frontend-error.log'
    }
  ]
};