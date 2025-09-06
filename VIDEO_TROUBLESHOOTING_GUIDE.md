# 🎥 Video Playback Troubleshooting Guide

## Common Issues and Solutions

### 🔧 **Issue 1: Videos Not Playing**

#### Symptoms:
- Video element shows but won't play
- Black screen with controls
- "Failed to load" error message

#### Possible Causes & Solutions:

**1. Object URL Issues**
```javascript
// Problem: Object URL not properly created or expired
const videoUrl = URL.createObjectURL(file);

// Solution: Ensure URL is valid and not revoked prematurely
console.log('Object URL:', videoUrl); // Should start with blob:
```

**2. Browser Autoplay Policies**
```javascript
// Problem: Browser blocks autoplay without user interaction
video.autoplay = true; // ❌ Often blocked

// Solution: Add muted attribute for autoplay or require user interaction
video.muted = true;
video.autoplay = true; // ✅ Usually allowed when muted
```

**3. CORS and Security Issues**
```javascript
// Problem: Cross-origin restrictions
// Solution: Serve videos from same origin or configure CORS headers
```

**4. Video Format Compatibility**
```javascript
// Check browser support
const video = document.createElement('video');
const canPlayMP4 = video.canPlayType('video/mp4');
const canPlayWebM = video.canPlayType('video/webm');

console.log('MP4 support:', canPlayMP4); // "probably", "maybe", or ""
console.log('WebM support:', canPlayWebM);
```

### 🔧 **Issue 2: Thumbnail Generation Fails**

#### Symptoms:
- Videos upload but show no thumbnail
- Canvas is empty or black
- Thumbnail generation errors in console

#### Solutions:

**1. Canvas Security Issues**
```javascript
// Problem: Canvas tainted by cross-origin video
// Solution: Ensure video is from same origin

const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
// Add error handling
try {
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const thumbnail = canvas.toDataURL('image/jpeg', 0.8);
} catch (error) {
  console.error('Canvas security error:', error);
  // Use fallback without thumbnail
}
```

**2. Video Not Ready**
```javascript
// Problem: Trying to capture frame before video is ready
// Solution: Wait for proper events

video.addEventListener('loadeddata', () => {
  // Video data is loaded but not necessarily seekable
});

video.addEventListener('canplay', () => {
  // Video can start playing
  video.currentTime = Math.min(video.duration * 0.1, 3);
});

video.addEventListener('seeked', () => {
  // Video has seeked to the target time - safe to capture
  captureFrame();
});
```

**3. Empty Canvas Detection**
```javascript
// Check if canvas actually has content
const imageData = ctx.getImageData(0, 0, 1, 1);
const isEmpty = imageData.data.every(val => val === 0);

if (isEmpty) {
  console.warn('Canvas is empty - video frame not captured');
  // Handle gracefully
}
```

### 🔧 **Issue 3: Mobile Compatibility**

#### Symptoms:
- Videos work on desktop but not mobile
- iOS/Android specific issues
- Touch controls not working

#### Solutions:

**1. iOS Specific Attributes**
```javascript
video.playsInline = true; // Prevent fullscreen on iOS
video.setAttribute('webkit-playsinline', 'true'); // Legacy iOS
video.setAttribute('playsinline', 'true'); // Modern iOS
```

**2. Android Compatibility**
```javascript
// Use widely supported formats
const supportedFormats = ['video/mp4', 'video/webm'];
// Avoid: AVI, MOV on Android
```

**3. Mobile Performance**
```javascript
// Reduce processing for mobile
const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

if (isMobile) {
  // Skip thumbnail generation or use lower resolution
  canvas.width = 160;  // Half resolution
  canvas.height = 90;
}
```

### 🔧 **Issue 4: Large File Handling**

#### Symptoms:
- Browser crashes or hangs
- Out of memory errors
- Slow processing

#### Solutions:

**1. File Size Limits**
```javascript
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

if (file.size > MAX_FILE_SIZE) {
  console.warn('File too large for browser processing');
  // Skip thumbnail generation, just create basic message
  return createBasicVideoMessage(file);
}
```

