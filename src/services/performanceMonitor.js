// Simplified performance monitor
class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.initialized = false;
  }

  async initializePerformanceMonitoring() {
    if (this.initialized) return;
    
    try {
      console.log('Performance monitoring initialized (simplified)');
      this.initialized = true;
    } catch (error) {
      console.warn('Performance monitoring initialization failed:', error);
    }
  }

  logMetric(name, value, rating = 'good') {
    this.metrics.set(name, { value, rating, timestamp: Date.now() });
    console.log(`Performance metric: ${name} = ${value} (${rating})`);
  }

  getMetrics() {
    return Object.fromEntries(this.metrics);
  }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

export default performanceMonitor;