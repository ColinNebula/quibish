/**
 * Enhanced File Storage Service
 * Advanced file management with deduplication, thumbnails, and optimization
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { EnhancedStorage } = require('./enhancedStorage');

// Optional Sharp dependency for image processing
let sharp = null;
try {
  sharp = require('sharp');
} catch (error) {
  console.log('📸 Sharp not available - image optimization disabled');
}

class EnhancedFileStorage {
  constructor() {
    this.storage = new EnhancedStorage();
    this.uploadsDir = path.join(__dirname, '../uploads/enhanced');
    this.thumbnailsDir = path.join(this.uploadsDir, 'thumbnails');
    this.tempDir = path.join(this.uploadsDir, 'temp');
    
    // File type configurations
    this.imageTypes = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
    this.videoTypes = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm'];
    this.audioTypes = ['.mp3', '.wav', '.ogg', '.m4a', '.flac'];
    this.documentTypes = ['.pdf', '.doc', '.docx', '.txt', '.rtf'];
    
    // Size limits (in bytes)
    this.maxFileSizes = {
      image: 10 * 1024 * 1024, // 10MB
      video: 100 * 1024 * 1024, // 100MB
      audio: 50 * 1024 * 1024, // 50MB
      document: 25 * 1024 * 1024, // 25MB
      other: 10 * 1024 * 1024 // 10MB
    };
    
    this.initialize();
  }

  /**
   * Initialize storage directories
   */
  async initialize() {
    try {
      await fs.mkdir(this.uploadsDir, { recursive: true });
      await fs.mkdir(this.thumbnailsDir, { recursive: true });
      await fs.mkdir(this.tempDir, { recursive: true });
      
      console.log('📁 Enhanced file storage initialized');
    } catch (error) {
      console.error('❌ File storage initialization failed:', error);
    }
  }

  /**
   * Calculate file hash for deduplication
   */
  async calculateFileHash(filePath) {
    const hash = crypto.createHash('sha256');
    const fileBuffer = await fs.readFile(filePath);
    hash.update(fileBuffer);
    return hash.digest('hex');
  }

  /**
   * Determine file type category
   */
  getFileCategory(extension) {
    const ext = extension.toLowerCase();
    
    if (this.imageTypes.includes(ext)) return 'image';
    if (this.videoTypes.includes(ext)) return 'video';
    if (this.audioTypes.includes(ext)) return 'audio';
    if (this.documentTypes.includes(ext)) return 'document';
    
    return 'other';
  }

  /**
   * Validate file
   */
  async validateFile(filePath, originalName) {
    const stats = await fs.stat(filePath);
    const extension = path.extname(originalName);
    const category = this.getFileCategory(extension);
    const maxSize = this.maxFileSizes[category];
    
    if (stats.size > maxSize) {
      throw new Error(`File too large. Maximum size for ${category} files: ${Math.round(maxSize / 1024 / 1024)}MB`);
    }
    
    return { category, size: stats.size, extension };
  }

  /**
   * Create thumbnail for images
   */
  async createThumbnail(filePath, fileHash) {
    if (!sharp) {
      console.log('📸 Sharp not available - skipping thumbnail creation');
      return null;
    }
    
    try {
      const thumbnailPath = path.join(this.thumbnailsDir, `${fileHash}_thumb.webp`);
      
      await sharp(filePath)
        .resize(300, 300, { 
          fit: 'inside',
          withoutEnlargement: true 
        })
        .webp({ quality: 80 })
        .toFile(thumbnailPath);
      
      return thumbnailPath;
    } catch (error) {
      console.error('❌ Thumbnail creation failed:', error);
      return null;
    }
  }

  /**
   * Optimize image
   */
  async optimizeImage(filePath, fileHash, category) {
    if (!sharp) {
      console.log('📸 Sharp not available - skipping image optimization');
      return filePath;
    }
    
    try {
      const optimizedPath = path.join(this.uploadsDir, `${fileHash}_opt${path.extname(filePath)}`);
      
      let pipeline = sharp(filePath);
      
      // Resize if too large
      const metadata = await pipeline.metadata();
      if (metadata.width > 1920 || metadata.height > 1920) {
        pipeline = pipeline.resize(1920, 1920, { 
          fit: 'inside',
          withoutEnlargement: true 
        });
      }
      
      // Optimize based on format
      if (metadata.format === 'jpeg') {
        pipeline = pipeline.jpeg({ quality: 85, progressive: true });
      } else if (metadata.format === 'png') {
        pipeline = pipeline.png({ compressionLevel: 8 });
      } else if (metadata.format === 'webp') {
        pipeline = pipeline.webp({ quality: 85 });
      }
      
      await pipeline.toFile(optimizedPath);
      
      // Check if optimization reduced file size
      const originalStats = await fs.stat(filePath);
      const optimizedStats = await fs.stat(optimizedPath);
      
      if (optimizedStats.size < originalStats.size) {
        console.log(`🎯 Image optimized: ${originalStats.size} → ${optimizedStats.size} bytes`);
        return optimizedPath;
      } else {
        // Remove optimized file if it's not smaller
        await fs.unlink(optimizedPath);
        return filePath;
      }
    } catch (error) {
      console.error('❌ Image optimization failed:', error);
      return filePath;
    }
  }

  /**
   * Store file with advanced features
   */
  async storeFile(filePath, originalName, userId, options = {}) {
    try {
      // Validate file
      const validation = await this.validateFile(filePath, originalName);
      
      // Calculate hash for deduplication
      const fileHash = await this.calculateFileHash(filePath);
      
      // Check if file already exists
      const existingFile = await this.storage.retrieve('file', fileHash);
      if (existingFile.success) {
        console.log(`♻️ File already exists, using existing copy: ${fileHash}`);
        
        // Create new reference
        const reference = {
          fileId: fileHash,
          originalName,
          userId,
          uploadedAt: new Date().toISOString(),
          ...validation
        };
        
        await this.storage.store('file_reference', `${userId}_${Date.now()}`, reference);
        
        return {
          success: true,
          fileId: fileHash,
          deduplicated: true,
          ...validation
        };
      }
      
      // Process file based on type
      let processedPath = filePath;
      let thumbnailPath = null;
      
      if (validation.category === 'image') {
        // Create thumbnail
        thumbnailPath = await this.createThumbnail(filePath, fileHash);
        
        // Optimize image
        processedPath = await this.optimizeImage(filePath, fileHash, validation.category);
      }
      
      // Move file to permanent storage
      const finalPath = path.join(this.uploadsDir, `${fileHash}${validation.extension}`);
      await fs.rename(processedPath, finalPath);
      
      // Create file metadata
      const metadata = {
        fileId: fileHash,
        originalName,
        fileName: `${fileHash}${validation.extension}`,
        filePath: finalPath,
        thumbnailPath,
        userId,
        uploadedAt: new Date().toISOString(),
        ...validation,
        optimized: processedPath !== filePath,
        tags: options.tags || []
      };
      
      // Store metadata
      await this.storage.store('file', fileHash, metadata, {
        tags: ['file', validation.category],
        priority: 'high'
      });
      
      console.log(`📁 File stored: ${originalName} (${validation.size} bytes)`);
      
      return {
        success: true,
        fileId: fileHash,
        metadata,
        deduplicated: false
      };
      
    } catch (error) {
      console.error('❌ File storage failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Retrieve file
   */
  async getFile(fileId) {
    const result = await this.storage.retrieve('file', fileId);
    
    if (result.success) {
      const metadata = result.data;
      
      // Check if file still exists
      try {
        await fs.access(metadata.filePath);
        return { success: true, metadata, filePath: metadata.filePath };
      } catch (error) {
        // File missing, clean up metadata
        await this.storage.delete('file', fileId);
        return { success: false, error: 'File not found on disk' };
      }
    }
    
    return result;
  }

  /**
   * Get file thumbnail
   */
  async getThumbnail(fileId) {
    const file = await this.getFile(fileId);
    
    if (file.success && file.metadata.thumbnailPath) {
      try {
        await fs.access(file.metadata.thumbnailPath);
        return { success: true, thumbnailPath: file.metadata.thumbnailPath };
      } catch (error) {
        return { success: false, error: 'Thumbnail not found' };
      }
    }
    
    return { success: false, error: 'No thumbnail available' };
  }

  /**
   * Delete file and cleanup
   */
  async deleteFile(fileId) {
    const file = await this.getFile(fileId);
    
    if (file.success) {
      try {
        // Delete main file
        await fs.unlink(file.metadata.filePath);
        
        // Delete thumbnail if exists
        if (file.metadata.thumbnailPath) {
          try {
            await fs.unlink(file.metadata.thumbnailPath);
          } catch (error) {
            // Thumbnail might not exist
          }
        }
        
        // Delete metadata
        await this.storage.delete('file', fileId);
        
        console.log(`🗑️ File deleted: ${fileId}`);
        return { success: true };
      } catch (error) {
        console.error(`❌ File deletion failed: ${fileId}`, error);
        return { success: false, error: error.message };
      }
    }
    
    return { success: false, error: 'File not found' };
  }

  /**
   * Cleanup orphaned files
   */
  async cleanupOrphanedFiles() {
    try {
      const files = await fs.readdir(this.uploadsDir);
      const storedFiles = this.storage.search({ category: 'file' });
      const storedFileNames = new Set(storedFiles.map(f => f.fileName));
      
      let cleanedCount = 0;
      
      for (const file of files) {
        if (!storedFileNames.has(file) && !file.startsWith('.')) {
          const filePath = path.join(this.uploadsDir, file);
          await fs.unlink(filePath);
          cleanedCount++;
        }
      }
      
      console.log(`🧹 Cleaned up ${cleanedCount} orphaned files`);
      return { success: true, cleanedCount };
    } catch (error) {
      console.error('❌ Orphaned file cleanup failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get storage statistics
   */
  async getStats() {
    const storageStats = this.storage.getStats();
    const files = this.storage.search({ category: 'file' });
    
    const categoryStats = {};
    let totalSize = 0;
    
    for (const file of files) {
      const category = file.category || 'other';
      if (!categoryStats[category]) {
        categoryStats[category] = { count: 0, size: 0 };
      }
      categoryStats[category].count++;
      categoryStats[category].size += file.size || 0;
      totalSize += file.size || 0;
    }
    
    return {
      ...storageStats,
      files: {
        total: files.length,
        totalSize,
        byCategory: categoryStats
      }
    };
  }
}

module.exports = { EnhancedFileStorage };