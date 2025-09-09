// Database synchronization script
const { sequelize } = require('./config/mysql');

// Import all models to ensure they're registered
const MySQLUser = require('./models/mysql/User');
const MySQLMessage = require('./models/mysql/Message');
const MySQLConversation = require('./models/mysql/Conversation');
const MySQLMedia = require('./models/mysql/Media');

async function syncDatabase() {
  try {
    console.log('🔄 Starting database synchronization...');
    
    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database connection verified');
    
    // Sync tables individually in correct order
    console.log('📊 Synchronizing database tables...');
    
    console.log('1️⃣ Creating Users table...');
    await MySQLUser.sync({ alter: true });
    
    console.log('2️⃣ Creating Conversations table...');
    await MySQLConversation.sync({ alter: true });
    
    console.log('3️⃣ Creating Messages table...');
    await MySQLMessage.sync({ alter: true });
    
    console.log('4️⃣ Creating Media table...');
    await MySQLMedia.sync({ alter: true });
    
    console.log('✅ All database tables synchronized successfully');
    
    // List all tables
    const tables = await sequelize.getQueryInterface().showAllTables();
    console.log('📋 Created tables:', tables);
    
    // Check if we need to create sample data
    const userCount = await MySQLUser.count();
    console.log(`👥 Users in database: ${userCount}`);
    
    if (userCount === 0) {
      console.log('🌱 Creating sample admin user...');
      const bcrypt = require('bcryptjs');
      
      await MySQLUser.create({
        username: 'admin',
        email: 'admin@quibish.com',
        password: await bcrypt.hash('admin123', 10),
        name: 'Administrator',
        displayName: 'Admin',
        role: 'admin',
        status: 'online',
        isOnline: true
      });
      
      console.log('✅ Sample admin user created');
      console.log('   Username: admin');
      console.log('   Email: admin@quibish.com');
      console.log('   Password: admin123');
    }
    
    console.log('🎉 Database synchronization complete!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Database synchronization failed:', error);
    process.exit(1);
  }
}

// Run the sync
syncDatabase();