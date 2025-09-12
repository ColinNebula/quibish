// Advanced Memory optimization configuration
const memoryConfig = {
  // Node.js heap settings with dynamic sizing
  maxOldSpaceSize: process.env.NODE_MAX_OLD_SPACE_SIZE || Math.min(1024, Math.max(256, Math.floor(require('os').totalmem() / 1024 / 1024 / 4))), // Dynamic: 1/4 of system RAM, min 256MB, max 1GB
  maxSemiSpaceSize: process.env.NODE_MAX_SEMI_SPACE_SIZE || 32, // Increased for better performance
  
  // Adaptive garbage collection settings
  gcInterval: 45000, // 45 seconds - balanced frequency
  adaptiveGC: true, // Enable adaptive GC based on memory pressure
  memoryThreshold: 0.85, // Primary threshold
  criticalThreshold: 0.95, // Critical threshold for emergency cleanup
  adaptiveThreshold: true, // Adjust threshold based on usage patterns
  
  // Adaptive connection limits based on available memory
  maxConnections: Math.min(200, Math.max(50, Math.floor(process.memoryUsage().heapTotal / 1024 / 1024 / 4))),
  connectionTimeout: 25000, // Reduced timeout
  connectionPooling: true, // Enable connection pooling
  
  // Advanced cache settings with memory awareness
  maxCacheSize: 100, // Increased cache size
  adaptiveCacheSize: true, // Adjust cache size based on memory
  cacheTimeout: 600000, // 10 minutes - longer cache retention
  cacheCompressionThreshold: 1024, // Compress cache items > 1KB
  
  // Memory pools for object reuse
  objectPooling: {
    enabled: true,
    maxPoolSize: 1000,
    poolTypes: ['user', 'message', 'file'],
    cleanupInterval: 300000 // 5 minutes
  },
  
  // File upload limits with memory awareness
  maxFileSize: 5 * 1024 * 1024, // 5MB
  maxFiles: 10,
  
  // Database connection pool
  dbPoolSize: 5,
  dbConnectionTimeout: 5000,
  
  // Optimized WebSocket settings with memory management
  maxWebSocketConnections: 50, // Optimized limit
  webSocketTimeout: 20000, // Aggressive timeout
  webSocketCleanupInterval: 60000, // 1 minute cleanup
  webSocketMemoryLimit: 10 * 1024 * 1024, // 10MB per connection
  webSocketBufferLimit: 1024 * 1024, // 1MB buffer limit
  
  // Advanced monitoring settings
  monitoring: {
    enabled: true,
    detailedLogging: process.env.NODE_ENV === 'development',
    memoryReports: true,
    performanceMetrics: true,
    alertThresholds: {
      memory: 0.90,
      cpu: 0.80,
      connections: 0.85
    }
  },
  
  // Memory pressure response strategies
  pressureResponse: {
    level1: { threshold: 0.85, actions: ['cleanup_cache', 'force_gc'] },
    level2: { threshold: 0.90, actions: ['cleanup_cache', 'force_gc', 'close_idle_connections'] },
    level3: { threshold: 0.95, actions: ['emergency_cleanup', 'force_gc', 'reject_new_connections'] }
  }
};

// Advanced Memory monitoring with intelligent optimization
class MemoryMonitor {
  constructor() {
    this.startTime = Date.now();
    this.peakMemory = 0;
    this.gcCount = 0;
    this.memoryHistory = [];
    this.performanceMetrics = {
      avgResponseTime: 0,
      requestCount: 0,
      errorCount: 0
    };
    this.adaptiveThreshold = memoryConfig.memoryThreshold;
    this.pressureLevel = 0;
    this.objectPools = new Map();
    this.lastCleanup = Date.now();
    
    // Initialize object pools
    if (memoryConfig.objectPooling.enabled) {
      this.initializeObjectPools();
    }
  }

