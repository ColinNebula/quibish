// Clear Cache and Verify Fix Script
console.log('🔄 Starting cache clear and verification...\n');

// Step 1: Clear Service Workers
navigator.serviceWorker.getRegistrations().then(registrations => {
  console.log(`📦 Found ${registrations.length} service worker(s)`);
  registrations.forEach((reg, index) => {
    reg.unregister();
    console.log(`✅ Unregistered service worker ${index + 1}`);
  });
});

// Step 2: Clear Storage
localStorage.clear();
sessionStorage.clear();
console.log('✅ Cleared localStorage and sessionStorage');

// Step 3: Clear Cache Storage
caches.keys().then(keys => {
  console.log(`📦 Found ${keys.length} cache(s)`);
  return Promise.all(keys.map(key => {
    console.log(`🗑️ Deleting cache: ${key}`);
    return caches.delete(key);
  }));
}).then(() => {
  console.log('✅ All caches cleared');
  
  // Step 4: Verify Fix After Reload
  console.log('\n⏳ Reloading page in 2 seconds...');
  console.log('After reload, check:');
  console.log('  1. Messages should start at TOP (not centered)');
  console.log('  2. No excessive whitespace when few messages');
  console.log('  3. Natural scroll behavior');
  
  setTimeout(() => {
    location.reload(true);
  }, 2000);
});
