const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { EnhancedStorage } = require('./enhancedStorage');
const { EnhancedFileStorage } = require('./enhancedFileStorage');

// Database configuration
let mysqlConnected = false;
let mysqlModels = null;

// Enhanced storage instances
const enhancedStorage = new EnhancedStorage();
const enhancedFileStorage = new EnhancedFileStorage();

// Load MySQL models
async function loadMySQLModels() {
  if (mysqlModels) return mysqlModels;
  
  // Check if memory-only mode is enabled
  const useMemoryOnly = process.env.USE_MEMORY_ONLY === 'true';
  if (useMemoryOnly) {
    console.log('⚠️ Memory-only mode enabled, skipping MySQL model loading');
    mysqlConnected = false;
    return null;
  }
  
  try {
    const mysql = require('../config/mysql');
    await mysql.connectToMySQL();
    
    const User = require('../models/mysql/User');
    const Message = require('../models/mysql/Message');
    const Conversation = require('../models/mysql/Conversation');
    const Media = require('../models/mysql/Media');
    
    mysqlModels = { User, Message, Conversation, Media };
    mysqlConnected = true;
    
    console.log(' MySQL models loaded successfully');
    return mysqlModels;
  } catch (error) {
    console.error(' Failed to load MySQL models:', error.message);
    
    // Handle specific MySQL errors that should fall back to in-memory
    if (error.message.includes('Too many keys specified') || 
        error.message.includes('max 64 keys allowed')) {
      console.log('⚠️ MySQL schema error - falling back to in-memory storage');
      mysqlConnected = false;
      global.inMemoryStorage.usingInMemory = true;
      global.inMemoryStorage.seedDefaultUsers();
    }
    
    mysqlConnected = false;
    return null;
  }
}

class DatabaseService {
  constructor() {
    this.initialize();
  }

  async initialize() {
    console.log('🔧 Initializing database service...');
    
    // Check if we should force memory mode
    const useMemoryOnly = process.env.USE_MEMORY_ONLY === 'true';
    const databaseType = process.env.DATABASE_TYPE || 'mysql';
    
    if (useMemoryOnly || databaseType === 'memory') {
      console.log('⚠️ Memory-only mode enabled, skipping MySQL connection');
      mysqlConnected = false;
      global.inMemoryStorage.usingInMemory = true;
      global.inMemoryStorage.seedDefaultUsers();
      console.log('✅ Database service initialized with in-memory storage');
      return false;
    }
    
    try {
      const models = await loadMySQLModels();
      if (models && mysqlConnected) {
        console.log('✅ Database service initialized with MySQL');
        return true;
      } else {
        throw new Error('MySQL initialization failed');
      }
    } catch (error) {
      console.log('⚠️ MySQL not available, using in-memory fallback');
      mysqlConnected = false;
      global.inMemoryStorage.usingInMemory = true;
      global.inMemoryStorage.seedDefaultUsers();
      return false;
    }
  }

  isInitialized() {
    return mysqlConnected || process.env.DATABASE_TYPE === 'memory';
  }

  async getStats() {
    const stats = {
      mysql: mysqlConnected,
      inMemory: global.inMemoryStorage?.usingInMemory || false,
      users: 0,
      messages: 0,
      media: 0
    };

    try {
      if (mysqlConnected && mysqlModels) {
        stats.users = await mysqlModels.User.count();
        stats.messages = await mysqlModels.Message.count({ where: { deleted: false } });
        stats.media = await mysqlModels.Media.count({ where: { deleted: false } });
      } else if (global.inMemoryStorage?.usingInMemory) {
        // Check in-memory storage stats
        stats.users = global.inMemoryStorage.users?.length || 0;
        stats.messages = global.inMemoryStorage.messages?.length || 0;
        stats.media = global.inMemoryStorage.media?.length || 0;
      }
    } catch (error) {
      console.error('Error getting database stats:', error);
    }

    return stats;
  }

