/**
 * Enhanced Storage Service for Quibish
 * Advanced storage management with compression, caching, and performance optimization
 */

const fs = require('fs').promises;
const path = require('path');
const zlib = require('zlib');
const { promisify } = require('util');
const crypto = require('crypto');

// Compression utilities
const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

class EnhancedStorage {
  constructor() {
    this.cache = new Map(); // In-memory cache
    this.compressionThreshold = 1024; // Compress data > 1KB
    this.maxCacheSize = 100; // Maximum items in cache
    this.cacheHitStats = { hits: 0, misses: 0 };
    this.storageDir = path.join(__dirname, '../storage/enhanced');
    this.indexFile = path.join(this.storageDir, 'index.json');
    this.archiveDir = path.join(this.storageDir, 'archive');
    
    this.initialize();
  }

  /**
   * Initialize storage directories and index
   */
  async initialize() {
    try {
      await fs.mkdir(this.storageDir, { recursive: true });
      await fs.mkdir(this.archiveDir, { recursive: true });
      
      // Load existing index
      try {
        const indexData = await fs.readFile(this.indexFile, 'utf8');
        this.index = JSON.parse(indexData);
      } catch (error) {
        this.index = {
          version: '1.0.0',
          created: new Date().toISOString(),
          files: {},
          stats: {
            totalFiles: 0,
            totalSize: 0,
            compressionRatio: 0
          }
        };
      }
      
      console.log('📦 Enhanced storage initialized');
    } catch (error) {
      console.error('❌ Enhanced storage initialization failed:', error);
    }
  }

  /**
   * Generate storage key hash
   */
  generateKey(category, id) {
    return crypto.createHash('sha256')
      .update(`${category}:${id}`)
      .digest('hex')
      .substring(0, 16);
  }

  /**
   * Compress data if it exceeds threshold
   */
  async compressData(data) {
    const serialized = JSON.stringify(data);
    const originalSize = Buffer.byteLength(serialized, 'utf8');
    
    if (originalSize > this.compressionThreshold) {
      const compressed = await gzip(serialized);
      const compressionRatio = compressed.length / originalSize;
      
      return {
        data: compressed,
        compressed: true,
        originalSize,
        compressedSize: compressed.length,
        compressionRatio
      };
    }
    
    return {
      data: Buffer.from(serialized, 'utf8'),
      compressed: false,
      originalSize,
      compressedSize: originalSize,
      compressionRatio: 1
    };
  }

  /**
   * Decompress data if needed
   */
  async decompressData(buffer, isCompressed) {
    if (isCompressed) {
      const decompressed = await gunzip(buffer);
      return JSON.parse(decompressed.toString('utf8'));
    }
    
    return JSON.parse(buffer.toString('utf8'));
  }

