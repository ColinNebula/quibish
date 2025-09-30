# Voice Recorder Troubleshooting Guide

## Quick Diagnostic Steps

When you get the "Try Again" message, follow these steps:

### Step 1: Open Browser Console
1. Press `F12` or right-click → "Inspect Element"
2. Go to the "Console" tab
3. Look for messages starting with 🎤, ✅, or ❌

### Step 2: Check What You See
Look for these specific log messages:

**Initialization:**
- `🔄 Initializing Voice Recorder Service...`
- `✅ Voice Recorder Service initialized successfully`
- `❌ Voice Recorder Service initialization failed:`

**When Clicking Record:**
- `🔄 Service not initialized, initializing now...`
- `🔍 Testing microphone access...`
- `✅ Microphone access test successful`
- `❌ Microphone access test failed:`

### Step 3: Test Microphone Button
1. Click the "🔍 Test Microphone" button
2. Check console for test results
3. Allow microphone permission if prompted

## Common Issues & Solutions

### Issue 1: Permission Denied
**Symptoms:** "Try Again" message, console shows "NotAllowedError"

**Solutions:**
1. **Chrome/Edge:** Click the 🔒 lock icon in address bar → Allow microphone
2. **Firefox:** Click the microphone icon in address bar → Allow
3. **Safari:** Safari → Preferences → Websites → Microphone → Allow
4. Reload the page after changing permissions

### Issue 2: No Microphone Found
**Symptoms:** "No microphone found" error

**Solutions:**
1. Check if microphone is connected
2. Test microphone in other apps (e.g., voice recorder)
3. Restart browser
4. Check system audio settings

### Issue 3: Browser Not Supported
**Symptoms:** "Voice recording is not supported" error

**Solutions:**
1. Update your browser to latest version
2. Use Chrome, Firefox, or Edge (recommended)
3. Avoid Internet Explorer or very old browsers

### Issue 4: HTTPS Required
**Symptoms:** Permission errors on HTTP sites

**Solutions:**
1. Voice recording requires HTTPS in most browsers
2. On localhost, it should work on HTTP
3. For deployed sites, ensure HTTPS is enabled

### Issue 5: Microphone In Use
**Symptoms:** "Microphone is already in use" error

**Solutions:**
1. Close other apps using microphone (Zoom, Skype, etc.)
2. Close other browser tabs with microphone access
3. Restart browser

## Browser-Specific Fixes

### Chrome/Chromium
```
1. Go to chrome://settings/content/microphone
2. Ensure "Ask before accessing" is enabled
3. Remove site from "Block" list if present
4. Add site to "Allow" list
```

### Firefox
```
1. Go to about:preferences#privacy
2. Scroll to "Permissions" → Microphone
3. Remove site from exceptions and retry
4. Allow when prompted
```

### Edge
```
1. Go to edge://settings/content/microphone
2. Follow same steps as Chrome
3. Ensure Windows microphone permission is enabled
```

## Advanced Diagnostics

### Run Automated Test
1. Open browser console (F12)
2. Type: `window.runVoiceRecorderDiagnostics()`
3. Press Enter
4. Check the test results

### Manual Browser Test
```javascript
// Test 1: Check getUserMedia
navigator.mediaDevices.getUserMedia({ audio: true })
  .then(stream => {
    console.log('✅ Microphone access OK');
    stream.getTracks().forEach(track => track.stop());
  })
  .catch(err => console.error('❌ Microphone failed:', err));

// Test 2: Check MediaRecorder
console.log('MediaRecorder supported:', !!window.MediaRecorder);
```

## System-Level Fixes

### Windows 10/11
1. Settings → Privacy → Microphone
2. Enable "Allow apps to access your microphone"
3. Enable "Allow desktop apps to access your microphone"
4. Check microphone is not muted in sound settings

### macOS
1. System Preferences → Security & Privacy → Privacy
2. Select "Microphone" from left sidebar
3. Enable checkbox for your browser
4. Restart browser

### Linux
1. Check ALSA/PulseAudio configuration
2. Ensure microphone is not muted: `amixer set Capture cap`
3. Test with: `arecord -l` to list audio devices

## Emergency Fallback

If voice recording still doesn't work:

1. **Try Different Browser:** Test in Chrome, Firefox, Edge
2. **Restart Computer:** Clears audio driver issues
3. **Check Antivirus:** Some antivirus blocks microphone access
4. **Incognito Mode:** Test in private/incognito window
5. **External Microphone:** Try USB microphone if using built-in

## Getting Help

When reporting issues, provide:

1. Browser name and version
2. Operating system
3. Error messages from console
4. Results of diagnostic test
5. Whether external microphone is used

## Contact Support

Include this information in your support request:
- Error messages (copy from console)
- Browser: [Browser name and version]
- OS: [Operating system]
- Microphone: [Built-in / USB / Bluetooth]
- Diagnostic results: [Copy console output]

---

**Quick Fix Checklist:**
- [ ] Browser permissions allowed
- [ ] Microphone connected and working
- [ ] HTTPS (for production sites)
- [ ] No other apps using microphone
- [ ] Latest browser version
- [ ] Console shows no critical errors