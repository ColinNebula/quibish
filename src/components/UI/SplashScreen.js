import React from 'react';
import './SplashScreen.css';

/**
 * Application splash screen shown during initial load
 * 
 * @component SplashScreen
 * @param {Object} props - Component props
 * @param {boolean} props.darkMode - Whether dark mode is enabled
 * @param {string} props.appVersion - Current application version
 * @returns {JSX.Element} Rendered splash screen
 */
const SplashScreen = ({ darkMode = false, appVersion = '1.0.0' }) => {
  return (
    <div className={`splash-screen ${darkMode ? 'dark' : 'light'}`}>
      <div className="splash-content">
        <div className="splash-logo">
          <svg 
            width="80" 
            height="80" 
            viewBox="0 0 24 24" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            className="splash-logo-svg"
          >
            <path 
              d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM20 16H5.17L4.58 16.59L4 17.17V4H20V16Z" 
              fill="currentColor"
              className="logo-path-1"
            />
            <path 
              d="M12 15L16 11L12 7L10.59 8.41L13.17 11L10.59 13.59L12 15Z" 
              fill="currentColor"
              className="logo-path-2"
            />
            <path 
              d="M6 11H9V13H6V11Z" 
              fill="currentColor"
              className="logo-path-3"
            />
          </svg>
        </div>
        <h1 className="splash-title">QuibiChat</h1>
        <div className="splash-tagline">Professional Communication Platform</div>
        
        <div className="loading-indicator">
          <div className="loading-dots">
            <div className="loading-dot"></div>
            <div className="loading-dot"></div>
            <div className="loading-dot"></div>
          </div>
        </div>
        
        <div className="splash-version">v{appVersion}</div>
      </div>
    </div>
  );
};

export default SplashScreen;
