const healthCheck = require('../middleware/healthCheck');
const path = require('path');
const fs = require('fs').promises;

class StartupService {
  constructor() {
    this.initialized = false;
    this.startupStartTime = null;
    this.initializationSteps = [];
  }

  /**
   * Initialize the backend with comprehensive checks
   */
  async initialize() {
    this.startupStartTime = Date.now();
    console.log('🚀 Starting backend initialization...');

    try {
      // Step 1: Environment validation
      await this.validateEnvironment();
      
      // Step 2: Directory structure
      await this.ensureDirectoryStructure();
      
      // Step 3: Dependencies check
      await this.validateDependencies();
      
      // Step 4: Database initialization
      await this.initializeDatabase();
      
      // Step 5: Run health checks
      await this.runInitialHealthChecks();
      
      // Step 6: Setup monitoring
      await this.setupMonitoring();

      this.initialized = true;
      const initTime = Date.now() - this.startupStartTime;
      
      console.log(`✅ Backend initialization completed in ${initTime}ms`);
      console.log('🎯 Server is ready to accept connections');
      
      return {
        success: true,
        initializationTime: initTime,
        steps: this.initializationSteps
      };

    } catch (error) {
      console.error('❌ Backend initialization failed:', error.message);
      console.error('📋 Completed steps:', this.initializationSteps.map(s => s.name).join(', '));
      
      throw new Error(`Initialization failed: ${error.message}`);
    }
  }

  /**
   * Validate environment setup
   */
  async validateEnvironment() {
    const stepName = 'Environment Validation';
    console.log(`📋 ${stepName}...`);
    
    try {
      // Set default NODE_ENV if not set
      if (!process.env.NODE_ENV) {
        process.env.NODE_ENV = 'development';
        console.log('🔧 Set NODE_ENV to development');
      }

      // Validate Node.js version
      const nodeVersion = process.version;
      const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
      
      if (majorVersion < 14) {
        throw new Error(`Node.js version ${nodeVersion} is not supported. Please use Node.js 14 or higher.`);
      }

      // Check available memory
      const totalMem = process.memoryUsage().heapTotal / 1024 / 1024;
      if (totalMem < 100) { // Less than 100MB heap
        console.warn('⚠️ Low memory detected. Consider increasing Node.js heap size.');
      }

      this.addStep(stepName, 'success', `Node.js ${nodeVersion}, ENV: ${process.env.NODE_ENV}`);
    } catch (error) {
      this.addStep(stepName, 'failed', error.message);
      throw error;
    }
  }

  /**
   * Ensure all required directories exist
   */
  async ensureDirectoryStructure() {
    const stepName = 'Directory Structure';
    console.log(`📁 ${stepName}...`);
    
    try {
      const requiredDirs = [
        path.join(__dirname, '../uploads'),
        path.join(__dirname, '../uploads/avatars'),
        path.join(__dirname, '../uploads/user-media'),
        path.join(__dirname, '../logs'),
        path.join(__dirname, '../storage'),
        path.join(__dirname, '../storage/data')
      ];

      const createdDirs = [];
      
      for (const dir of requiredDirs) {
        try {
          await fs.access(dir);
        } catch {
          await fs.mkdir(dir, { recursive: true });
          createdDirs.push(path.basename(dir));
        }
      }

      const message = createdDirs.length > 0 
        ? `Created directories: ${createdDirs.join(', ')}`
        : 'All directories exist';

      this.addStep(stepName, 'success', message);
    } catch (error) {
      this.addStep(stepName, 'failed', error.message);
      throw error;
    }
  }