  initializeObjectPools() {
    const poolConfig = memoryConfig.objectPooling;
    
    // User object pool
    this.objectPools.set('users', {
      pool: [],
      maxSize: poolConfig.maxPoolSize.users,
      createObject: () => ({ id: null, name: '', email: '', avatar: '', created: null, online: false }),
      resetObject: (obj) => {
        obj.id = null;
        obj.name = '';
        obj.email = '';
        obj.avatar = '';
        obj.created = null;
        obj.online = false;
        return obj;
      }
    });
    
    // Message object pool
    this.objectPools.set('messages', {
      pool: [],
      maxSize: poolConfig.maxPoolSize.messages,
      createObject: () => ({ id: null, content: '', sender: '', timestamp: null, type: 'text' }),
      resetObject: (obj) => {
        obj.id = null;
        obj.content = '';
        obj.sender = '';
        obj.timestamp = null;
        obj.type = 'text';
        return obj;
      }
    });
    
    // File object pool
    this.objectPools.set('files', {
      pool: [],
      maxSize: poolConfig.maxPoolSize.files,
      createObject: () => ({ id: null, name: '', size: 0, type: '', buffer: null }),
      resetObject: (obj) => {
        obj.id = null;
        obj.name = '';
        obj.size = 0;
        obj.type = '';
        obj.buffer = null;
        return obj;
      }
    });
  }

  borrowObject(type) {
    if (!this.objectPools.has(type)) return null;
    
    const pool = this.objectPools.get(type);
    if (pool.pool.length > 0) {
      return pool.pool.pop();
    }
    return pool.createObject();
  }

  returnObject(type, obj) {
    if (!this.objectPools.has(type)) return false;
    
    const pool = this.objectPools.get(type);
    if (pool.pool.length < pool.maxSize) {
      pool.pool.push(pool.resetObject(obj));
      return true;
    }
    return false;
  }

  clearObjectPools() {
    this.objectPools.forEach(pool => {
      pool.pool.length = 0;
    });
  }

  getStats() {
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
    const currentPercentage = usage.percentage;
    
    // Update adaptive threshold based on historical data
    if (this.memoryHistory.length > 10) {
      const avgMemory = this.memoryHistory.slice(-10).reduce((sum, val) => sum + val, 0) / 10;
      this.adaptiveThreshold = Math.max(0.6, Math.min(0.9, avgMemory * 1.1));
    }
    
    // Determine pressure level
    if (currentPercentage > 90) this.pressureLevel = 3; // Critical
    else if (currentPercentage > 80) this.pressureLevel = 2; // High
    else if (currentPercentage > 70) this.pressureLevel = 1; // Medium
    else this.pressureLevel = 0; // Normal
    
    return currentPercentage > (this.adaptiveThreshold * 100);
  }

