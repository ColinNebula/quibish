// Frontend Health Service
class FrontendHealthService {
  constructor() {
    this.isHealthy = true;
    this.lastCheck = Date.now();
    this.errors = [];
  }

  checkHealth() {
    try {
      // Basic health checks
      const memoryUsage = performance.memory ? 
        performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit : 0;
      
      const isHealthy = memoryUsage < 0.9; // Less than 90% memory usage
      
      this.isHealthy = isHealthy;
      this.lastCheck = Date.now();
      
      if (!isHealthy) {
        this.errors.push({
          timestamp: Date.now(),
          type: 'memory',
          message: 'High memory usage detected'
        });
      }
      
      return {
        healthy: isHealthy,
        timestamp: this.lastCheck,
        memoryUsage: memoryUsage,
        errors: this.errors.slice(-5) // Keep last 5 errors
      };
    } catch (error) {
      this.isHealthy = false;
      this.errors.push({
        timestamp: Date.now(),
        type: 'error',
        message: error.message
      });
      
      return {
        healthy: false,
        timestamp: Date.now(),
        error: error.message
      };
    }
  }

  getStatus() {
    return {
      healthy: this.isHealthy,
      lastCheck: this.lastCheck,
      errors: this.errors.slice(-5)
    };
  }

  clearErrors() {
    this.errors = [];
  }
}

export default new FrontendHealthService();