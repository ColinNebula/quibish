// Simple login test using built-in modules
const http = require('http');

function testAdminLogin() {
  const postData = JSON.stringify({
    username: 'admin',
    password: 'admin'
  });

  const options = {
    hostname: 'localhost',
    port: 5001,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  console.log('Testing admin login...');

  const req = http.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        console.log('Status Code:', res.statusCode);
        console.log('Response:', response);
        
        if (res.statusCode === 200 && response.success) {
          console.log('✅ Admin login successful!');
          console.log('User:', response.user.username, '| Role:', response.user.role);
          console.log('Token received:', response.token ? 'Yes' : 'No');
        } else {
          console.log('❌ Login failed:', response.error || 'Unknown error');
        }
      } catch (e) {
        console.error('❌ Failed to parse response:', e.message);
        console.log('Raw response:', data);
      }
    });
  });

  req.on('error', (e) => {
    console.error('❌ Request failed:', e.message);
  });

  req.write(postData);
  req.end();
}

testAdminLogin();