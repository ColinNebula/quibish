// Database service layer to switch between MongoDB, MySQL, and file storage
const fs = require('fs').promises;
const path = require('path');

class DatabaseService {
  constructor() {
    this.dbType = process.env.DATABASE_TYPE || 'mongodb';
    this.initialized = false;
    this.models = {};
  }

  async initialize() {
    try {
      switch (this.dbType) {
        case 'mysql':
          await this.initializeMySQL();
          break;
        case 'mongodb':
          await this.initializeMongoDB();
          break;
        case 'file':
        default:
          await this.initializeFileStorage();
          break;
      }
      this.initialized = true;
      console.log(`📊 Database service initialized with ${this.dbType.toUpperCase()}`);
    } catch (error) {
      console.error(`❌ Failed to initialize ${this.dbType} database:`, error.message);
      // Fallback to file storage
      if (this.dbType !== 'file') {
        console.log('🔄 Falling back to file storage...');
        this.dbType = 'file';
        await this.initializeFileStorage();
        this.initialized = true;
      }
    }
  }

  async initializeMySQL() {
    const { connectToMySQL } = require('../config/mysql');
    const { MySQLUser, MySQLMessage, MySQLConversation } = require('../models/mysql');
    
    const connected = await connectToMySQL();
    if (!connected) {
      throw new Error('MySQL connection failed');
    }

    this.models = {
      User: MySQLUser,
      Message: MySQLMessage,
      Conversation: MySQLConversation
    };

    console.log('✅ MySQL database service initialized');
  }

  async initializeMongoDB() {
    const mongoose = require('mongoose');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/quibish');
    
    this.models = {
      User: require('../models/User'),
      Message: require('../models/Message'),
      Conversation: require('../models/Conversation')
    };

    console.log('✅ MongoDB database service initialized');
  }

  async initializeFileStorage() {
    // Initialize file-based storage
    this.storageDir = path.join(__dirname, '../storage/data');
    await fs.mkdir(this.storageDir, { recursive: true });
    
    // Use existing file storage logic
    console.log('✅ File storage database service initialized');
  }

  // Unified methods that work with any database
  async createUser(userData) {
    if (this.dbType === 'file') {
      return this.createUserFile(userData);
    }
    return await this.models.User.create(userData);
  }

  async findUser(query) {
    if (this.dbType === 'file') {
      return this.findUserFile(query);
    }
    if (this.dbType === 'mysql') {
      return await this.models.User.findOne({ where: query });
    }
    return await this.models.User.findOne(query);
  }

  async createMessage(messageData) {
    if (this.dbType === 'file') {
      return this.createMessageFile(messageData);
    }
    return await this.models.Message.create(messageData);
  }

  async getMessages(query = {}, options = {}) {
    if (this.dbType === 'file') {
      return this.getMessagesFile(query, options);
    }
    if (this.dbType === 'mysql') {
      return await this.models.Message.findAll({
        where: query,
        order: [['createdAt', 'DESC']],
        limit: options.limit || 50,
        include: [{ model: this.models.User, as: 'user' }]
      });
    }
    return await this.models.Message.find(query)
      .sort({ createdAt: -1 })
      .limit(options.limit || 50)
      .populate('user');
  }

  // File storage helper methods (existing logic)
  async createUserFile(userData) {
    // Implement file-based user creation
    const users = await this.loadFile('users.json');
    users.push(userData);
    await this.saveFile('users.json', users);
    return userData;
  }

  async findUserFile(query) {
    const users = await this.loadFile('users.json');
    return users.find(user => {
      return Object.keys(query).every(key => user[key] === query[key]);
    });
  }

  async createMessageFile(messageData) {
    const messages = await this.loadFile('messages.json');
    messages.push(messageData);
    await this.saveFile('messages.json', messages);
    return messageData;
  }

  async getMessagesFile(query, options) {
    const messages = await this.loadFile('messages.json');
    return messages
      .filter(msg => {
        return Object.keys(query).every(key => msg[key] === query[key]);
      })
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, options.limit || 50);
  }

  async loadFile(filename) {
    try {
      const filePath = path.join(this.storageDir, filename);
      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return [];
    }
  }

  async saveFile(filename, data) {
    const filePath = path.join(this.storageDir, filename);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  }

  getDbType() {
    return this.dbType;
  }

  isInitialized() {
    return this.initialized;
  }
}

// Create singleton instance
const dbService = new DatabaseService();

module.exports = dbService;