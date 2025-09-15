// System Resource Monitor
const os = require('os');
const process = require('process');

class ResourceMonitor {
  constructor(options = {}) {
    this.options = {
      interval: options.interval || 30000, // 30 seconds
      memoryThreshold: options.memoryThreshold || 0.8, // 80%
      cpuThreshold: options.cpuThreshold || 0.8, // 80%
      ...options
    };
    
    this.metrics = {
      memory: [],
      cpu: [],
      requests: [],
      errors: []
    };
    
    this.isMonitoring = false;
    this.startTime = Date.now();
  }

  start() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.interval = setInterval(() => {
      this.collectMetrics();
    }, this.options.interval);
    
    console.log('📊 Resource monitoring started');
  }

  stop() {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    if (this.interval) {
      clearInterval(this.interval);
    }
    
    console.log('📊 Resource monitoring stopped');
  }

  collectMetrics() {
    const timestamp = Date.now();
    
    // Memory metrics
    const memUsage = process.memoryUsage();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    
    const memoryMetric = {
      timestamp,
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      rss: memUsage.rss,
      systemTotal: totalMemory,
      systemFree: freeMemory,
      systemUsedPercent: ((totalMemory - freeMemory) / totalMemory) * 100
    };
    
    this.metrics.memory.push(memoryMetric);
    
    // CPU metrics
    const cpuUsage = process.cpuUsage();
    const loadAvg = os.loadavg();
    
    const cpuMetric = {
      timestamp,
      user: cpuUsage.user,
      system: cpuUsage.system,
      loadAvg1: loadAvg[0],
      loadAvg5: loadAvg[1],
      loadAvg15: loadAvg[2],
      cores: os.cpus().length
    };
    
    this.metrics.cpu.push(cpuMetric);
    
    // Keep only last 100 entries
    ['memory', 'cpu', 'requests', 'errors'].forEach(metric => {
      if (this.metrics[metric].length > 100) {
        this.metrics[metric] = this.metrics[metric].slice(-100);
      }
    });
    
    // Check thresholds
    this.checkThresholds(memoryMetric, cpuMetric);
  }

  checkThresholds(memoryMetric, cpuMetric) {
    // Memory threshold check
    if (memoryMetric.systemUsedPercent / 100 > this.options.memoryThreshold) {
      console.warn(`⚠️  High memory usage: ${memoryMetric.systemUsedPercent.toFixed(1)}%`);
      this.triggerCleanup();
    }
    
    // CPU threshold check
    if (cpuMetric.loadAvg1 / cpuMetric.cores > this.options.cpuThreshold) {
      console.warn(`⚠️  High CPU load: ${(cpuMetric.loadAvg1 / cpuMetric.cores * 100).toFixed(1)}%`);
    }
    
    // Heap memory check
    const heapUsedPercent = (memoryMetric.heapUsed / memoryMetric.heapTotal) * 100;
    if (heapUsedPercent > 90) {
      console.warn(`⚠️  High heap usage: ${heapUsedPercent.toFixed(1)}%`);
      if (global.gc) {
        console.log('🗑️  Triggering garbage collection');
        global.gc();
      }
    }
  }

  triggerCleanup() {
    // Clear caches and temporary data
    if (typeof global.clearAppCache === 'function') {
      global.clearAppCache();
    }
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  }

  middleware() {
    return (req, res, next) => {
      const start = Date.now();
      
      res.on('finish', () => {
        const responseTime = Date.now() - start;
        this.recordRequest(req, res, responseTime);
      });
      
      next();
    };
  }

  recordRequest(req, res, responseTime) {
    this.metrics.requests.push({
      timestamp: Date.now(),
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });
  }

  recordError(error, req = null) {
    this.metrics.errors.push({
      timestamp: Date.now(),
      message: error.message,
      stack: error.stack,
      url: req?.url,
      method: req?.method,
      ip: req?.ip
    });
  }

  getMetrics() {
    const now = Date.now();
    const uptime = now - this.startTime;
    
    // Calculate averages for last 10 minutes
    const tenMinutesAgo = now - (10 * 60 * 1000);
    
    const recentMemory = this.metrics.memory.filter(m => m.timestamp > tenMinutesAgo);
    const recentCpu = this.metrics.cpu.filter(c => c.timestamp > tenMinutesAgo);
    const recentRequests = this.metrics.requests.filter(r => r.timestamp > tenMinutesAgo);
    const recentErrors = this.metrics.errors.filter(e => e.timestamp > tenMinutesAgo);
    
    return {
      uptime,
      current: {
        memory: this.metrics.memory[this.metrics.memory.length - 1],
        cpu: this.metrics.cpu[this.metrics.cpu.length - 1]
      },
      averages: {
        memoryUsage: recentMemory.length > 0 ?
          recentMemory.reduce((sum, m) => sum + m.systemUsedPercent, 0) / recentMemory.length : 0,
        cpuLoad: recentCpu.length > 0 ?
          recentCpu.reduce((sum, c) => sum + c.loadAvg1, 0) / recentCpu.length : 0,
        responseTime: recentRequests.length > 0 ?
          recentRequests.reduce((sum, r) => sum + r.responseTime, 0) / recentRequests.length : 0
      },
      counts: {
        totalRequests: this.metrics.requests.length,
        recentRequests: recentRequests.length,
        totalErrors: this.metrics.errors.length,
        recentErrors: recentErrors.length,
        errorRate: recentRequests.length > 0 ? 
          (recentErrors.length / recentRequests.length) * 100 : 0
      },
      health: this.getHealthStatus()
    };
  }

  getHealthStatus() {
    const latest = {
      memory: this.metrics.memory[this.metrics.memory.length - 1],
      cpu: this.metrics.cpu[this.metrics.cpu.length - 1]
    };
    
    if (!latest.memory || !latest.cpu) {
      return 'unknown';
    }
    
    const memoryHealth = latest.memory.systemUsedPercent < 80;
    const cpuHealth = (latest.cpu.loadAvg1 / latest.cpu.cores) < 0.8;
    const errorRate = this.getRecentErrorRate();
    
    if (memoryHealth && cpuHealth && errorRate < 5) {
      return 'healthy';
    } else if (errorRate > 20 || latest.memory.systemUsedPercent > 95) {
      return 'critical';
    } else {
      return 'warning';
    }
  }

  getRecentErrorRate() {
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    const recentRequests = this.metrics.requests.filter(r => r.timestamp > fiveMinutesAgo);
    const recentErrors = this.metrics.errors.filter(e => e.timestamp > fiveMinutesAgo);
    
    if (recentRequests.length === 0) return 0;
    return (recentErrors.length / recentRequests.length) * 100;
  }

  getMemoryPressure() {
    const latest = this.metrics.memory[this.metrics.memory.length - 1];
    if (!latest) return 'low';
    
    const heapUsagePercent = (latest.heapUsed / latest.heapTotal) * 100;
    const systemUsagePercent = latest.systemUsedPercent;
    
    if (heapUsagePercent > 90 || systemUsagePercent > 90) return 'high';
    if (heapUsagePercent > 75 || systemUsagePercent > 75) return 'medium';
    return 'low';
  }

  getOptimizationRecommendations() {
    const recommendations = [];
    const latest = {
      memory: this.metrics.memory[this.metrics.memory.length - 1],
      cpu: this.metrics.cpu[this.metrics.cpu.length - 1]
    };
    
    if (latest.memory) {
      const heapPercent = (latest.memory.heapUsed / latest.memory.heapTotal) * 100;
      if (heapPercent > 85) {
        recommendations.push('Consider increasing Node.js heap size or implementing memory pooling');
      }
      if (latest.memory.systemUsedPercent > 80) {
        recommendations.push('High system memory usage detected - consider caching optimization');
      }
    }
    
    if (latest.cpu && (latest.cpu.loadAvg1 / latest.cpu.cores) > 0.7) {
      recommendations.push('High CPU load - consider implementing request throttling or worker processes');
    }
    
    const errorRate = this.getRecentErrorRate();
    if (errorRate > 10) {
      recommendations.push('High error rate detected - check application logs and error handling');
    }
    
    return recommendations;
  }
}

module.exports = ResourceMonitor;