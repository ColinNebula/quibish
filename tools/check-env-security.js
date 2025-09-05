#!/usr/bin/env node

/**
 * Environment Security Verification Script
 * This script helps ensure your .env files are properly protected
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = (color, message) => console.log(`${colors[color]}${message}${colors.reset}`);

console.log(`${colors.cyan}
🔒 Environment Security Verification
=====================================
${colors.reset}`);

// Check if .env files exist
const envFiles = ['.env', '.env.development', '.env.production', 'backend/.env'];
const templateFiles = ['.env.example', 'backend/.env.example'];

log('blue', '\n📁 Checking environment files:');
envFiles.forEach(file => {
  const exists = fs.existsSync(file);
  log(exists ? 'green' : 'yellow', `  ${exists ? '✅' : '⚠️ '} ${file} ${exists ? 'exists' : 'missing'}`);
});

log('blue', '\n📋 Checking template files:');
templateFiles.forEach(file => {
  const exists = fs.existsSync(file);
  log(exists ? 'green' : 'red', `  ${exists ? '✅' : '❌'} ${file} ${exists ? 'exists' : 'MISSING - should be committed'}`);
});

// Check git status
log('blue', '\n🔍 Git status check:');
try {
  const gitStatus = execSync('git status --porcelain', { encoding: 'utf8' });
  const envInGit = gitStatus.split('\n').filter(line => line.includes('.env'));
  
  if (envInGit.length === 0) {
    log('green', '  ✅ No .env files found in git staging area');
  } else {
    log('yellow', '  ⚠️  Found .env-related files in git:');
    envInGit.forEach(line => {
      if (line.includes('.env.example')) {
        log('green', `    ✅ ${line} (template file - OK to commit)`);
      } else if (line.includes('.env')) {
        log('red', `    ❌ ${line} (POTENTIAL SECURITY RISK)`);
      } else {
        log('yellow', `    ℹ️  ${line}`);
      }
    });
  }
} catch (error) {
  log('yellow', '  ⚠️  Not a git repository or git not available');
}

// Check .gitignore
log('blue', '\n📝 Checking .gitignore:');
try {
  const gitignore = fs.readFileSync('.gitignore', 'utf8');
  const hasEnvIgnore = gitignore.includes('.env') && gitignore.includes('!.env.example');
  
  if (hasEnvIgnore) {
    log('green', '  ✅ .env files are properly gitignored');
  } else {
    log('red', '  ❌ .env files are NOT properly gitignored');
  }
} catch (error) {
  log('red', '  ❌ .gitignore file not found');
}

// Security recommendations
log('blue', '\n💡 Security Recommendations:');

const recommendations = [
  '🔒 Never commit actual .env files to GitHub',
  '📋 Only commit .env.example as a template',
  '🔑 Use different secrets for different environments',
  '🔄 Rotate secrets regularly',
  '👥 Share secrets securely (not via chat/email)',
  '🧹 Use git reset to unstage any accidentally added .env files'
];

recommendations.forEach(rec => log('cyan', `  ${rec}`));

// Emergency commands
log('blue', '\n🚨 Emergency Commands (if you accidentally committed .env):');
log('red', '  git reset HEAD .env                    # Unstage .env file');
log('red', '  git rm --cached .env                   # Remove from git but keep local');
log('red', '  git commit -m "Remove .env from git"   # Commit the removal');

log('green', '\n🎉 Environment security check complete!\n');