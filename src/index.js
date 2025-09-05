import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './responsive.css';
import './responsiveUtils.css';
import AppWithProviders from './AppWithProviders';
import reportWebVitals from './reportWebVitals';

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