  async createUser(userData) {
    try {
      if (mysqlConnected && mysqlModels) {
        if (userData.password) {
          userData.password = await bcrypt.hash(userData.password, 10);
        }
        
        const user = await mysqlModels.User.create({
          id: userData.id || uuidv4(),
          username: userData.username,
          email: userData.email,
          password: userData.password,
          name: userData.name || userData.username,
          avatar: userData.avatar || '/default-avatar.png',
          role: userData.role || 'user',
          isActive: true,
          lastSeen: new Date()
        });
        
        console.log(`✅ User created: ${user.username} (${user.id})`);
        return user;
      }
      
      throw new Error('No database connection available');
    } catch (error) {
      console.error(' Error creating user:', error.message);
      throw error;
    }
  }

  async findUser(query) {
    try {
      if (mysqlConnected && mysqlModels) {
        const user = await mysqlModels.User.findOne({
          where: query,
          include: [{
            model: mysqlModels.Media,
            as: 'uploadedMedia',
            where: { mediaType: 'avatar', deleted: false },
            required: false
          }]
        });
        return user;
      }
      
      return null;
    } catch (error) {
      console.error(' Error finding user:', error.message);
      throw error;
    }
  }

  async createMessage(messageData) {
    try {
      if (mysqlConnected && mysqlModels) {
        const message = await mysqlModels.Message.create({
          id: uuidv4(),
          content: messageData.content,
          userId: messageData.userId,
          username: messageData.username,
          conversationId: messageData.conversationId,
          messageType: messageData.messageType || 'text',
          reactions: messageData.reactions || [],
          edited: false,
          deleted: false
        });
        
        // Load with user relation
        const messageWithUser = await mysqlModels.Message.findByPk(message.id, {
          include: [{
            model: mysqlModels.User,
            as: 'user',
            attributes: { exclude: ['password'] }
          }]
        });
        
        console.log(`✅ Message created: ${message.id}`);
        return messageWithUser;
      }
      
      throw new Error('No database connection available');
    } catch (error) {
      console.error(' Error creating message:', error.message);
      throw error;
    }
  }

  async getMessages(query = {}, options = {}) {
    try {
      const { limit = 50, offset = 0 } = options;
      
      if (mysqlConnected && mysqlModels) {
        const whereClause = { deleted: false, ...query };
        
        const messages = await mysqlModels.Message.findAll({
          where: whereClause,
          include: [{
            model: mysqlModels.User,
            as: 'user',
            attributes: { exclude: ['password'] }
          }],
          order: [['createdAt', 'DESC']],
          limit,
          offset
        });
        
        return messages;
      }
      
      return [];
    } catch (error) {
      console.error(' Error getting messages:', error.message);
      throw error;
    }
  }

  async getMessageById(messageId) {
    try {
      if (mysqlConnected && mysqlModels) {
        const message = await mysqlModels.Message.findByPk(messageId, {
          include: [{
            model: mysqlModels.User,
            as: 'user',
            attributes: { exclude: ['password'] }
          }]
        });
        
        return message;
      }
      
      return null;
    } catch (error) {
      console.error(' Error getting message by ID:', error.message);
      throw error;
    }
  }

  async updateMessage(messageId, updateData) {
    try {
      if (mysqlConnected && mysqlModels) {
        await mysqlModels.Message.update(updateData, {
          where: { id: messageId }
        });
        
        // Return updated message
        const updatedMessage = await mysqlModels.Message.findByPk(messageId, {
          include: [{
            model: mysqlModels.User,
            as: 'user',
            attributes: { exclude: ['password'] }
          }]
        });
        
        console.log(`✅ Message updated: ${messageId}`);
        return updatedMessage;
      }
      
      throw new Error('No database connection available');
    } catch (error) {
      console.error(' Error updating message:', error.message);
      throw error;
    }
  }

