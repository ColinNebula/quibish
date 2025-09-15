// Debug script to check environment variables
require('dotenv').config();

console.log('Environment variables:');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_PORT:', process.env.DB_PORT);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASS:', process.env.DB_PASS ? '[PASSWORD SET]' : '[NO PASSWORD]');
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DATABASE_TYPE:', process.env.DATABASE_TYPE);

console.log('\nPassword length:', process.env.DB_PASS ? process.env.DB_PASS.length : 0);
console.log('Password starts with:', process.env.DB_PASS ? process.env.DB_PASS.substring(0, 5) + '...' : 'N/A');