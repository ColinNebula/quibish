const path = require('path');
const fs = require('fs').promises;

class HealthCheckService {
  constructor() {
    this.checks = [];
    this.status = {
      overall: 'unknown',
      checks: {},
      startupTime: null,
      lastCheck: null
    };
  }

  /**
   * Register a health check
   * @param {string} name - Name of the check
   * @param {Function} checkFn - Function that returns Promise<{status: 'healthy'|'unhealthy', message: string}>
   * @param {number} timeout - Timeout in ms (default: 5000)
   */
  registerCheck(name, checkFn, timeout = 5000) {
    this.checks.push({
      name,
      checkFn,
      timeout,
      lastResult: null,
      lastRun: null
    });
  }

  /**
   * Run all health checks
   * @param {boolean} detailed - Return detailed results
   */
  async runChecks(detailed = false) {
    const startTime = Date.now();
    const results = {};
    let overallStatus = 'healthy';

    console.log('🔍 Running health checks...');

    for (const check of this.checks) {
      try {
        const result = await Promise.race([
          check.checkFn(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), check.timeout)
          )
        ]);

        check.lastResult = result;
        check.lastRun = new Date().toISOString();
        results[check.name] = result;

        if (result.status !== 'healthy') {
          overallStatus = 'unhealthy';
        }

        console.log(`✅ ${check.name}: ${result.status} - ${result.message}`);
      } catch (error) {
        const errorResult = {
          status: 'unhealthy',
          message: error.message || 'Check failed',
          error: error.stack
        };

        check.lastResult = errorResult;
        check.lastRun = new Date().toISOString();
        results[check.name] = errorResult;
        overallStatus = 'unhealthy';

        console.log(`❌ ${check.name}: ${errorResult.status} - ${errorResult.message}`);
      }
    }

    this.status = {
      overall: overallStatus,
      checks: results,
      lastCheck: new Date().toISOString(),
      checkDuration: Date.now() - startTime
    };

    console.log(`🏁 Health check completed in ${this.status.checkDuration}ms - Overall: ${overallStatus}`);

    return detailed ? this.status : { status: overallStatus, message: `${Object.keys(results).length} checks completed` };
  }

  /**
   * Get current health status
   */
  getStatus() {
    return this.status;
  }

  /**
   * Express middleware for health check endpoint
   */
  middleware() {
    return async (req, res) => {
      try {
        const detailed = req.query.detailed === 'true';
        const result = await this.runChecks(detailed);
        
        const statusCode = result.status === 'healthy' || this.status.overall === 'healthy' ? 200 : 503;
        res.status(statusCode).json({
          ...result,
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          version: process.env.npm_package_version || '1.0.0'
        });
      } catch (error) {
        res.status(500).json({
          status: 'error',
          message: 'Health check failed',
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    };
  }
}

// Create health check instance
const healthCheck = new HealthCheckService();

// Register core health checks
healthCheck.registerCheck('database', async () => {
  try {
    // Check if we can connect to the database
    const databaseService = require('../services/databaseService');
    
    // Try to get users (basic DB operation)
    await databaseService.getUsers();
    
    return {
      status: 'healthy',
      message: 'Database connection successful'
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: `Database error: ${error.message}`
    };
  }
});

healthCheck.registerCheck('filesystem', async () => {
  try {
    // Check if required directories exist and are writable
    const requiredDirs = [
      path.join(__dirname, '../uploads'),
      path.join(__dirname, '../uploads/avatars'),
      path.join(__dirname, '../uploads/user-media'),
      path.join(__dirname, '../logs')
    ];

    for (const dir of requiredDirs) {
      try {
        await fs.access(dir, fs.constants.F_OK | fs.constants.W_OK);
      } catch {
        // Create directory if it doesn't exist
        await fs.mkdir(dir, { recursive: true });
      }
    }

    // Test write operation
    const testFile = path.join(__dirname, '../uploads/.health-check');
    await fs.writeFile(testFile, 'health-check-test');
    await fs.unlink(testFile);

    return {
      status: 'healthy',
      message: 'Filesystem access confirmed'
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: `Filesystem error: ${error.message}`
    };
  }
});

healthCheck.registerCheck('dependencies', async () => {
  try {
    // Check critical dependencies
    const criticalDeps = ['express', 'cors', 'bcrypt', 'jsonwebtoken'];
    const missingDeps = [];

    for (const dep of criticalDeps) {
      try {
        require(dep);
      } catch {
        missingDeps.push(dep);
      }
    }

    if (missingDeps.length > 0) {
      return {
        status: 'unhealthy',
        message: `Missing dependencies: ${missingDeps.join(', ')}`
      };
    }

    return {
      status: 'healthy',
      message: 'All critical dependencies available'
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: `Dependency check error: ${error.message}`
    };
  }
});

healthCheck.registerCheck('memory', async () => {
  try {
    const memUsage = process.memoryUsage();
    const totalMem = memUsage.heapTotal / 1024 / 1024; // MB
    const usedMem = memUsage.heapUsed / 1024 / 1024; // MB
    const memPercent = (usedMem / totalMem) * 100;

    if (memPercent > 90) {
      return {
        status: 'unhealthy',
        message: `High memory usage: ${memPercent.toFixed(1)}% (${usedMem.toFixed(1)}MB/${totalMem.toFixed(1)}MB)`
      };
    }

    return {
      status: 'healthy',
      message: `Memory usage: ${memPercent.toFixed(1)}% (${usedMem.toFixed(1)}MB/${totalMem.toFixed(1)}MB)`
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: `Memory check error: ${error.message}`
    };
  }
});

healthCheck.registerCheck('environment', async () => {
  try {
    const requiredEnvVars = ['NODE_ENV'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
      return {
        status: 'unhealthy',
        message: `Missing environment variables: ${missingVars.join(', ')}`
      };
    }

    return {
      status: 'healthy',
      message: `Environment: ${process.env.NODE_ENV || 'development'}`
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: `Environment check error: ${error.message}`
    };
  }
});

module.exports = healthCheck;