  async addReaction(messageId, userId, reaction) {
    try {
      if (mysqlConnected && mysqlModels) {
        const message = await mysqlModels.Message.findByPk(messageId);
        if (!message) {
          throw new Error('Message not found');
        }
        
        let reactions = message.reactions || [];
        
        // Find existing reaction of this type
        const existingReactionIndex = reactions.findIndex(r => r.type === reaction);
        
        if (existingReactionIndex >= 0) {
          const userIds = reactions[existingReactionIndex].userIds || [];
          const userIndex = userIds.indexOf(userId);
          
          if (userIndex >= 0) {
            // Remove user's reaction
            userIds.splice(userIndex, 1);
            if (userIds.length === 0) {
              reactions.splice(existingReactionIndex, 1);
            }
          } else {
            // Add user's reaction
            userIds.push(userId);
          }
        } else {
          // Add new reaction type
          reactions.push({
            type: reaction,
            userIds: [userId]
          });
        }
        
        await mysqlModels.Message.update({ reactions }, {
          where: { id: messageId }
        });
        
        // Return updated message
        return await this.getMessageById(messageId);
      }
      
      throw new Error('No database connection available');
    } catch (error) {
      console.error(' Error adding reaction:', error.message);
      throw error;
    }
  }

  async createMedia(mediaData) {
    try {
      if (global.inMemoryStorage.usingInMemory) {
        // Handle in-memory storage for media
        const media = {
          id: uuidv4(),
          filename: mediaData.filename,
          originalName: mediaData.originalName,
          mimeType: mediaData.mimeType,
          size: mediaData.size,
          filePath: mediaData.filePath,
          url: mediaData.url,
          mediaType: mediaData.mediaType || 'file',
          userId: mediaData.userId,
          messageId: mediaData.messageId,
          deleted: false,
          createdAt: new Date().toISOString()
        };
        
        if (!global.inMemoryStorage.media) {
          global.inMemoryStorage.media = [];
        }
        
        global.inMemoryStorage.media.push(media);
        console.log(`✅ Media created in memory: ${media.filename} (${media.id})`);
        return media;
      }
      
      if (mysqlConnected && mysqlModels) {
        const media = await mysqlModels.Media.create({
          id: uuidv4(),
          filename: mediaData.filename,
          originalName: mediaData.originalName,
          mimeType: mediaData.mimeType,
          size: mediaData.size,
          filePath: mediaData.filePath,
          url: mediaData.url,
          mediaType: mediaData.mediaType || 'file',
          userId: mediaData.userId,
          messageId: mediaData.messageId,
          deleted: false
        });
        
        console.log(`✅ Media created: ${media.filename} (${media.id})`);
        return media;
      }
      
      throw new Error('No database connection available');
    } catch (error) {
      console.error(' Error creating media:', error.message);
      throw error;
    }
  }

  // Get all users
  async getUsers(query = {}, options = {}) {
    try {
      if (global.inMemoryStorage.usingInMemory) {
        // Handle in-memory storage
        let users = [...global.inMemoryStorage.users];
        
        // Apply query filters if any
        if (query.id) {
          users = users.filter(user => user.id === query.id);
        }
        if (query.username) {
          users = users.filter(user => user.username === query.username);
        }
        if (query.email) {
          users = users.filter(user => user.email === query.email);
        }
        
        // Apply options
        if (options.limit) {
          users = users.slice(0, options.limit);
        }
        
        console.log(`📊 Retrieved ${users.length} users from memory`);
        return users;
      }
      
      if (mysqlConnected && mysqlModels) {
        const users = await mysqlModels.User.findAll({
          where: query,
          ...options
        });
        
        console.log(`📊 Retrieved ${users.length} users from MySQL`);
        return users;
      }
      
      throw new Error('No database connection available');
    } catch (error) {
      console.error(' Error getting users:', error.message);
      throw error;
    }
  }

  // Check if service is properly initialized
  isInitialized() {
    return global.inMemoryStorage.usingInMemory || mysqlConnected;
  }

  // Enhanced Storage Methods
  
