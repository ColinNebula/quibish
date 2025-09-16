// Code Integrity Verification System
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class CodeIntegrityChecker {
  constructor() {
    this.checksumFile = path.join(__dirname, '..', 'integrity-checksums.json');
    this.protectedFiles = [
      'src/components/Home/ProChat.js',
      'src/context/AuthContext.js',
      'src/utils/messageUtils.js',
      'src/services/apiClient.js',
      'package.json'
    ];
  }

  // Generate checksums for all protected files
  generateChecksums() {
    const checksums = {};
    
    this.protectedFiles.forEach(filePath => {
      const fullPath = path.join(__dirname, '..', filePath);
      
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        const hash = crypto.createHash('sha256').update(content).digest('hex');
        checksums[filePath] = {
          hash,
          size: content.length,
          modified: fs.statSync(fullPath).mtime.toISOString()
        };
      }
    });

    fs.writeFileSync(this.checksumFile, JSON.stringify(checksums, null, 2));
    console.log('✅ Checksums generated for', Object.keys(checksums).length, 'files');
    return checksums;
  }

  // Verify file integrity against stored checksums
  verifyIntegrity() {
    if (!fs.existsSync(this.checksumFile)) {
      console.log('⚠️ No checksum file found. Generating initial checksums...');
      return this.generateChecksums();
    }

    const storedChecksums = JSON.parse(fs.readFileSync(this.checksumFile, 'utf8'));
    const issues = [];

    this.protectedFiles.forEach(filePath => {
      const fullPath = path.join(__dirname, '..', filePath);
      
      if (!fs.existsSync(fullPath)) {
        issues.push(`❌ CRITICAL: File deleted - ${filePath}`);
        return;
      }

      const content = fs.readFileSync(fullPath, 'utf8');
      const currentHash = crypto.createHash('sha256').update(content).digest('hex');
      const storedData = storedChecksums[filePath];

      if (!storedData) {
        issues.push(`⚠️ NEW FILE: ${filePath} (not in original checksums)`);
        return;
      }

      if (currentHash !== storedData.hash) {
        const currentSize = content.length;
        const sizeDiff = currentSize - storedData.size;
        issues.push(`🔴 MODIFIED: ${filePath} (hash mismatch, size: ${sizeDiff > 0 ? '+' : ''}${sizeDiff} bytes)`);
      }
    });

    if (issues.length === 0) {
      console.log('✅ All files verified - No integrity issues detected');
    } else {
      console.log('🚨 INTEGRITY ISSUES DETECTED:');
      issues.forEach(issue => console.log(issue));
    }

    return issues;
  }

  // Create a tamper-evident signature
  createSignature() {
    const metadata = {
      timestamp: new Date().toISOString(),
      files: this.protectedFiles,
      environment: process.env.NODE_ENV || 'development',
      version: require('../package.json').version,
      author: 'ColinNebula'
    };

    const signature = crypto
      .createHash('sha256')
      .update(JSON.stringify(metadata))
      .digest('hex');

    const signatureData = {
      ...metadata,
      signature,
      protected: true
    };

    fs.writeFileSync(
      path.join(__dirname, '..', 'code-signature.json'), 
      JSON.stringify(signatureData, null, 2)
    );

    console.log('🔐 Code signature created:', signature.substring(0, 16) + '...');
    return signature;
  }

  // Monitor files for real-time changes
  watchFiles() {
    console.log('👁️ Starting file integrity monitoring...');
    
    this.protectedFiles.forEach(filePath => {
      const fullPath = path.join(__dirname, '..', filePath);
      
      if (fs.existsSync(fullPath)) {
        fs.watchFile(fullPath, { interval: 5000 }, (curr, prev) => {
          if (curr.mtime !== prev.mtime) {
            console.log(`🔔 File changed: ${filePath} at ${new Date().toLocaleString()}`);
            this.verifyIntegrity();
          }
        });
      }
    });
  }
}

// Command line interface
const action = process.argv[2];
const checker = new CodeIntegrityChecker();

switch (action) {
  case 'generate':
    checker.generateChecksums();
    break;
  case 'verify':
    checker.verifyIntegrity();
    break;
  case 'sign':
    checker.createSignature();
    break;
  case 'watch':
    checker.watchFiles();
    break;
  default:
    console.log('Usage: node integrity-check.js [generate|verify|sign|watch]');
    console.log('  generate - Create checksums for protected files');
    console.log('  verify   - Check files against stored checksums');
    console.log('  sign     - Create tamper-evident signature');
    console.log('  watch    - Monitor files for changes');
}

module.exports = CodeIntegrityChecker;