  /**
   * Validate all required dependencies
   */
  async validateDependencies() {
    const stepName = 'Dependencies Check';
    console.log(`📦 ${stepName}...`);
    
    try {
      const criticalDeps = [
        'express',
        'cors',
        'bcrypt',
        'jsonwebtoken',
        'multer',
        'path',
        'fs'
      ];

      const missingDeps = [];
      const loadedDeps = [];

      for (const dep of criticalDeps) {
        try {
          require(dep);
          loadedDeps.push(dep);
        } catch {
          missingDeps.push(dep);
        }
      }

      if (missingDeps.length > 0) {
        throw new Error(`Missing critical dependencies: ${missingDeps.join(', ')}`);
      }

      this.addStep(stepName, 'success', `${loadedDeps.length} dependencies validated`);
    } catch (error) {
      this.addStep(stepName, 'failed', error.message);
      throw error;
    }
  }

  /**
   * Initialize database connections
   */
  async initializeDatabase() {
    const stepName = 'Database Initialization';
    console.log(`🗄️ ${stepName}...`);
    
    try {
      const databaseService = require('../services/databaseService');
      
      // Test database connection
      await databaseService.getUsers();
      
      this.addStep(stepName, 'success', 'Database connection established');
    } catch (error) {
      // Database might not be available, but we can continue with in-memory storage
      console.warn('⚠️ Database not available, using in-memory storage');
      this.addStep(stepName, 'warning', 'Using in-memory storage (database unavailable)');
    }
  }

  /**
   * Run initial health checks
   */
  async runInitialHealthChecks() {
    const stepName = 'Health Checks';
    console.log(`🔍 ${stepName}...`);
    
    try {
      const result = await healthCheck.runChecks(true);
      
      if (result.overall === 'unhealthy') {
        const unhealthyChecks = Object.entries(result.checks)
          .filter(([, check]) => check.status === 'unhealthy')
          .map(([name]) => name);
        
        console.warn(`⚠️ Some health checks failed: ${unhealthyChecks.join(', ')}`);
        this.addStep(stepName, 'warning', `${unhealthyChecks.length} checks failed but continuing`);
      } else {
        this.addStep(stepName, 'success', 'All health checks passed');
      }
    } catch (error) {
      this.addStep(stepName, 'failed', error.message);
      throw error;
    }
  }

  /**
   * Setup monitoring and logging
   */
  async setupMonitoring() {
    const stepName = 'Monitoring Setup';
    console.log(`📊 ${stepName}...`);
    
    try {
      // Setup periodic health checks
      setInterval(async () => {
        try {
          await healthCheck.runChecks();
        } catch (error) {
          console.error('⚠️ Periodic health check failed:', error.message);
        }
      }, 5 * 60 * 1000); // Every 5 minutes

      // Setup process monitoring
      process.on('uncaughtException', (error) => {
        console.error('🚨 Uncaught Exception:', error);
        // Don't exit immediately, log it for debugging
      });

      process.on('unhandledRejection', (reason, promise) => {
        console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
      });

      this.addStep(stepName, 'success', 'Monitoring and error handling configured');
    } catch (error) {
      this.addStep(stepName, 'failed', error.message);
      throw error;
    }
  }

  /**
   * Add a step to the initialization log
   */
  addStep(name, status, message) {
    const step = {
      name,
      status,
      message,
      timestamp: new Date().toISOString(),
      duration: this.startupStartTime ? Date.now() - this.startupStartTime : 0
    };
    
    this.initializationSteps.push(step);
    
    const emoji = status === 'success' ? '✅' : status === 'warning' ? '⚠️' : '❌';
    console.log(`  ${emoji} ${name}: ${message}`);
  }

  /**
   * Check if the service is initialized
   */
  isInitialized() {
    return this.initialized;
  }

  /**
   * Get initialization status
   */
  getInitializationStatus() {
    return {
      initialized: this.initialized,
      steps: this.initializationSteps,
      startupTime: this.startupStartTime,
      totalDuration: this.startupStartTime ? Date.now() - this.startupStartTime : 0
    };
  }

  /**
   * Express middleware to ensure initialization
   */
  requireInitialization() {
    return (req, res, next) => {
      if (!this.initialized) {
        return res.status(503).json({
          error: 'Service Unavailable',
          message: 'Server is still initializing',
          status: this.getInitializationStatus()
        });
      }
      next();
    };
  }
}

module.exports = new StartupService();