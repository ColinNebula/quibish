const mysql = require('mysql2/promise');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function setupMySQLCredentials() {
  console.log('🔧 MySQL Credential Setup for Quibish');
  console.log('=====================================\n');

  // Get user input for credentials
  const host = await askQuestion('MySQL Host (default: localhost): ') || 'localhost';
  const port = await askQuestion('MySQL Port (default: 3306): ') || '3306';
  const username = await askQuestion('MySQL Username (default: root): ') || 'root';
  const password = await askQuestion('MySQL Password: ');
  const database = await askQuestion('Database Name (default: quibish): ') || 'quibish';

  console.log('\n🔍 Testing connection...');

  try {
    // Test connection
    const connection = await mysql.createConnection({
      host: host,
      port: parseInt(port),
      user: username,
      password: password
    });

    console.log('✅ Connected to MySQL server successfully!');

    // Create database if it doesn't exist
    await connection.execute(`CREATE DATABASE IF NOT EXISTS ${database}`);
    console.log(`✅ Database "${database}" created or already exists`);

    await connection.end();

    // Update .env file
    await updateEnvFile(host, port, username, password, database);

    console.log('\n🎉 MySQL setup completed successfully!');
    console.log('\nYour .env file has been updated with MySQL credentials.');
    console.log('You can now start your backend with MySQL support.');

  } catch (error) {
    console.error('\n❌ Connection failed:', error.message);
    console.log('\n💡 Troubleshooting tips:');
    console.log('1. Make sure MySQL server is running');
    console.log('2. Check your username and password');
    console.log('3. Verify MySQL service is started: net start MySQL84');
    console.log('4. Try connecting with MySQL Workbench first');
  }

  rl.close();
}

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function updateEnvFile(host, port, username, password, database) {
  const fs = require('fs').promises;
  const path = require('path');
  const envPath = path.join(__dirname, '.env');

  try {
    let envContent = await fs.readFile(envPath, 'utf8');
    
    // Update MySQL configuration in .env
    envContent = envContent.replace(/DATABASE_TYPE=.*/g, 'DATABASE_TYPE=mysql');
    envContent = envContent.replace(/DB_HOST=.*/g, `DB_HOST=${host}`);
    envContent = envContent.replace(/DB_PORT=.*/g, `DB_PORT=${port}`);
    envContent = envContent.replace(/DB_USER=.*/g, `DB_USER=${username}`);
    envContent = envContent.replace(/DB_PASS=.*/g, `DB_PASS=${password}`);
    envContent = envContent.replace(/DB_NAME=.*/g, `DB_NAME=${database}`);

    await fs.writeFile(envPath, envContent);
    console.log('✅ Environment file updated');
    
  } catch (error) {
    console.error('❌ Failed to update .env file:', error.message);
  }
}

// Run setup
setupMySQLCredentials();