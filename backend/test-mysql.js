// Quick test to check MySQL connection
const mysql = require('mysql2/promise');
require('dotenv').config();

async function testMySQLConnection() {
  try {
    console.log('🔍 Testing MySQL connection...');
    console.log(`Host: ${process.env.DB_HOST || 'localhost'}`);
    console.log(`Port: ${process.env.DB_PORT || 3306}`);
    console.log(`User: ${process.env.DB_USER || 'root'}`);
    console.log(`Database: ${process.env.DB_NAME || 'quibish'}`);
    
    // Try to connect to MySQL server
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || ''
    });

    console.log('✅ Connected to MySQL server');

    // Try to create database if it doesn't exist
    const dbName = process.env.DB_NAME || 'quibish';
    await connection.execute(`CREATE DATABASE IF NOT EXISTS ${dbName}`);
    console.log(`✅ Database "${dbName}" created or already exists`);

    // Test database selection
    await connection.execute(`USE ${dbName}`);
    console.log(`✅ Successfully selected ${dbName} database`);

    await connection.end();
    console.log('🎉 MySQL connection test successful!');
    
    return true;
  } catch (error) {
    console.error('❌ MySQL connection test failed:', error.message);
    console.log('\n💡 Possible solutions:');
    console.log('   1. Make sure MySQL server is running');
    console.log('   2. Check if MySQL service is started');
    console.log('   3. Verify MySQL root password in .env file');
    console.log('   4. Try running: net start mysql84 (or similar service name)');
    console.log('   5. Check if MySQL is installed and configured properly');
    
    return false;
  }
}

// Run the test
testMySQLConnection();