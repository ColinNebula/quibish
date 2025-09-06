// Simple test script to verify avatar upload functionality
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');

async function testAvatarUpload() {
  try {
    console.log('🧪 Testing avatar upload functionality...');
    
    // First, try to login to get a token
    const loginResponse = await axios.post('http://localhost:5001/api/auth/login', {
      username: 'demo',
      password: 'demo'
    });
    
    if (!loginResponse.data.success) {
      throw new Error('Login failed: ' + loginResponse.data.error);
    }
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful, got token');
    
    // Create a test image file (a simple 1x1 pixel PNG)
    const testImageData = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
      0x00, 0x00, 0x00, 0x0D, // IHDR chunk length
      0x49, 0x48, 0x44, 0x52, // IHDR
      0x00, 0x00, 0x00, 0x01, // Width: 1
      0x00, 0x00, 0x00, 0x01, // Height: 1
      0x08, 0x02, // Bit depth: 8, Color type: 2 (RGB)
      0x00, 0x00, 0x00, // Compression, Filter, Interlace
      0x90, 0x77, 0x53, 0xDE, // CRC
      0x00, 0x00, 0x00, 0x0C, // IDAT chunk length
      0x49, 0x44, 0x41, 0x54, // IDAT
      0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, // IDAT data
      0xE2, 0x21, 0xBC, 0x33, // IDAT CRC
      0x00, 0x00, 0x00, 0x00, // IEND chunk length
      0x49, 0x45, 0x4E, 0x44, // IEND
      0xAE, 0x42, 0x60, 0x82  // IEND CRC
    ]);
    
    // Write test image to temp file
    const tempImagePath = path.join(__dirname, 'test-avatar.png');
    fs.writeFileSync(tempImagePath, testImageData);
    console.log('📁 Created test image file');
    
    // Create form data
    const formData = new FormData();
    formData.append('avatar', fs.createReadStream(tempImagePath));
    
    // Make avatar upload request
    const uploadResponse = await axios.post('http://localhost:5001/api/users/avatar', formData, {
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('📤 Upload response:', uploadResponse.data);
    
    if (uploadResponse.data.success) {
      console.log('✅ Avatar upload successful!');
      console.log('🖼️ Avatar URL:', uploadResponse.data.avatarUrl);
      
      // Test avatar removal
      const removeResponse = await axios.delete('http://localhost:5001/api/users/avatar', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('🗑️ Remove response:', removeResponse.data);
      
      if (removeResponse.data.success) {
        console.log('✅ Avatar removal successful!');
      } else {
        console.log('❌ Avatar removal failed:', removeResponse.data.error);
      }
    } else {
      console.log('❌ Avatar upload failed:', uploadResponse.data.error);
    }
    
    // Clean up test file
    fs.unlinkSync(tempImagePath);
    console.log('🧹 Cleaned up test files');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('📤 Response status:', error.response.status);
      console.error('📤 Response data:', error.response.data);
      console.error('📤 Response headers:', error.response.headers);
    }
    if (error.code) {
      console.error('🔧 Error code:', error.code);
    }
    console.error('🔧 Full error:', error);
  }
}

// Run the test
testAvatarUpload();