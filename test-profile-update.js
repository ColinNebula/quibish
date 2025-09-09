// Test script to debug profile update issues
const fetch = require('node-fetch');

const API_BASE = 'http://localhost:5001/api';

async function testProfileUpdate() {
  try {
    console.log('🔍 Testing profile update API...');
    
    // First, try to login to get a token
    console.log('1. Testing login...');
    const loginResponse = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin'
      })
    });
    
    if (!loginResponse.ok) {
      console.error('❌ Login failed:', loginResponse.status, loginResponse.statusText);
      return;
    }
    
    const loginData = await loginResponse.json();
    console.log('✅ Login successful');
    
    if (!loginData.token) {
      console.error('❌ No token in login response:', loginData);
      return;
    }
    
    const token = loginData.token;
    console.log('🔑 Token obtained');
    
    // Now test profile update
    console.log('2. Testing profile update...');
    const updateResponse = await fetch(`${API_BASE}/users/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        name: 'Test User',
        bio: 'Test bio update',
        displayName: 'Test Display Name'
      })
    });
    
    console.log('Profile update response status:', updateResponse.status);
    
    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error('❌ Profile update failed:', updateResponse.status, errorText);
      return;
    }
    
    const updateData = await updateResponse.json();
    console.log('✅ Profile update successful:', updateData);
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

testProfileUpdate();