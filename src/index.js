import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './responsive.css';
import './responsiveUtils.css';
import AppWithProviders from './AppWithProviders';
import reportWebVitals from './reportWebVitals';
import swManager from './utils/serviceWorkerManager';

// Fix for mobile viewport height issues (iOS Safari, etc.)
const setVhProperty = () => {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
};

// Set initial value and update on resize
setVhProperty();
window.addEventListener('resize', setVhProperty);

// Initialize app with theme preference
const prefersDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
if (prefersDarkMode) {
  document.body.classList.add('dark-theme');
}

// Service Worker event handlers
swManager.on('onUpdate', (newWorker) => {
  console.log('🔄 New app version available!');
  
  // Show update notification (you can customize this)
  if (window.confirm('A new version of Quibish is available. Update now?')) {
    swManager.updateServiceWorker();
  }
});

swManager.on('onOffline', () => {
  console.log('📱 App is now offline');
  document.body.classList.add('offline');
});

swManager.on('onOnline', () => {
  console.log('🌐 App is back online');
  document.body.classList.remove('offline');
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AppWithProviders />
  </React.StrictMode>
);

// Performance monitoring and analytics
reportWebVitals(metric => {
  // Only log in development or send to analytics in production
  if (process.env.NODE_ENV === 'development') {
    console.log(metric);
  } else {
    // Send to analytics service in production
    // analyticsService.sendMetric(metric);
  }
});

// Register service worker after app initialization
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    // Service worker registration is handled automatically by swManager.init()
    console.log('✅ Service Worker initialization complete');
  });
} else if (process.env.NODE_ENV === 'development') {
  console.log('🔧 Service Worker disabled in development mode');
}
