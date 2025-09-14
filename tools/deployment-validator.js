/**
 * Deployment Validation Script
 * Automated testing for production deployment
 */

const path = require('path');
const fs = require('fs');

class DeploymentValidator {
  constructor() {
    this.buildPath = path.join(__dirname, '..', 'build');
    this.results = {
      files: {},
      features: {},
      performance: {},
      errors: []
    };
  }

  async validateDeployment() {
    console.log('🔍 Starting deployment validation...');
    
    try {
      // Validate build files
      await this.validateBuildFiles();
      
      // Validate feature integration
      await this.validateFeatureIntegration();
      
      // Validate performance assets
      await this.validatePerformanceAssets();
      
      // Generate validation report
      this.generateValidationReport();
      
      return this.results;
      
    } catch (error) {
      console.error('❌ Deployment validation failed:', error);
      this.results.errors.push(error.message);
      return this.results;
    }
  }

  async validateBuildFiles() {
    console.log('📁 Validating build files...');
    
    const requiredFiles = [
      'index.html',
      'manifest.json',
      'static/css',
      'static/js'
    ];

    for (const file of requiredFiles) {
      const filePath = path.join(this.buildPath, file);
      const exists = fs.existsSync(filePath);
      
      this.results.files[file] = {
        exists: exists,
        path: filePath
      };
      
      if (!exists) {
        this.results.errors.push(`Missing required file: ${file}`);
      }
    }

    // Check index.html for modern features
    if (this.results.files['index.html'].exists) {
      const indexContent = fs.readFileSync(path.join(this.buildPath, 'index.html'), 'utf8');
      
      this.results.files['index.html'].features = {
        hasViewportMeta: indexContent.includes('viewport'),
        hasManifestLink: indexContent.includes('manifest.json'),
        hasServiceWorker: indexContent.includes('serviceWorker'),
        hasModernCSS: indexContent.includes('dvh') || indexContent.includes('svh'),
        hasAdaptiveUI: indexContent.includes('adaptive-ui')
      };
    }

    console.log('✅ Build files validation completed');
  }

  async validateFeatureIntegration() {
    console.log('🚀 Validating feature integration...');
    
    const features = [
      'modernViewportUtils',
      'advancedTouchSystem', 
      'nextGenPWAService',
      'smartphonePerformanceOptimizer',
      'adaptiveUIManager',
      'testingSuite',
      'compatibilityValidator'
    ];

    // Check if feature files exist in build
    const staticJsPath = path.join(this.buildPath, 'static', 'js');
    
    if (fs.existsSync(staticJsPath)) {
      const jsFiles = fs.readdirSync(staticJsPath);
      const mainJsFile = jsFiles.find(file => file.startsWith('main.') && file.endsWith('.js'));
      
      if (mainJsFile) {
        const mainJsContent = fs.readFileSync(path.join(staticJsPath, mainJsFile), 'utf8');
        
        for (const feature of features) {
          const isIncluded = mainJsContent.includes(feature) || 
                           mainJsContent.includes(feature.replace(/([A-Z])/g, '-$1').toLowerCase());
          
          this.results.features[feature] = {
            included: isIncluded,
            status: isIncluded ? 'INTEGRATED' : 'MISSING'
          };
          
          if (!isIncluded) {
            console.warn(`⚠️ Feature not found in build: ${feature}`);
          }
        }
      } else {
        this.results.errors.push('Main JavaScript file not found in build');
      }
    } else {
      this.results.errors.push('Static JavaScript directory not found');
    }

    console.log('✅ Feature integration validation completed');
  }

