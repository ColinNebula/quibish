// Simple login test - just test the API endpoint
const fetch = require('node-fetch');

async function testSimpleLogin() {
  try {
    console.log('Testing admin login endpoint...');
    
    const response = await fetch('http://localhost:5001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin'
      })
    });
    
    const data = await response.json();
    console.log('Login Response Status:', response.status);
    console.log('Login Response Body:', data);
    
    if (response.ok && data.success) {
      console.log('✅ Admin login successful!');
      console.log('User:', data.user.username, '| Role:', data.user.role);
      console.log('Token received:', data.token ? 'Yes' : 'No');
    } else {
      console.log('❌ Login failed:', data.error || 'Unknown error');
    }
    
  } catch (error) {
    console.error('❌ Login test failed:', error.message);
  }
}

testSimpleLogin();