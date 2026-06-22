/* Mobile Padding Debug Helper */
/* This script helps identify which styles are being applied to the header */

console.log('🔍 MOBILE PADDING DEBUG STARTED');

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', debugMobilePadding);
} else {
  debugMobilePadding();
}

function debugMobilePadding() {
  console.log('📱 Running mobile padding diagnostics...');
  
  // Find header element
  const header = document.querySelector('.enhanced-chat-header, .pro-header');
  if (!header) {
    console.warn('❌ Header element not found');
    return;
  }
  
  console.log('✅ Header element found:', header);
  
  // Get computed styles
  const computed = window.getComputedStyle(header);
  
  console.group('📊 Header Computed Styles');
  console.log('Min-height:', computed.minHeight);
  console.log('Padding-top:', computed.paddingTop);
  console.log('Padding-bottom:', computed.paddingBottom);
  console.log('Padding-left:', computed.paddingLeft);
  console.log('Padding-right:', computed.paddingRight);
  console.log('Height:', computed.height);
  console.log('Display:', computed.display);
  console.log('Flex:', computed.flex);
  console.log('Position:', computed.position);
  console.groupEnd();
  
  // Check for injected style tag
  const injectedStyle = document.getElementById('quibish-layout-fix');
  if (injected Style) {
    console.log('✅ Runtime style injection found');
    console.log('Style content length:', injectedStyle.textContent.length);
  } else {
    console.warn('❌ Runtime style injection NOT found');
  }
  
  // Check window size
  console.group('📐 Viewport Info');
  console.log('Window width:', window.innerWidth);
  console.log('Window height:', window.innerHeight);
  console.log('Visual viewport width:', window.visualViewport?.width);
  console.log('Visual viewport height:', window.visualViewport?.height);
  console.log('Device pixel ratio:', window.devicePixelRatio);
  console.log('Is mobile (≤768px):', window.innerWidth <= 768);
  console.groupEnd();
  
  // Check safe area insets
  console.group('🔒 Safe Area Insets');
  const body = document.body;
  const bodyComputed = window.getComputedStyle(body);
  console.log('--sat (top):', bodyComputed.getPropertyValue('--sat') || 'not set');
  console.log('--sab (bottom):', bodyComputed.getPropertyValue('--sab') || 'not set');
  console.log('--sal (left):', bodyComputed.getPropertyValue('--sal') || 'not set');
  console.log('--sar (right):', bodyComputed.getPropertyValue('--sar') || 'not set');
  console.groupEnd();
  
  // Check all loaded stylesheets
  console.group('📄 Loaded Stylesheets');
  const sheets = Array.from(document.styleSheets);
  sheets.forEach((sheet, index) => {
    try {
      const href = sheet.href || 'inline';
      console.log(`${index + 1}. ${href}`);
    } catch (e) {
      console.log(`${index + 1}. [Cross-origin stylesheet]`);
    }
  });
  console.groupEnd();
  
  // Message container
  const messageList = document.querySelector('.pro-message-list');
  if (messageList) {
    const msgComputed = window.getComputedStyle(messageList);
    console.group('📝 Message List Styles');
    console.log('Padding:', msgComputed.padding);
    console.log('Flex:', msgComputed.flex);
    console.log('Overflow-Y:', msgComputed.overflowY);
    console.groupEnd();
  }
  
  console.log('✅ Mobile padding diagnostics complete!');
  console.log('📋 Copy all logs and share for debugging');
}

// Export debug function to window for manual testing
window.debugMobilePadding = debugMobilePadding;
