import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import './utils/notchDetector';

// Voice recorder diagnostics - only import if explicitly enabled
// Set REACT_APP_AUTO_DIAGNOSTICS=true in .env to enable auto-run
// Or run manually in console: window.runVoiceRecorderDiagnostics()
if (process.env.REACT_APP_ENABLE_DIAGNOSTICS === 'true') {
  import('./test-voice-recorder');
}

// Global error handler for browser extension errors
window.addEventListener('error', (event) => {
  // Ignore errors from browser extensions (contentScript.js, inpage.js, etc.)
  if (event.filename && (
    event.filename.includes('contentScript.js') ||
    event.filename.includes('chrome-extension://') ||
    event.filename.includes('moz-extension://')
  )) {
    console.warn('🔌 Browser extension error (ignored):', event.message);
    event.preventDefault();
    return true;
  }
});

// Suppress unhandled Promise rejections from browser extensions (e.g. MetaMask inpage.js)
window.addEventListener('unhandledrejection', (event) => {
  const stack = event.reason?.stack || '';
  const message = event.reason?.message || '';
  if (
    stack.includes('chrome-extension://') ||
    stack.includes('moz-extension://') ||
    message.includes('MetaMask') ||
    message.includes('Failed to connect to MetaMask')
  ) {
    console.warn('🔌 Browser extension promise rejection (ignored):', message);
    event.preventDefault();
  }
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);