  async validatePerformanceAssets() {
    console.log('⚡ Validating performance assets...');
    
    const staticPath = path.join(this.buildPath, 'static');
    
    if (fs.existsSync(staticPath)) {
      // Check CSS files
      const cssPath = path.join(staticPath, 'css');
      if (fs.existsSync(cssPath)) {
        const cssFiles = fs.readdirSync(cssPath);
        const totalCSSSize = cssFiles.reduce((total, file) => {
          const filePath = path.join(cssPath, file);
          const stats = fs.statSync(filePath);
          return total + stats.size;
        }, 0);
        
        this.results.performance.css = {
          files: cssFiles.length,
          totalSize: totalCSSSize,
          averageSize: cssFiles.length > 0 ? totalCSSSize / cssFiles.length : 0,
          status: totalCSSSize < 500000 ? 'GOOD' : totalCSSSize < 1000000 ? 'FAIR' : 'POOR'
        };
      }

      // Check JS files
      const jsPath = path.join(staticPath, 'js');
      if (fs.existsSync(jsPath)) {
        const jsFiles = fs.readdirSync(jsPath);
        const totalJSSize = jsFiles.reduce((total, file) => {
          const filePath = path.join(jsPath, file);
          const stats = fs.statSync(filePath);
          return total + stats.size;
        }, 0);
        
        this.results.performance.js = {
          files: jsFiles.length,
          totalSize: totalJSSize,
          averageSize: jsFiles.length > 0 ? totalJSSize / jsFiles.length : 0,
          status: totalJSSize < 2000000 ? 'GOOD' : totalJSSize < 5000000 ? 'FAIR' : 'POOR'
        };
      }

      // Check for service worker
      const swPath = path.join(this.buildPath, 'service-worker.js');
      this.results.performance.serviceWorker = {
        exists: fs.existsSync(swPath),
        size: fs.existsSync(swPath) ? fs.statSync(swPath).size : 0
      };
    }

    console.log('✅ Performance assets validation completed');
  }

  generateValidationReport() {
    console.log('\n📊 DEPLOYMENT VALIDATION REPORT');
    console.log('================================');
    
    // File validation summary
    console.log('\n📁 Build Files:');
    let filesPass = 0;
    let filesTotal = Object.keys(this.results.files).length;
    
    for (const [file, result] of Object.entries(this.results.files)) {
      const icon = result.exists ? '✅' : '❌';
      console.log(`${icon} ${file}`);
      if (result.exists) filesPass++;
      
      if (result.features) {
        for (const [feature, hasFeature] of Object.entries(result.features)) {
          const featureIcon = hasFeature ? '✅' : '⚠️';
          console.log(`   ${featureIcon} ${feature}`);
        }
      }
    }
    
    // Feature integration summary
    console.log('\n🚀 Feature Integration:');
    let featuresPass = 0;
    let featuresTotal = Object.keys(this.results.features).length;
    
    for (const [feature, result] of Object.entries(this.results.features)) {
      const icon = result.included ? '✅' : '❌';
      console.log(`${icon} ${feature}: ${result.status}`);
      if (result.included) featuresPass++;
    }
    
    // Performance summary
    console.log('\n⚡ Performance Assets:');
    if (this.results.performance.css) {
      const css = this.results.performance.css;
      console.log(`📄 CSS: ${css.files} files, ${(css.totalSize / 1024).toFixed(1)}KB total (${css.status})`);
    }
    
    if (this.results.performance.js) {
      const js = this.results.performance.js;
      console.log(`🔧 JavaScript: ${js.files} files, ${(js.totalSize / 1024).toFixed(1)}KB total (${js.status})`);
    }
    
    if (this.results.performance.serviceWorker) {
      const sw = this.results.performance.serviceWorker;
      const icon = sw.exists ? '✅' : '❌';
      console.log(`${icon} Service Worker: ${sw.exists ? 'Present' : 'Missing'}`);
    }
    
    // Overall status
    console.log('\n📈 Overall Status:');
    console.log(`Files: ${filesPass}/${filesTotal} (${((filesPass/filesTotal)*100).toFixed(1)}%)`);
    console.log(`Features: ${featuresPass}/${featuresTotal} (${((featuresPass/featuresTotal)*100).toFixed(1)}%)`);
    
    // Errors
    if (this.results.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.results.errors.forEach(error => {
        console.log(`  • ${error}`);
      });
    }
    
    // Final verdict
    const overallSuccess = filesPass === filesTotal && 
                          featuresPass >= featuresTotal * 0.8 && 
                          this.results.errors.length === 0;
    
    console.log('\n🎯 Final Verdict:');
    if (overallSuccess) {
      console.log('🎉 DEPLOYMENT READY: All validations passed!');
    } else {
      console.log('⚠️ DEPLOYMENT NEEDS ATTENTION: Some issues found');
    }
    
    return overallSuccess;
  }
}

// Export for use in scripts
module.exports = DeploymentValidator;

// Run validation if called directly
if (require.main === module) {
  const validator = new DeploymentValidator();
  validator.validateDeployment().then(results => {
    process.exit(results.errors.length === 0 ? 0 : 1);
  });
}