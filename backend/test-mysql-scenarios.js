// Test different MySQL connection scenarios
const mysql = require('mysql2/promise');

async function testConnections() {
  console.log('🔍 Testing MySQL connection scenarios...\n');

  // Scenario 1: No password
  console.log('1️⃣ Testing with no password...');
  try {
    const conn1 = await mysql.createConnection({
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: ''
    });
    console.log('✅ Connected without password!');
    await conn1.end();
  } catch (error) {
    console.log('❌ No password failed:', error.message);
  }

  // Scenario 2: With your password
  console.log('\n2️⃣ Testing with your password...');
  try {
    const conn2 = await mysql.createConnection({
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: 'ultra-max-@48F-#ehD'
    });
    console.log('✅ Connected with your password!');
    await conn2.end();
  } catch (error) {
    console.log('❌ Your password failed:', error.message);
  }

  // Scenario 3: Try common default passwords
  const defaultPasswords = ['', 'root', 'mysql', 'password', '123456'];
  
  for (let i = 0; i < defaultPasswords.length; i++) {
    const pwd = defaultPasswords[i];
    console.log(`\n${i + 3}️⃣ Testing with password: "${pwd || '(empty)'}"`);
    try {
      const conn = await mysql.createConnection({
        host: 'localhost',
        port: 3306,
        user: 'root',
        password: pwd
      });
      console.log(`✅ Connected with password: "${pwd || '(empty)'}"`);
      await conn.end();
      break;
    } catch (error) {
      console.log(`❌ Password "${pwd || '(empty)'}" failed:`, error.message);
    }
  }

  console.log('\n💡 If none work, you may need to:');
  console.log('   1. Reset MySQL root password');
  console.log('   2. Reinstall MySQL');
  console.log('   3. Use MySQL Workbench to set up connection');
}

testConnections();