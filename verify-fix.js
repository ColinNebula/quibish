// Add this to browser console to verify CSS is loaded correctly
// Copy and paste entire script at once

(function verifyFix() {
  console.clear();
  console.log('%c🔍 Quibish Layout Fix Verification', 'font-size: 20px; font-weight: bold; color: #4f46e5;');
  console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #4f46e5;');
  
  const messageList = document.querySelector('.pro-message-list');
  
  if (!messageList) {
    console.log('%c⚠️  WARNING: .pro-message-list not found', 'color: orange; font-size: 14px;');
    console.log('   Make sure you are on the chat page');
    return;
  }
  
  const computed = getComputedStyle(messageList);
  const tests = [
    { name: 'flex', expected: '1 1 auto', actual: computed.flex },
    { name: 'justify-content', expected: 'flex-start', actual: computed.justifyContent },
    { name: 'display', expected: 'flex', actual: computed.display },
    { name: 'flex-direction', expected: 'column', actual: computed.flexDirection },
  ];
  
  console.log('\n📊 CSS Property Tests:\n');
  
  let allPassed = true;
  tests.forEach(test => {
    const passed = test.actual === test.expected;
    allPassed = allPassed && passed;
    
    const icon = passed ? '✅' : '❌';
    const color = passed ? 'color: green' : 'color: red; font-weight: bold';
    console.log(`${icon} ${test.name}:`, `%c${test.actual}`, color, `(expected: ${test.expected})`);
  });
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  if (allPassed) {
    console.log('%c✅ ALL TESTS PASSED! Layout fix is active.', 'font-size: 16px; color: green; font-weight: bold;');
    console.log('%cMessages should now start at the top without forced growth.', 'color: green;');
  } else {
    console.log('%c❌ TESTS FAILED! Old CSS is still cached.', 'font-size: 16px; color: red; font-weight: bold;');
    console.log('\n%c⚠️  CACHE CLEARING REQUIRED:', 'font-size: 14px; color: orange; font-weight: bold;');
    console.log('%c1. Open: http://localhost:3000/force-clear.html', 'color: blue; font-weight: bold;');
    console.log('%c2. Click "Clear All Caches & Reload"', 'color: blue; font-weight: bold;');
    console.log('\n%cOR manually:', 'font-weight: bold;');
    console.log('%c1. DevTools → Application → Clear storage', 'color: gray;');
    console.log('%c2. Check ALL boxes and click "Clear site data"', 'color: gray;');
    console.log('%c3. Hard refresh: Ctrl+Shift+R', 'color: gray;');
    console.log('\n%c📱 On mobile:', 'font-weight: bold;');
    console.log('%cSettings → Privacy → Clear browsing data', 'color: gray;');
  }
  
  // Check service worker
  navigator.serviceWorker.getRegistrations().then(regs => {
    console.log(`\n🔧 Service Workers: ${regs.length} active`);
    if (regs.length > 0) {
      console.log('%c⚠️  Service worker detected - may be caching old files', 'color: orange;');
    }
  });
  
  // Check caches
  caches.keys().then(keys => {
    console.log(`💾 Caches: ${keys.length} found`);
    if (keys.length > 0) {
      console.log('   Cache names:', keys);
    }
  });
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  return allPassed;
})();
