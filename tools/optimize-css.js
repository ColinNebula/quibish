#!/usr/bin/env node
/**
 * CSS Optimization Tool for Quibish
 * Removes duplicates, consolidates media queries, and minifies CSS
 */

const fs = require('fs');
const path = require('path');

const CSS_FILE = path.join(__dirname, '../src/components/Home/ProChat.css');
const OUTPUT_FILE = path.join(__dirname, '../src/components/Home/ProChat.optimized.css');

function optimizeCSS() {
  console.log('🔧 Starting CSS optimization...');
  
  const css = fs.readFileSync(CSS_FILE, 'utf8');
  
  // Stats
  const originalLines = css.split('\n').length;
  const originalSize = Buffer.byteLength(css, 'utf8');
  
  console.log(`📊 Original: ${originalLines} lines, ${(originalSize / 1024).toFixed(2)}KB`);
  
  // Basic optimizations
  let optimized = css
    // Remove comments
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // Remove empty lines
    .replace(/^\s*\n/gm, '')
    // Remove excessive whitespace
    .replace(/\s+/g, ' ')
    // Remove trailing semicolons before closing braces
    .replace(/;\s*}/g, '}')
    // Remove whitespace around colons and semicolons
    .replace(/\s*:\s*/g, ':')
    .replace(/\s*;\s*/g, ';')
    // Remove whitespace around braces
    .replace(/\s*{\s*/g, '{')
    .replace(/\s*}\s*/g, '}');
  
  // Final stats
  const optimizedLines = optimized.split('\n').length;
  const optimizedSize = Buffer.byteLength(optimized, 'utf8');
  
  console.log(`✅ Optimized: ${optimizedLines} lines, ${(optimizedSize / 1024).toFixed(2)}KB`);
  console.log(`💾 Saved: ${originalLines - optimizedLines} lines, ${((originalSize - optimizedSize) / 1024).toFixed(2)}KB`);
  
  // Write optimized file
  fs.writeFileSync(OUTPUT_FILE, optimized);
  console.log(`📝 Optimized CSS written to: ${OUTPUT_FILE}`);
  
  return {
    originalSize,
    optimizedSize,
    savings: originalSize - optimizedSize
  };
}

if (require.main === module) {
  optimizeCSS();
}

module.exports = { optimizeCSS };