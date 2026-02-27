const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// MySQL database configuration
const sequelize = new Sequelize(
  process.env.DB_NAME || 'quibish',
  process.env.DB_USER || 'root',
  process.env.DB_PASS || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true
    }
  }
);

// Test database connection
const connectToMySQL = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ MySQL database connected successfully');
    
    // Sync database models (create tables if they don't exist)
    await sequelize.sync({ alter: true });
    console.log('📊 Database tables synchronized');
    
    // Seed initial data if needed
    if (process.env.SEED_INITIAL_DATA === 'true') {
      try {
        const MySQLUser = require('../models/mysql/User');
        
        // First, ensure all models are synchronized
        await sequelize.sync({ force: false });
        console.log('📊 All models synchronized');
        
        const userCount = await MySQLUser.count();
        
        if (userCount === 0) {
          console.log('🌱 Seeding initial user data for MySQL...');
          const bcrypt = require('bcryptjs');
          
          const defaultUsers = [
            {
              username: 'demo',
              email: 'demo@quibish.com',
              password: await bcrypt.hash('demo', 10),
              name: 'Demo User',
              avatar: null,
              status: 'online',
              role: 'user'
            },
            {
              username: 'john',
              email: 'john@example.com',
              password: await bcrypt.hash('password', 10),
              name: 'John Doe',
              avatar: null,
              status: 'online',
              role: 'user'
            },
            {
              username: 'jane',
              email: 'jane@example.com',
              password: await bcrypt.hash('password', 10),
              name: 'Jane Smith',
              avatar: null,
              status: 'online',
              role: 'user'
            },
            {
              username: 'admin',
              email: 'admin@quibish.com',
              password: await bcrypt.hash('admin', 10),
              name: 'Admin User',
              avatar: null,
              status: 'online',
              role: 'admin'
            }
          ];
          
          await MySQLUser.bulkCreate(defaultUsers);
          console.log('✅ Initial users seeded successfully in MySQL');
        }
      } catch (seedError) {
        console.error('⚠️  Error seeding data:', seedError.message);
        // Don't fail the connection, just log the error
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ MySQL connection error:', error.message);
    return false;
  }
};

module.exports = { sequelize, connectToMySQL };