**2. Progressive Loading**
```javascript
// Use preload="metadata" instead of "auto"
video.preload = "metadata"; // Only load metadata initially
```

**3. Memory Management**
```javascript
// Clean up resources
const cleanup = () => {
  URL.revokeObjectURL(videoUrl);
  video.removeEventListener('loadedmetadata', onLoaded);
  video.remove();
};

// Call cleanup after processing
cleanup();
```

### 🔧 **Issue 5: Browser-Specific Problems**

#### Chrome:
```javascript
// Chrome sometimes requires user interaction for video processing
// Solution: Process videos after user gesture (file selection counts)
```

#### Firefox:
```javascript
// Firefox may have issues with certain codecs
// Solution: Provide multiple format options
video.innerHTML = `
  <source src="${videoUrl}" type="video/mp4">
  <source src="${videoUrl}" type="video/webm">
  <source src="${videoUrl}" type="video/ogg">
`;
```

#### Safari:
```javascript
// Safari requires specific attributes
video.setAttribute('webkit-playsinline', 'true');
video.setAttribute('controls', 'true');
```

## 🛠️ **Debug Tools**

### 1. **Console Logging**
```javascript
// Add comprehensive logging
console.log('Video processing started:', {
  name: file.name,
  type: file.type,
  size: file.size
});

video.addEventListener('loadstart', () => console.log('Load started'));
video.addEventListener('progress', () => console.log('Loading progress'));
video.addEventListener('loadedmetadata', () => console.log('Metadata loaded'));
video.addEventListener('canplay', () => console.log('Can play'));
video.addEventListener('error', (e) => console.error('Video error:', e));
```

### 2. **Video Element Inspection**
```javascript
// Check video element state
const debugVideo = (video) => {
  console.log('Video debug info:', {
    src: video.src,
    currentSrc: video.currentSrc,
    readyState: video.readyState,
    networkState: video.networkState,
    error: video.error,
    duration: video.duration,
    paused: video.paused,
    ended: video.ended
  });
};
```

### 3. **Browser Capability Testing**
```javascript
// Test format support
const testFormats = ['mp4', 'webm', 'ogg', 'avi', 'mov'];
const video = document.createElement('video');

testFormats.forEach(format => {
  const support = video.canPlayType(`video/${format}`);
  console.log(`${format}: ${support || 'Not supported'}`);
});
```

## 🎯 **Best Practices**

### 1. **Error Handling**
- Always provide fallback for failed video processing
- Use try-catch blocks around canvas operations
- Implement timeouts for loading operations

### 2. **Performance**
- Limit file sizes for client-side processing
- Use appropriate canvas dimensions (320x180 is usually sufficient)
- Clean up resources (URLs, event listeners)

### 3. **User Experience**
- Show loading indicators during processing
- Provide clear error messages
- Support multiple video formats

### 4. **Compatibility**
- Test on multiple browsers and devices
- Use progressive enhancement
- Provide fallbacks for unsupported features

## 🧪 **Testing Checklist**

- [ ] Upload MP4 video (most compatible)
- [ ] Upload WebM video (modern browsers)
- [ ] Upload large file (>50MB)
- [ ] Test on mobile devices
- [ ] Test in incognito mode
- [ ] Test with slow network
- [ ] Test video playback controls
- [ ] Test thumbnail generation
- [ ] Check console for errors
- [ ] Verify memory usage

## 🚨 **Emergency Fixes**

If videos still won't play, try these quick fixes:

1. **Disable thumbnail generation temporarily**
```javascript
// Skip thumbnail processing
const newMessage = {
  file: {
    name: file.name,
    type: file.type,
    url: URL.createObjectURL(file)
    // No thumbnail, duration, etc.
  }
};
```

2. **Use simpler video element**
```javascript
<video controls>
  <source src={videoUrl} type={fileType} />
  Your browser does not support video playback.
</video>
```

3. **Check Object URL validity**
```javascript
console.log('Object URL valid:', videoUrl.startsWith('blob:'));
```

Ready to debug! 🔍