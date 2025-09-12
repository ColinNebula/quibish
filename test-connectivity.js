// Simple test script to verify server connectivity
const http = require('http');

function testHealthEndpoint() {
  console.log('Testing server connectivity...');
  
  const options = {
    hostname: 'localhost',
    port: 5001,
    path: '/api/health',
    method: 'GET',
    timeout: 5000
  };

  const req = http.request(options, (res) => {
    console.log(`✅ Status: ${res.statusCode}`);
    console.log(`Headers:`, res.headers);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        console.log('✅ Response:', response);
        console.log('🎉 Server is responding correctly!');
      } catch (e) {
        console.log('📄 Raw response:', data);
      }
    });
  });

  req.on('error', (e) => {
    console.error('❌ Connection failed:', e.message);
  });

  req.on('timeout', () => {
    console.error('❌ Request timeout');
    req.destroy();
  });

  req.end();
}

// Also test the signaling endpoint
function testSignalingEndpoint() {
  console.log('\nTesting signaling endpoint...');
  
  const options = {
    hostname: 'localhost',
    port: 5001,
    path: '/signaling',
    method: 'GET',
    timeout: 5000
  };

  const req = http.request(options, (res) => {
    console.log(`✅ Signaling Status: ${res.statusCode}`);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        console.log('✅ Signaling Response:', response);
      } catch (e) {
        console.log('📄 Signaling Raw response:', data);
      }
    });
  });

  req.on('error', (e) => {
    console.error('❌ Signaling connection failed:', e.message);
  });

  req.end();
}

// Run tests
testHealthEndpoint();
setTimeout(testSignalingEndpoint, 1000);