// Test admin login script
const axios = require('axios');

async function testAdminLogin() {
  console.log('Testing admin login...');
  
  try {
    // Test direct API call
    console.log('\n1. Testing direct API call:');
    const response = await axios.post('http://localhost:5001/api/auth/login', {
      username: 'admin',
      password: 'admin'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Direct API login successful');
    console.log('Response:', {
      success: response.data.success,
      user: response.data.user ? {
        id: response.data.user.id,
        username: response.data.user.username,
        email: response.data.user.email,
        role: response.data.user.role
      } : null,
      token: response.data.token ? 'Present' : 'Missing'
    });
    
    // Test token verification
    if (response.data.token) {
      console.log('\n2. Testing token verification:');
      const verifyResponse = await axios.get('http://localhost:5001/api/auth/verify', {
        headers: {
          'Authorization': `Bearer ${response.data.token}`
        }
      });
      
      console.log('✅ Token verification successful');
      console.log('Verified user:', {
        id: verifyResponse.data.user.id,
        username: verifyResponse.data.user.username,
        role: verifyResponse.data.user.role
      });
    }
    
  } catch (error) {
    console.error('❌ Login test failed:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
  }
}

testAdminLogin();