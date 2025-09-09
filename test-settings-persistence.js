import fetch from 'node-fetch';

async function testSettingsPersistence() {
  try {
    console.log('🧪 Testing user settings persistence...\n');
    
    // Step 1: Login
    console.log('1. Logging in...');
    const loginResponse = await fetch('http://localhost:5001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'demo', password: 'demo' })
    });
    
    const loginData = await loginResponse.json();
    if (!loginData.success) {
      throw new Error('Login failed: ' + loginData.error);
    }
    
    console.log('✅ Login successful');
    console.log('📊 User data:', {
      username: loginData.user.username,
      theme: loginData.user.theme,
      language: loginData.user.language,
      notifications: loginData.user.notifications
    });
    
    const token = loginData.token;
    
    // Step 2: Get current profile
    console.log('\n2. Fetching current profile...');
    const profileResponse = await fetch('http://localhost:5001/api/users/profile', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const profileData = await profileResponse.json();
    console.log('✅ Profile fetched');
    console.log('📊 Current settings:', {
      theme: profileData.user.theme,
      language: profileData.user.language,
      timezone: profileData.user.timezone
    });
    
    // Step 3: Update preferences
    console.log('\n3. Updating preferences...');
    const updateResponse = await fetch('http://localhost:5001/api/users/preferences', {
      method: 'PUT',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        theme: 'dark',
        language: 'es',
        timezone: 'America/New_York'
      })
    });
    
    const updateData = await updateResponse.json();
    console.log('✅ Preferences updated');
    console.log('📊 Updated settings:', {
      theme: updateData.user.theme,
      language: updateData.user.language,
      timezone: updateData.user.timezone
    });
    
    // Step 4: Verify persistence by fetching profile again
    console.log('\n4. Verifying persistence...');
    const verifyResponse = await fetch('http://localhost:5001/api/users/profile', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const verifyData = await verifyResponse.json();
    console.log('✅ Persistence verified');
    console.log('📊 Persisted settings:', {
      theme: verifyData.user.theme,
      language: verifyData.user.language,
      timezone: verifyData.user.timezone
    });
    
    // Check if settings were actually saved
    const settingsMatch = 
      verifyData.user.theme === 'dark' &&
      verifyData.user.language === 'es' &&
      verifyData.user.timezone === 'America/New_York';
    
    if (settingsMatch) {
      console.log('\n🎉 SUCCESS: User settings are being persisted correctly!');
    } else {
      console.log('\n❌ FAILURE: User settings are NOT being persisted');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testSettingsPersistence();