  /**
   * Store data with compression and caching
   */
  async store(category, id, data, options = {}) {
    const key = this.generateKey(category, id);
    const timestamp = new Date().toISOString();
    
    try {
      // Compress data
      const compressed = await this.compressData(data);
      
      // Create metadata
      const metadata = {
        category,
        id,
        key,
        timestamp,
        ...compressed,
        ttl: options.ttl,
        priority: options.priority || 'normal',
        tags: options.tags || []
      };
      
      // Write to file
      const filename = `${key}.dat`;
      const filepath = path.join(this.storageDir, filename);
      await fs.writeFile(filepath, compressed.data);
      
      // Update index
      this.index.files[key] = metadata;
      this.index.stats.totalFiles++;
      this.index.stats.totalSize += compressed.compressedSize;
      
      // Update cache
      this.updateCache(key, data);
      
      // Save index
      await this.saveIndex();
      
      console.log(`💾 Stored ${category}:${id} (${compressed.originalSize}→${compressed.compressedSize} bytes)`);
      
      return { success: true, key, metadata };
    } catch (error) {
      console.error(`❌ Storage failed for ${category}:${id}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Retrieve data with caching
   */
  async retrieve(category, id) {
    const key = this.generateKey(category, id);
    
    // Check cache first
    if (this.cache.has(key)) {
      this.cacheHitStats.hits++;
      console.log(`🎯 Cache hit for ${category}:${id}`);
      return { success: true, data: this.cache.get(key), source: 'cache' };
    }
    
    this.cacheHitStats.misses++;
    
    try {
      // Check if file exists in index
      if (!this.index.files[key]) {
        return { success: false, error: 'Not found' };
      }
      
      const metadata = this.index.files[key];
      
      // Check TTL
      if (metadata.ttl && new Date() > new Date(metadata.timestamp + metadata.ttl)) {
        await this.delete(category, id);
        return { success: false, error: 'Expired' };
      }
      
      // Read file
      const filename = `${key}.dat`;
      const filepath = path.join(this.storageDir, filename);
      const buffer = await fs.readFile(filepath);
      
      // Decompress
      const data = await this.decompressData(buffer, metadata.compressed);
      
      // Update cache
      this.updateCache(key, data);
      
      console.log(`📖 Retrieved ${category}:${id} from storage`);
      
      return { success: true, data, metadata, source: 'storage' };
    } catch (error) {
      console.error(`❌ Retrieval failed for ${category}:${id}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete data
   */
  async delete(category, id) {
    const key = this.generateKey(category, id);
    
    try {
      // Remove from cache
      this.cache.delete(key);
      
      // Remove file
      if (this.index.files[key]) {
        const filename = `${key}.dat`;
        const filepath = path.join(this.storageDir, filename);
        
        try {
          await fs.unlink(filepath);
        } catch (error) {
          // File might not exist, continue
        }
        
        // Update stats
        this.index.stats.totalFiles--;
        this.index.stats.totalSize -= this.index.files[key].compressedSize || 0;
        
        // Remove from index
        delete this.index.files[key];
        
        // Save index
        await this.saveIndex();
        
        console.log(`🗑️ Deleted ${category}:${id}`);
        return { success: true };
      }
      
      return { success: false, error: 'Not found' };
    } catch (error) {
      console.error(`❌ Deletion failed for ${category}:${id}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update cache with LRU eviction
   */
  updateCache(key, data) {
    // Remove if already exists (for LRU)
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    
    // Add to cache
    this.cache.set(key, data);
    
    // Evict oldest if cache is full
    if (this.cache.size > this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }

  /**
   * Archive old data
   */
  async archiveOldData(maxAge = 30 * 24 * 60 * 60 * 1000) { // 30 days
    const cutoffDate = new Date(Date.now() - maxAge);
    let archivedCount = 0;
    
    try {
      for (const [key, metadata] of Object.entries(this.index.files)) {
        if (new Date(metadata.timestamp) < cutoffDate) {
          // Move to archive
          const filename = `${key}.dat`;
          const sourcePath = path.join(this.storageDir, filename);
          const archivePath = path.join(this.archiveDir, filename);
          
          try {
            await fs.rename(sourcePath, archivePath);
            
            // Update metadata
            metadata.archived = true;
            metadata.archivedAt = new Date().toISOString();
            
            archivedCount++;
          } catch (error) {
            console.error(`❌ Failed to archive ${key}:`, error);
          }
        }
      }
      
      await this.saveIndex();
      console.log(`📦 Archived ${archivedCount} old files`);
      
      return { success: true, archivedCount };
    } catch (error) {
      console.error('❌ Archive operation failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Cleanup expired and temporary data
   */
  async cleanup() {
    let cleanedCount = 0;
    
    try {
      for (const [key, metadata] of Object.entries(this.index.files)) {
        let shouldDelete = false;
        
        // Check TTL
        if (metadata.ttl && new Date() > new Date(metadata.timestamp + metadata.ttl)) {
          shouldDelete = true;
        }
        
        // Check if temporary
        if (metadata.tags && metadata.tags.includes('temporary')) {
          shouldDelete = true;
        }
        
        if (shouldDelete) {
          await this.delete(metadata.category, metadata.id);
          cleanedCount++;
        }
      }
      
      console.log(`🧹 Cleaned up ${cleanedCount} expired/temporary files`);
      return { success: true, cleanedCount };
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get storage statistics
   */
  getStats() {
    const cacheHitRate = this.cacheHitStats.hits / (this.cacheHitStats.hits + this.cacheHitStats.misses) || 0;
    
    return {
      ...this.index.stats,
      cache: {
        size: this.cache.size,
        maxSize: this.maxCacheSize,
        hitRate: Math.round(cacheHitRate * 100) / 100,
        hits: this.cacheHitStats.hits,
        misses: this.cacheHitStats.misses
      },
      files: Object.keys(this.index.files).length,
      categories: [...new Set(Object.values(this.index.files).map(f => f.category))]
    };
  }

  /**
   * Save index to disk
   */
  async saveIndex() {
    try {
      await fs.writeFile(this.indexFile, JSON.stringify(this.index, null, 2));
    } catch (error) {
      console.error('❌ Failed to save index:', error);
    }
  }

  /**
   * Search files by criteria
   */
  search(criteria = {}) {
    const results = [];
    
    for (const [key, metadata] of Object.entries(this.index.files)) {
      let matches = true;
      
      if (criteria.category && metadata.category !== criteria.category) {
        matches = false;
      }
      
      if (criteria.tags && !criteria.tags.some(tag => metadata.tags.includes(tag))) {
        matches = false;
      }
      
      if (criteria.since && new Date(metadata.timestamp) < new Date(criteria.since)) {
        matches = false;
      }
      
      if (criteria.until && new Date(metadata.timestamp) > new Date(criteria.until)) {
        matches = false;
      }
      
      if (matches) {
        results.push(metadata);
      }
    }
    
    return results;
  }
}

module.exports = { EnhancedStorage };