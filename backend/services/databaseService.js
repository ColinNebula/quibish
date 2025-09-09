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
    
    console.log('✅ MySQL models loaded successfully');
    return mysqlModels;
  } catch (error) {
    console.error('❌ Failed to load MySQL models:', error.message);
    
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
    const databaseType = process.env.DATABASE_TYPE || 'mysql';
    if (databaseType === 'memory') {
      console.log('⚠️ Memory database mode enabled, skipping MySQL');
      mysqlConnected = false;
      global.inMemoryStorage.usingInMemory = true;
      global.inMemoryStorage.seedDefaultUsers();
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
}

// Create singleton instance
const dbService = new DatabaseService();

module.exports = dbService;