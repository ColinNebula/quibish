#!/usr/bin/env node

// Start the server with optimized memory settings
const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Quibish Backend with optimized memory settings...');

const nodeArgs = [
  '--expose-gc',                    // Enable manual garbage collection
  '--max-old-space-size=512',       // Limit heap to 512MB
  '--max-semi-space-size=16',       // Limit semi-space to 16MB
  '--optimize-for-size',            // Optimize for memory usage
  path.join(__dirname, 'server.js')
];

const serverProcess = spawn('node', nodeArgs, {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: process.env.NODE_ENV || 'development',
    USE_MEMORY_ONLY: 'true' // Force memory-only mode for better control
  }
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🔄 Shutting down server gracefully...');
  serverProcess.kill('SIGTERM');
  setTimeout(() => {
    serverProcess.kill('SIGKILL');
    process.exit(0);
  }, 5000);
});

process.on('SIGTERM', () => {
  serverProcess.kill('SIGTERM');
  process.exit(0);
});

serverProcess.on('close', (code) => {
  console.log(`\n📊 Server process exited with code ${code}`);
  process.exit(code);
});

serverProcess.on('error', (error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});