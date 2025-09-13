/**
 * Storage Cleanup Scheduler
 * Automated cleanup and maintenance for enhanced storage
 */

const cron = require('node-cron');
const databaseService = require('./databaseService');

class StorageScheduler {
  constructor() {
    this.isRunning = false;
    this.cleanupJobs = new Map();
  }

  /**
   * Start all scheduled tasks
   */
  start() {
    if (this.isRunning) {
      console.log('📅 Storage scheduler already running');
      return;
    }

    console.log('📅 Starting storage cleanup scheduler...');

    // Daily cleanup at 2 AM
    this.cleanupJobs.set('daily', cron.schedule('0 2 * * *', async () => {
      console.log('🧹 Running daily storage cleanup...');
      try {
        const result = await databaseService.cleanupStorage();
        console.log('✅ Daily cleanup completed:', result);
      } catch (error) {
        console.error('❌ Daily cleanup failed:', error);
      }
    }, {
      scheduled: false,
      timezone: "UTC"
    }));

    // Weekly archive at 3 AM on Sundays
    this.cleanupJobs.set('weekly', cron.schedule('0 3 * * 0', async () => {
      console.log('📦 Running weekly archive...');
      try {
        const storage = databaseService.enhancedStorage || require('./enhancedStorage').EnhancedStorage;
        const result = await storage.archiveOldData(7 * 24 * 60 * 60 * 1000); // 7 days
        console.log('✅ Weekly archive completed:', result);
      } catch (error) {
        console.error('❌ Weekly archive failed:', error);
      }
    }, {
      scheduled: false,
      timezone: "UTC"
    }));

    // Hourly memory cleanup during peak hours (9 AM - 6 PM)
    this.cleanupJobs.set('hourly', cron.schedule('0 9-18 * * *', async () => {
      console.log('💾 Running hourly memory optimization...');
      try {
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
          console.log('🗑️ Forced garbage collection');
        }

        // Get memory stats
        const stats = await databaseService.getEnhancedStats();
        const memoryUsage = process.memoryUsage();
        const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
        const heapPercentage = Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100);

        console.log(`📊 Memory: ${heapUsedMB}MB (${heapPercentage}%)`);

        // Cleanup if memory usage is high
        if (heapPercentage > 80) {
          console.log('⚠️ High memory usage detected, running cleanup...');
          await databaseService.cleanupStorage();
        }
      } catch (error) {
        console.error('❌ Hourly cleanup failed:', error);
      }
    }, {
      scheduled: false,
      timezone: "UTC"
    }));

    // Start all jobs
    this.cleanupJobs.forEach((job, name) => {
      job.start();
      console.log(`✅ Started ${name} cleanup job`);
    });

    this.isRunning = true;
    console.log('📅 Storage scheduler started with 3 jobs');
  }

  /**
   * Stop all scheduled tasks
   */
  stop() {
    if (!this.isRunning) {
      console.log('📅 Storage scheduler not running');
      return;
    }

    console.log('📅 Stopping storage scheduler...');

    this.cleanupJobs.forEach((job, name) => {
      job.stop();
      console.log(`🛑 Stopped ${name} cleanup job`);
    });

    this.isRunning = false;
    console.log('📅 Storage scheduler stopped');
  }

  /**
   * Run immediate cleanup
   */
  async runImmediate() {
    console.log('🧹 Running immediate storage cleanup...');
    try {
      const result = await databaseService.cleanupStorage();
      console.log('✅ Immediate cleanup completed:', result);
      return result;
    } catch (error) {
      console.error('❌ Immediate cleanup failed:', error);
      throw error;
    }
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      jobs: Array.from(this.cleanupJobs.keys()),
      nextRuns: this.isRunning ? Array.from(this.cleanupJobs.entries()).map(([name, job]) => ({
        name,
        nextRun: job.getStatus()?.next || 'Unknown'
      })) : []
    };
  }
}

// Create singleton instance
const storageScheduler = new StorageScheduler();

module.exports = storageScheduler;