  /**
   * Store data with enhanced compression and caching
   */
  async storeEnhanced(category, id, data, options = {}) {
    try {
      return await enhancedStorage.store(category, id, data, options);
    } catch (error) {
      console.error(`❌ Enhanced storage failed for ${category}:${id}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Retrieve data with enhanced caching
   */
  async retrieveEnhanced(category, id) {
    try {
      return await enhancedStorage.retrieve(category, id);
    } catch (error) {
      console.error(`❌ Enhanced retrieval failed for ${category}:${id}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Store file with advanced processing
   */
  async storeFile(filePath, originalName, userId, options = {}) {
    try {
      return await enhancedFileStorage.storeFile(filePath, originalName, userId, options);
    } catch (error) {
      console.error('❌ Enhanced file storage failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get file with metadata
   */
  async getFile(fileId) {
    try {
      return await enhancedFileStorage.getFile(fileId);
    } catch (error) {
      console.error(`❌ Enhanced file retrieval failed for ${fileId}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Store message with enhanced features
   */
  async storeMessage(messageData, options = {}) {
    try {
      // Store in enhanced storage with compression
      const enhanced = await this.storeEnhanced('message', messageData.id, messageData, {
        ttl: options.ttl,
        tags: ['message', ...(options.tags || [])],
        priority: options.priority || 'normal'
      });

      // Also store in regular storage for compatibility
      if (global.inMemoryStorage.usingInMemory) {
        global.inMemoryStorage.messages.push(messageData);
        
        // Keep only last 1000 messages in memory
        if (global.inMemoryStorage.messages.length > 1000) {
          global.inMemoryStorage.messages = global.inMemoryStorage.messages.slice(-1000);
        }
      }

      return enhanced;
    } catch (error) {
      console.error('❌ Enhanced message storage failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get messages with enhanced caching
   */
  async getMessages(options = {}) {
    try {
      // Try enhanced storage first
      const searchCriteria = {
        category: 'message',
        since: options.since,
        until: options.until
      };

      const enhancedResults = enhancedStorage.search(searchCriteria);
      
      if (enhancedResults.length > 0) {
        // Retrieve actual message data
        const messages = [];
        for (const metadata of enhancedResults.slice(0, options.limit || 50)) {
          const result = await this.retrieveEnhanced('message', metadata.id);
          if (result.success) {
            messages.push(result.data);
          }
        }
        
        console.log(`📨 Retrieved ${messages.length} messages from enhanced storage`);
        return messages;
      }

      // Fallback to regular storage
      if (global.inMemoryStorage.usingInMemory) {
        const messages = global.inMemoryStorage.messages.slice(-(options.limit || 50));
        console.log(`📨 Retrieved ${messages.length} messages from memory`);
        return messages;
      }

      return [];
    } catch (error) {
      console.error('❌ Enhanced message retrieval failed:', error);
      return [];
    }
  }

  /**
   * Cleanup storage (archive old data, remove expired items)
   */
  async cleanupStorage() {
    try {
      console.log('🧹 Starting enhanced storage cleanup...');
      
      // Cleanup enhanced storage
      const cleanupResult = await enhancedStorage.cleanup();
      const archiveResult = await enhancedStorage.archiveOldData();
      
      // Cleanup file storage
      const fileCleanup = await enhancedFileStorage.cleanupOrphanedFiles();
      
      // Cleanup in-memory storage
      if (global.inMemoryStorage.usingInMemory) {
        // Keep only recent messages
        if (global.inMemoryStorage.messages.length > 500) {
          const removed = global.inMemoryStorage.messages.length - 500;
          global.inMemoryStorage.messages = global.inMemoryStorage.messages.slice(-500);
          console.log(`🗑️ Removed ${removed} old messages from memory`);
        }
      }

      console.log('✅ Enhanced storage cleanup completed');
      
      return {
        success: true,
        cleanup: cleanupResult,
        archive: archiveResult,
        fileCleanup: fileCleanup
      };
    } catch (error) {
      console.error('❌ Enhanced storage cleanup failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get comprehensive storage statistics
   */
  async getEnhancedStats() {
    try {
      const enhancedStats = enhancedStorage.getStats();
      const fileStats = await enhancedFileStorage.getStats();
      
      // Memory storage stats
      const memoryStats = {
        users: global.inMemoryStorage.users.length,
        messages: global.inMemoryStorage.messages.length,
        usingInMemory: global.inMemoryStorage.usingInMemory
      };

      return {
        enhanced: enhancedStats,
        files: fileStats,
        memory: memoryStats,
        mysql: mysqlConnected
      };
    } catch (error) {
      console.error('❌ Enhanced stats retrieval failed:', error);
      return { success: false, error: error.message };
    }
  }
}

// Create singleton instance
const databaseService = new DatabaseService();

module.exports = databaseService;
