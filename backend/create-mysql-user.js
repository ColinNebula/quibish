// Create a new MySQL user for Quibish
const mysql = require('mysql2/promise');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function createMySQLUser() {
  console.log('🔧 Creating MySQL User for Quibish');
  console.log('==================================\n');

  try {
    // Connect with root to create user
    console.log('Connecting to MySQL as root...');
    const connection = await mysql.createConnection({
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: 'ultra-max-@48F-#ehD'  // Direct password for testing
    });

    console.log('✅ Connected to MySQL as root');

    // Create a new user for the application
    const appUser = 'quibish_user';
    const appPassword = 'quibish_pass_2024';

    console.log(`Creating user: ${appUser}`);
    
    // Drop user if exists
    try {
      await connection.execute(`DROP USER IF EXISTS '${appUser}'@'localhost'`);
    } catch (e) {
      // User might not exist, ignore error
    }

    // Create new user
    await connection.execute(`CREATE USER '${appUser}'@'localhost' IDENTIFIED BY '${appPassword}'`);
    console.log(`✅ User '${appUser}' created`);

    // Grant all privileges on quibish database
    await connection.execute(`GRANT ALL PRIVILEGES ON quibish.* TO '${appUser}'@'localhost'`);
    await connection.execute(`FLUSH PRIVILEGES`);
    console.log(`✅ Privileges granted to '${appUser}' on quibish database`);

    await connection.end();

    console.log('\n🎉 MySQL user setup completed!');
    console.log(`\nUpdate your .env file with:`);
    console.log(`DB_USER=${appUser}`);
    console.log(`DB_PASS=${appPassword}`);
    
  } catch (error) {
    console.error('\n❌ Error creating MySQL user:', error.message);
    
    if (error.message.includes('Access denied')) {
      console.log('\n💡 The root password might be incorrect.');
      console.log('Try connecting to MySQL with a GUI tool like MySQL Workbench first.');
    }
  }

  rl.close();
}

createMySQLUser();