  getMemoryUsage() {
    const usage = process.memoryUsage();
    const percentage = (usage.heapUsed / usage.heapTotal) * 100;
    
    // Store in history
    this.memoryHistory.push(percentage);
    if (this.memoryHistory.length > 50) {
      this.memoryHistory.shift();
    }
    
    // Update peak memory
    if (usage.rss > this.peakMemory) {
      this.peakMemory = usage.rss;
    }
    
    return {
      rss: Math.round(usage.rss / 1024 / 1024 * 100) / 100,
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024 * 100) / 100,
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024 * 100) / 100,
      external: Math.round(usage.external / 1024 / 1024 * 100) / 100,
      arrayBuffers: Math.round(usage.arrayBuffers / 1024 / 1024 * 100) / 100,
      percentage: Math.round(percentage * 100) / 100,
      pressureLevel: this.pressureLevel
    };
  }

  forceGC() {
    if (global.gc) {
      global.gc();
      this.gcCount++;
      console.log(`🗑️ Forced garbage collection #${this.gcCount}`);
      return true;
    } else {
      console.warn('⚠️ Garbage collection not available. Run with --expose-gc flag.');
      return false;
    }
  }

  executePressureResponse(level) {
    const responses = memoryConfig.pressureResponse;
    
    switch(level) {
      case 1: // Medium pressure
        if (responses.level1.clearCaches) {
          this.clearCaches();
        }
        if (responses.level1.reduceBuffers) {
          this.reduceBuffers();
        }
        break;
        
      case 2: // High pressure
        if (responses.level2.aggressiveGC) {
          this.forceGC();
        }
        if (responses.level2.clearObjectPools) {
          this.clearObjectPools();
        }
        if (responses.level2.closeIdleConnections) {
          this.closeIdleConnections();
        }
        break;
        
      case 3: // Critical pressure
        if (responses.level3.emergencyCleanup) {
          this.emergencyCleanup();
        }
        if (responses.level3.reduceFeatures) {
          this.reduceFeatures();
        }
        break;
    }
  }

  clearCaches() {
    // Clear any application caches
    if (global.appCache) {
      global.appCache.clear();
    }
    console.log('🧹 Cleared application caches');
  }

  reduceBuffers() {
    // Reduce buffer sizes for streams
    try {
      if (process.stdout._writableState) {
        process.stdout._writableState.highWaterMark = Math.min(16384, process.stdout._writableState.highWaterMark);
      }
      if (process.stderr._writableState) {
        process.stderr._writableState.highWaterMark = Math.min(16384, process.stderr._writableState.highWaterMark);
      }
      console.log('📉 Reduced buffer sizes');
    } catch (error) {
      console.warn('⚠️ Could not reduce buffer sizes:', error.message);
    }
  }

  closeIdleConnections() {
    // Close idle WebSocket connections if available
    if (global.wsConnections) {
      const idleConnections = global.wsConnections.filter(conn => 
        Date.now() - conn.lastActivity > memoryConfig.webSocketOptimization.idleTimeout
      );
      idleConnections.forEach(conn => {
        try {
          conn.close();
        } catch (error) {
          console.warn('⚠️ Error closing connection:', error.message);
        }
      });
      console.log(`🔌 Closed ${idleConnections.length} idle connections`);
    }
  }

  emergencyCleanup() {
    console.log('🚨 Emergency memory cleanup initiated');
    this.forceGC();
    this.clearObjectPools();
    this.clearCaches();
    
    // Force cleanup of large objects
    if (global.largeObjectRegistry) {
      global.largeObjectRegistry.clear();
    }
  }

  reduceFeatures() {
    console.log('⚠️ Reducing features due to critical memory pressure');
    // Implement feature reduction logic here
    // This could disable non-essential features temporarily
  }

  startMonitoring() {
    console.log('🔍 Starting advanced memory monitoring...');
    
    // Main monitoring interval
    setInterval(() => {
      const usage = this.getMemoryUsage();
      
      // Check for memory pressure and respond
      if (this.pressureLevel > 0) {
        console.log(`⚠️ Memory pressure level ${this.pressureLevel} detected (${usage.percentage}%)`);
        this.executePressureResponse(this.pressureLevel);
      }
      
      // Detailed logging based on monitoring settings
      if (memoryConfig.monitoring.detailedLogging) {
        console.log(`📊 Memory: ${usage.heapUsed}MB/${usage.heapTotal}MB (${usage.percentage}%) | Pressure: ${this.pressureLevel}`);
      }
      
      // Trigger adaptive GC if needed
      if (memoryConfig.adaptiveGC.enabled && 
          usage.percentage > memoryConfig.adaptiveGC.triggerThreshold * 100) {
        if (Date.now() - this.lastCleanup > memoryConfig.adaptiveGC.minInterval) {
          this.forceGC();
          this.lastCleanup = Date.now();
        }
      }
      
      // Log summary stats periodically
      if (Date.now() - this.startTime > 300000) {
        console.log(`📊 Memory Summary - Current: ${usage.heapUsed}MB, Peak: ${Math.round(this.peakMemory / 1024 / 1024 * 100) / 100}MB, GC Count: ${this.gcCount}`);
        this.startTime = Date.now();
      }
      
    }, memoryConfig.monitoring.interval);
    
    // Performance metrics collection
    if (memoryConfig.monitoring.collectMetrics) {
      setInterval(() => {
        this.collectPerformanceMetrics();
      }, 30000); // Every 30 seconds
    }
    
    // Periodic object pool cleanup
    if (memoryConfig.objectPooling.enabled) {
      setInterval(() => {
        this.cleanupObjectPools();
      }, 300000); // Every 5 minutes
    }
  }

  collectPerformanceMetrics() {
    const usage = this.getMemoryUsage();
    const uptime = Date.now() - this.startTime;
    
    // Store metrics for analysis
    this.performanceMetrics.memoryTrend = this.memoryHistory.slice(-10);
    this.performanceMetrics.currentUsage = usage;
    this.performanceMetrics.uptime = uptime;
    this.performanceMetrics.gcCount = this.gcCount;
    this.performanceMetrics.peakMemory = Math.round(this.peakMemory / 1024 / 1024 * 100) / 100;
    
    if (memoryConfig.monitoring.detailedLogging) {
      console.log('📈 Performance metrics updated');
    }
  }

  cleanupObjectPools() {
    if (!memoryConfig.objectPooling.enabled) return;
    
    let totalCleaned = 0;
    this.objectPools.forEach((pool, type) => {
      const initialSize = pool.pool.length;
      const targetSize = Math.ceil(pool.maxSize * 0.5); // Keep 50% of max
      
      if (initialSize > targetSize) {
        pool.pool.splice(targetSize);
        totalCleaned += (initialSize - targetSize);
      }
    });
    
    if (totalCleaned > 0) {
      console.log(`🧹 Cleaned up ${totalCleaned} pooled objects`);
    }
  }

  cleanup() {
    console.log('🧹 Performing comprehensive memory cleanup...');
    
    // Clear any cached data
    if (global.inMemoryStorage) {
      // Keep only recent messages (last 50)
      if (global.inMemoryStorage.messages && global.inMemoryStorage.messages.length > 50) {
        const originalLength = global.inMemoryStorage.messages.length;
        global.inMemoryStorage.messages = global.inMemoryStorage.messages.slice(-50);
        console.log(`🧹 Cleaned up ${originalLength - 50} old messages from memory`);
      }
      
      // Clean up any temporary data
      if (global.inMemoryStorage.tempData) {
        global.inMemoryStorage.tempData = {};
      }
      
      // Clean up user sessions older than 24 hours
      if (global.inMemoryStorage.userSessions) {
        const cutoff = Date.now() - (24 * 60 * 60 * 1000);
        const initialSessions = Object.keys(global.inMemoryStorage.userSessions).length;
        
        Object.keys(global.inMemoryStorage.userSessions).forEach(sessionId => {
          const session = global.inMemoryStorage.userSessions[sessionId];
          if (session.lastActivity < cutoff) {
            delete global.inMemoryStorage.userSessions[sessionId];
          }
        });
        
        const finalSessions = Object.keys(global.inMemoryStorage.userSessions).length;
        if (initialSessions > finalSessions) {
          console.log(`🧹 Cleaned up ${initialSessions - finalSessions} expired user sessions`);
        }
      }
    }
    
    // Clear any module caches
    const cacheKeys = Object.keys(require.cache).filter(key => 
      key.includes('temp') || key.includes('cache') || key.includes('.tmp')
    );
    cacheKeys.forEach(key => {
      delete require.cache[key];
    });
    
    if (cacheKeys.length > 0) {
      console.log(`🧹 Cleared ${cacheKeys.length} cached modules`);
    }
    
    // Clear object pools if they're getting too large
    if (memoryConfig.objectPooling.enabled) {
      this.cleanupObjectPools();
    }
    
    // Force garbage collection
    this.forceGC();
    
    console.log('✅ Memory cleanup completed');
  }

  // Get comprehensive memory report
  getMemoryReport() {
    const usage = this.getMemoryUsage();
    const uptime = Date.now() - this.startTime;
    
    return {
      current: usage,
      peak: {
        rss: Math.round(this.peakMemory / 1024 / 1024 * 100) / 100
      },
      statistics: {
        uptime: Math.round(uptime / 1000 / 60), // minutes
        gcCount: this.gcCount,
        pressureLevel: this.pressureLevel,
        adaptiveThreshold: Math.round(this.adaptiveThreshold * 100)
      },
      objectPools: memoryConfig.objectPooling.enabled ? 
        Array.from(this.objectPools.entries()).map(([type, pool]) => ({
          type,
          size: pool.pool.length,
          maxSize: pool.maxSize
        })) : [],
      memoryTrend: this.memoryHistory.slice(-10),
      performanceMetrics: this.performanceMetrics
    };
  }
}

// Create and export memory monitor instance
const memoryMonitor = new MemoryMonitor();

// Auto-start monitoring if enabled
if (memoryConfig.monitoring.enabled) {
  memoryMonitor.startMonitoring();
  console.log('🚀 Advanced memory monitoring started automatically');
}

module.exports = {
  memoryConfig,
  memoryMonitor,
  MemoryMonitor
};