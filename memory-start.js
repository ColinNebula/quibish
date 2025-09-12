#!/usr/bin/env node

// Memory optimization startup script
// Usage: node --max-old-space-size=512 --max-semi-space-size=16 memory-start.js

const { spawn } = require('child_process');
const path = require('path');

// Memory optimization flags (only valid Node.js flags)
const memoryFlags = [
  '--max-old-space-size=512',     // Limit old space to 512MB
  '--max-semi-space-size=16',     // Limit semi space to 16MB
  '--expose-gc',                  // Expose global.gc function
];

// Additional flags for production
if (process.env.NODE_ENV === 'production') {
  memoryFlags.push(
    '--max-http-header-size=8192', // Reduce header size limit
    '--disable-proto=delete',      // Security and memory optimization
  );
}

// Determine which script to run
const isBackend = process.argv.includes('--backend');
const isFrontend = process.argv.includes('--frontend');

let scriptPath;
let scriptArgs = [];

if (isBackend) {
  scriptPath = path.join(__dirname, 'backend', 'server.js');
  console.log('🚀 Starting backend with memory optimizations...');
} else if (isFrontend) {
  scriptPath = 'react-scripts';
  scriptArgs = ['start'];
  console.log('🚀 Starting frontend with memory optimizations...');
} else {
  console.log('Usage: node memory-start.js --backend or --frontend');
  process.exit(1);
}

// Create the child process with memory optimizations
const child = spawn('node', [...memoryFlags, scriptPath, ...scriptArgs], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_OPTIONS: memoryFlags.join(' '),
    GENERATE_SOURCEMAP: 'false', // Reduce memory in development
    SKIP_PREFLIGHT_CHECK: 'true', // Skip preflight checks
    FAST_REFRESH: 'false', // Disable fast refresh to save memory
  }
});

child.on('error', (error) => {
  console.error('❌ Failed to start process:', error);
  process.exit(1);
});

child.on('exit', (code) => {
  console.log(`🏁 Process exited with code ${code}`);
  process.exit(code);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('🔄 Terminating child process...');
  child.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('🔄 Terminating child process...');
  child.kill('SIGTERM');
});