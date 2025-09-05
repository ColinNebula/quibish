#!/usr/bin/env node

/**
 * Environment Configuration Validator
 * Run this script to validate and debug your environment setup
 */

const fs = require('fs');
const path = require('path');

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

const log = (color, message) => console.log(`${colors[color]}${message}${colors.reset}`);

console.log(`${colors.cyan}${colors.bright}
╔══════════════════════════════════════════════════════════════╗
║                   🌍 Environment Validator                   ║
║                      Quibish Frontend                       ║
╚══════════════════════════════════════════════════════════════╝
${colors.reset}`);

// Check for environment files
const envFiles = [
  '.env',
  '.env.development',
  '.env.production',
  '.env.example',
  '.env.local'
];

log('blue', '\n📁 Checking environment files:');
envFiles.forEach(file => {
  const exists = fs.existsSync(path.join(process.cwd(), file));
  log(exists ? 'green' : 'yellow', `  ${exists ? '✅' : '⚠️ '} ${file} ${exists ? 'exists' : 'missing'}`);
});

// Load and parse environment files
const loadEnvFile = (filename) => {
  try {
    const content = fs.readFileSync(path.join(process.cwd(), filename), 'utf8');
    const vars = {};
    content.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [key, ...valueParts] = trimmed.split('=');
        vars[key.trim()] = valueParts.join('=').trim();
      }
    });
    return vars;
  } catch (error) {
    return null;
  }
};

// Check configuration
log('blue', '\n🔧 Configuration Analysis:');

const envConfig = loadEnvFile('.env');
const devConfig = loadEnvFile('.env.development');
const prodConfig = loadEnvFile('.env.production');

if (envConfig) {
  const reactAppVars = Object.keys(envConfig).filter(key => key.startsWith('REACT_APP_'));
  log('green', `  ✅ Found ${reactAppVars.length} REACT_APP_ variables in .env`);
  
  // Check critical variables
  const criticalVars = [
    'REACT_APP_API_BASE_URL',
    'REACT_APP_WS_URL',
    'REACT_APP_TOKEN_STORAGE_KEY'
  ];
  
  criticalVars.forEach(varName => {
    if (envConfig[varName]) {
      log('green', `  ✅ ${varName}: ${envConfig[varName]}`);
    } else {
      log('red', `  ❌ ${varName}: MISSING`);
    }
  });
} else {
  log('red', '  ❌ .env file not found or unreadable');
}

// Environment-specific checks
if (devConfig) {
  log('green', '  ✅ Development configuration available');
} else {
  log('yellow', '  ⚠️  No development-specific configuration');
}

if (prodConfig) {
  log('green', '  ✅ Production configuration available');
} else {
  log('yellow', '  ⚠️  No production-specific configuration');
}

// Check package.json scripts
log('blue', '\n📜 Package.json scripts:');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const scripts = packageJson.scripts || {};
  
  const relevantScripts = ['start', 'build', 'test'];
  relevantScripts.forEach(script => {
    if (scripts[script]) {
      log('green', `  ✅ ${script}: ${scripts[script]}`);
    } else {
      log('red', `  ❌ ${script}: MISSING`);
    }
  });
} catch (error) {
  log('red', '  ❌ Could not read package.json');
}

// Security checks
log('blue', '\n🔒 Security Checks:');

// Check if .env.local is gitignored
try {
  const gitignore = fs.readFileSync('.gitignore', 'utf8');
  if (gitignore.includes('.env.local')) {
    log('green', '  ✅ .env.local is gitignored');
  } else {
    log('yellow', '  ⚠️  .env.local should be added to .gitignore');
  }
} catch (error) {
  log('yellow', '  ⚠️  No .gitignore found');
}

// Check for common security issues
if (envConfig) {
  const potentialSecrets = Object.keys(envConfig).filter(key => 
    key.toLowerCase().includes('secret') || 
    key.toLowerCase().includes('key') ||
    key.toLowerCase().includes('password') ||
    key.toLowerCase().includes('token')
  );
  
  if (potentialSecrets.length > 0) {
    log('yellow', '  ⚠️  Potential secrets found in .env (consider moving to .env.local):');
    potentialSecrets.forEach(secret => {
      log('yellow', `    - ${secret}`);
    });
  } else {
    log('green', '  ✅ No obvious secrets in .env file');
  }
}

// Recommendations
log('blue', '\n💡 Recommendations:');

const recommendations = [];

if (!fs.existsSync('.env.example')) {
  recommendations.push('Create .env.example as a template for other developers');
}

if (!devConfig) {
  recommendations.push('Create .env.development for development-specific settings');
}

if (!prodConfig) {
  recommendations.push('Create .env.production for production-specific settings');
}

if (envConfig && envConfig.REACT_APP_ENABLE_DEV_TOOLS === 'true') {
  recommendations.push('Consider disabling dev tools in production (.env.production)');
}

if (recommendations.length > 0) {
  recommendations.forEach((rec, index) => {
    log('yellow', `  ${index + 1}. ${rec}`);
  });
} else {
  log('green', '  ✅ Configuration looks good!');
}

// Usage examples
log('blue', '\n🚀 Usage Examples:');
log('cyan', '  # Start development server');
log('cyan', '  npm start');
log('cyan', '');
log('cyan', '  # Build for production');
log('cyan', '  npm run build');
log('cyan', '');
log('cyan', '  # Override environment variable');
log('cyan', '  REACT_APP_API_BASE_URL=https://api.example.com npm start');
log('cyan', '');
log('cyan', '  # Create local environment file');
log('cyan', '  cp .env.example .env.local');

console.log('\n');
log('green', '🎉 Environment validation complete!');
console.log('');