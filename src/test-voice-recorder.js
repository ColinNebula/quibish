/**
 * Voice Recorder Diagnostic Test
 * This script tests the voice recording functionality step by step
 */

// Test 1: Check browser support
console.log('🔍 Voice Recorder Diagnostic Test Starting...');

function testBrowserSupport() {
  console.log('\n=== Test 1: Browser Support ===');
  
  const support = {
    mediaRecorder: !!window.MediaRecorder,
    getUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    audioContext: !!(window.AudioContext || window.webkitAudioContext),
    permissions: !!navigator.permissions
  };
  
  console.log('Browser Support:', support);
  
  if (!support.mediaRecorder) {
    console.error('❌ MediaRecorder not supported');
    return false;
  }
  
  if (!support.getUserMedia) {
    console.error('❌ getUserMedia not supported');
    return false;
  }
  
  console.log('✅ Basic browser support available');
  return true;
}

// Test 2: Check MIME type support
function testMimeTypes() {
  console.log('\n=== Test 2: MIME Type Support ===');
  
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/ogg',
    'audio/wav',
    'audio/mp4',
    'audio/aac'
  ];

  const supportedTypes = types.filter(type => {
    const supported = MediaRecorder.isTypeSupported(type);
    console.log(`${supported ? '✅' : '❌'} ${type}: ${supported}`);
    return supported;
  });

  console.log(`\nSupported MIME types: ${supportedTypes.length}/${types.length}`);
  return supportedTypes.length > 0;
}

// Test 3: Check permissions
async function testPermissions() {
  console.log('\n=== Test 3: Permission Status ===');
  
  try {
    if (navigator.permissions) {
      const permission = await navigator.permissions.query({ name: 'microphone' });
      console.log(`🎤 Microphone permission: ${permission.state}`);
      
      permission.addEventListener('change', () => {
        console.log(`🔄 Permission changed to: ${permission.state}`);
      });
      
      return permission.state;
    } else {
      console.log('⚠️ Permissions API not supported');
      return 'unknown';
    }
  } catch (error) {
    console.error('❌ Permission check failed:', error);
    return 'error';
  }
}

// Test 4: Try to get user media
async function testGetUserMedia() {
  console.log('\n=== Test 4: getUserMedia Test ===');
  
  try {
    console.log('🎤 Requesting microphone access...');
    
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: 44100,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });
    
    console.log('✅ Microphone access granted');
    console.log('📊 Stream info:', {
      id: stream.id,
      active: stream.active,
      tracks: stream.getAudioTracks().length
    });
    
    // Check track settings
    const track = stream.getAudioTracks()[0];
    if (track) {
      console.log('🎵 Audio track settings:', track.getSettings());
      console.log('🎵 Audio track capabilities:', track.getCapabilities());
    }
    
    // Clean up
    stream.getTracks().forEach(track => track.stop());
    console.log('🧹 Stream stopped');
    
    return true;
  } catch (error) {
    console.error('❌ getUserMedia failed:', error);
    console.error('❌ Error name:', error.name);
    console.error('❌ Error message:', error.message);
    
    // Provide specific error explanations
    switch (error.name) {
      case 'NotAllowedError':
        console.log('💡 User denied microphone permission or feature policy blocks it');
        break;
      case 'NotFoundError':
        console.log('💡 No microphone device found');
        break;
      case 'NotSupportedError':
        console.log('💡 Audio constraints not supported');
        break;
      case 'AbortError':
        console.log('💡 Request was aborted');
        break;
      default:
        console.log('💡 Unknown error occurred');
    }
    
    return false;
  }
}

// Test 5: Try MediaRecorder
async function testMediaRecorder() {
  console.log('\n=== Test 5: MediaRecorder Test ===');
  
  try {
    // Get media stream first
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    console.log('✅ Got media stream for MediaRecorder test');
    
    // Try to create MediaRecorder
    const mimeType = 'audio/webm;codecs=opus';
    const recorder = new MediaRecorder(stream, {
      mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : undefined
    });
    
    console.log('✅ MediaRecorder created successfully');
    console.log('📊 MediaRecorder info:', {
      mimeType: recorder.mimeType,
      state: recorder.state,
      stream: recorder.stream.id
    });
    
    // Set up event handlers
    recorder.onstart = () => console.log('🎤 MediaRecorder started');
    recorder.onstop = () => console.log('🛑 MediaRecorder stopped');
    recorder.ondataavailable = (event) => {
      console.log(`📦 Data available: ${event.data.size} bytes`);
    };
    recorder.onerror = (event) => {
      console.error('❌ MediaRecorder error:', event.error);
    };
    
    // Try recording for 2 seconds
    console.log('🎤 Starting 2-second test recording...');
    recorder.start(100);
    
    setTimeout(() => {
      recorder.stop();
      stream.getTracks().forEach(track => track.stop());
      console.log('✅ Test recording completed');
    }, 2000);
    
    return true;
  } catch (error) {
    console.error('❌ MediaRecorder test failed:', error);
    return false;
  }
}

// Run all tests
async function runDiagnostics() {
  console.log('🚀 Starting Voice Recorder Diagnostics...');
  
  const results = {
    browserSupport: false,
    mimeTypeSupport: false,
    permissions: 'unknown',
    getUserMedia: false,
    mediaRecorder: false
  };
  
  try {
    results.browserSupport = testBrowserSupport();
    
    if (results.browserSupport) {
      results.mimeTypeSupport = testMimeTypes();
      results.permissions = await testPermissions();
      results.getUserMedia = await testGetUserMedia();
      
      if (results.getUserMedia) {
        results.mediaRecorder = await testMediaRecorder();
      }
    }
    
    console.log('\n=== Final Results ===');
    console.log('📊 Diagnostic Results:', results);
    
    // Overall assessment
    const isFullySupported = results.browserSupport && 
                            results.mimeTypeSupport && 
                            results.getUserMedia && 
                            results.mediaRecorder;
    
    if (isFullySupported) {
      console.log('🎉 Voice recording should work perfectly!');
    } else {
      console.log('⚠️ Voice recording may have issues:');
      if (!results.browserSupport) console.log('  - Browser support missing');
      if (!results.mimeTypeSupport) console.log('  - No supported MIME types');
      if (!results.getUserMedia) console.log('  - Cannot access microphone');
      if (!results.mediaRecorder) console.log('  - MediaRecorder issues');
      if (results.permissions === 'denied') console.log('  - Microphone permission denied');
    }
    
  } catch (error) {
    console.error('❌ Diagnostic test failed:', error);
  }
}

// Export for use in browser console
window.runVoiceRecorderDiagnostics = runDiagnostics;

// Auto-run if in development
if (process.env.NODE_ENV === 'development') {
  console.log('🔧 Auto-running diagnostics in development mode...');
  setTimeout(runDiagnostics, 1000);
}

export { runDiagnostics };