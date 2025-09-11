// Memory optimization configuration
const memoryConfig = {
  // Node.js heap settings
  maxOldSpaceSize: process.env.NODE_MAX_OLD_SPACE_SIZE || 512, // MB
  maxSemiSpaceSize: process.env.NODE_MAX_SEMI_SPACE_SIZE || 16, // MB
  
  // Garbage collection settings
  gcInterval: 30000, // 30 seconds
  memoryThreshold: 0.85, // 85% memory usage threshold
  
  // Connection limits
  maxConnections: 100,
  connectionTimeout: 30000,
  
  // Cache settings
  maxCacheSize: 50, // Maximum items in cache
  cacheTimeout: 300000, // 5 minutes
  
  // File upload limits
  maxFileSize: 5 * 1024 * 1024, // 5MB
  maxFiles: 10,
  
  // Database connection pool
  dbPoolSize: 5,
  dbConnectionTimeout: 5000,
  
  // WebSocket settings
  maxWebSocketConnections: 50,
  webSocketTimeout: 60000
};

// Memory monitoring
class MemoryMonitor {
  constructor() {
    this.startTime = Date.now();
    this.peakMemory = 0;
    this.gcCount = 0;
  }

  getMemoryUsage() {
    const usage = process.memoryUsage();
    const formatBytes = (bytes) => Math.round(bytes / 1024 / 1024 * 100) / 100;
    
    return {
      rss: formatBytes(usage.rss), // Resident Set Size
      heapTotal: formatBytes(usage.heapTotal),
      heapUsed: formatBytes(usage.heapUsed),
      external: formatBytes(usage.external),
      arrayBuffers: formatBytes(usage.arrayBuffers),
      percentage: Math.round((usage.heapUsed / usage.heapTotal) * 100)
    };
  }

  isMemoryHigh() {
    const usage = this.getMemoryUsage();
    return usage.percentage > (memoryConfig.memoryThreshold * 100);
  }

  forceGC() {
    if (global.gc) {
      global.gc();
      this.gcCount++;
      console.log(`🗑️ Forced garbage collection #${this.gcCount}`);
    }
  }

  startMonitoring() {
    setInterval(() => {
      const usage = this.getMemoryUsage();
      
      // Update peak memory
      if (usage.heapUsed > this.peakMemory) {
        this.peakMemory = usage.heapUsed;
      }
      
      // Force GC if memory is high
      if (this.isMemoryHigh()) {
        console.log(`⚠️ High memory usage detected: ${usage.percentage}%`);
        this.forceGC();
      }
      
      // Log memory stats every 5 minutes
      if (Date.now() - this.startTime > 300000) {
        console.log(`📊 Memory Stats - Current: ${usage.heapUsed}MB, Peak: ${this.peakMemory}MB, GC Count: ${this.gcCount}`);
        this.startTime = Date.now();
      }
    }, memoryConfig.gcInterval);
  }

  cleanup() {
    // Clear any cached data
    if (global.inMemoryStorage) {
      // Keep only recent messages (last 100)
      if (global.inMemoryStorage.messages && global.inMemoryStorage.messages.length > 100) {
        global.inMemoryStorage.messages = global.inMemoryStorage.messages.slice(-100);
      }
    }
    
    // Force garbage collection
    this.forceGC();
  }
}

module.exports = {
  memoryConfig,
  MemoryMonitor
};