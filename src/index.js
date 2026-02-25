import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { AuthProvider } from './context/AuthContext';

// Voice recorder diagnostics - only import if explicitly enabled
// Set REACT_APP_AUTO_DIAGNOSTICS=true in .env to enable auto-run
// Or run manually in console: window.runVoiceRecorderDiagnostics()
if (process.env.REACT_APP_ENABLE_DIAGNOSTICS === 'true') {
  import('./test-voice-recorder');
}

// Global error handler for browser extension errors
window.addEventListener('error', (event) => {
  // Ignore errors from browser extensions (contentScript.js, etc.)
  if (event.filename && (
    event.filename.includes('contentScript.js') ||
    event.filename.includes('chrome-extension://') ||
    event.filename.includes('moz-extension://')
  )) {
    console.warn('🔌 Browser extension error (ignored):', event.message);
    event.preventDefault(); // Prevent error from showing in console
    return true;
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