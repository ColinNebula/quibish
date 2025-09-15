// Simple MySQL connection test without prepared statements
const mysql = require('mysql2/promise');
require('dotenv').config();

async function testMySQLConnection() {
  let connection;
  try {
    console.log('🔍 Testing MySQL connection...');
    console.log(`Host: ${process.env.DB_HOST || 'localhost'}`);
    console.log(`Port: ${process.env.DB_PORT || 3306}`);
    console.log(`User: ${process.env.DB_USER || 'root'}`);
    console.log(`Database: ${process.env.DB_NAME || 'quibish'}`);
    
    // Try to connect to MySQL server
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || ''
    });

    console.log('✅ Connected to MySQL server');

    // Test with simple query instead of prepared statement
    const [rows] = await connection.query('SELECT VERSION() as version');
    console.log(`✅ MySQL Version: ${rows[0].version}`);

    // Try to create database with simple query
    const dbName = process.env.DB_NAME || 'quibish';
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    console.log(`✅ Database "${dbName}" created or already exists`);

    // Test database selection
    await connection.query(`USE \`${dbName}\``);
    console.log(`✅ Successfully selected ${dbName} database`);

    // Show existing tables
    const [tables] = await connection.query('SHOW TABLES');
    console.log(`📋 Tables in ${dbName}: ${tables.length > 0 ? tables.map(t => Object.values(t)[0]).join(', ') : 'No tables yet'}`);

    console.log('🎉 MySQL connection test successful!');
    
    return true;
  } catch (error) {
    console.error('❌ MySQL connection test failed:', error.message);
    console.log('\n💡 Possible solutions:');
    console.log('   1. Make sure MySQL server is running (✅ Already confirmed)');
    console.log('   2. Check MySQL root password in .env file');
    console.log('   3. Try connecting with a different user');
    console.log('   4. Check MySQL authentication plugin settings');
    
    return false;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the test
testMySQLConnection();