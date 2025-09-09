const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

// Database configuration
let mysqlConnected = false;
let mysqlModels = null;

// Load MySQL models
async function loadMySQLModels() {
  if (mysqlModels) return mysqlModels;
  
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
    
    try {
      await loadMySQLModels();
      console.log('✅ Database service initialized with MySQL');
    } catch (error) {
      console.log('⚠️ MySQL not available');
    }
  }

  isInitialized() {
    return mysqlConnected;
  }

  async getStats() {
    const stats = {
      mysql: mysqlConnected,
      users: 0,
      messages: 0,
      media: 0
    };

    try {
      if (mysqlConnected && mysqlModels) {
        stats.users = await mysqlModels.User.count();
        stats.messages = await mysqlModels.Message.count({ where: { deleted: false } });
        stats.media = await mysqlModels.Media.count({ where: { deleted: false } });
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
}

// Create singleton instance
const databaseService = new DatabaseService();

module.exports = databaseService;
