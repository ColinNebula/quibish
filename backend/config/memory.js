// Memory monitoring utilities
class MemoryMonitor {
  constructor() {
    this.startTime = Date.now();
    this.memorySnapshots = [];
    this.maxSnapshots = 100;
    this.monitoringInterval = null;
  }

  startMonitoring(intervalMs = 60000) {
    // Take a snapshot every interval
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    this.monitoringInterval = setInterval(() => {
      this.takeSnapshot();
    }, intervalMs);
    
    console.log(`📊 Memory monitoring started (interval: ${intervalMs}ms)`);
  }

  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('📊 Memory monitoring stopped');
    }
  }

  getMemoryUsage() {
    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
    const percentage = Math.round((heapUsedMB / heapTotalMB) * 100);
    
    return {
      heapUsed: heapUsedMB,
      heapTotal: heapTotalMB,
      percentage: percentage
    };
  }

  getMemoryReport() {
    const memUsage = process.memoryUsage();
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);
    
    return {
      uptime: `${Math.floor(uptime / 60)}m ${uptime % 60}s`,
      memory: {
        rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
        external: `${Math.round(memUsage.external / 1024 / 1024)}MB`
      },
      timestamp: new Date().toISOString()
    };
  }

  takeSnapshot() {
    const snapshot = this.getMemoryReport();
    this.memorySnapshots.push(snapshot);
    
    // Keep only the last N snapshots
    if (this.memorySnapshots.length > this.maxSnapshots) {
      this.memorySnapshots.shift();
    }
    
    return snapshot;
  }

  getSnapshots() {
    return this.memorySnapshots;
  }

  cleanup() {
    this.stopMonitoring();
    this.memorySnapshots = [];
  }
}

// Export singleton instance
const memoryMonitor = new MemoryMonitor();

module.exports = {
  MemoryMonitor,
  memoryMonitor
};
