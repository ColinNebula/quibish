import React, { useState, useEffect } from 'react';
import './ThemeToggle.css';

/**
 * ThemeToggle component
 * 
 * A modern theme switcher with smooth transitions that toggles between light and dark modes.
 * It also saves the user's preference to localStorage for persistence across visits.
 * 
 * @param {Object} props
 * @param {string} [props.initialTheme] - Initial theme ('light' or 'dark')
 * @param {Function} [props.onThemeChange] - Callback when theme changes
 * @param {string} [props.position] - Position on screen ('top-right', 'top-left', 'bottom-right', 'bottom-left')
 */
const ThemeToggle = ({ 
  initialTheme = 'light', 
  onThemeChange = null,
  position = 'bottom-right'
}) => {
  const [theme, setTheme] = useState(initialTheme);
  
  // Initialize theme from localStorage or props on first render
  useEffect(() => {
    const savedTheme = localStorage.getItem('quibish-theme');
    if (savedTheme) {
      setTheme(savedTheme);
    } else {
      localStorage.setItem('quibish-theme', initialTheme);
    }
  }, [initialTheme]);
  
  // Apply theme class to document when theme changes
  useEffect(() => {
    if (theme === 'dark') {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
    
    // Save to localStorage
    localStorage.setItem('quibish-theme', theme);
    
    // Call the callback if provided
    if (onThemeChange) {
      onThemeChange(theme);
    }
  }, [theme, onThemeChange]);
  
  // Toggle between light and dark themes
  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };
  
  return (
    <div className={`theme-toggle-wrapper ${position}`}>
      <button 
        className={`theme-toggle-button ${theme}`}
        onClick={toggleTheme}
        title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      >
        <div className="toggle-icons">
          <div className="sun-icon">
            <div className="sun-inner"></div>
            <div className="ray ray-1"></div>
            <div className="ray ray-2"></div>
            <div className="ray ray-3"></div>
            <div className="ray ray-4"></div>
          </div>
          <div className="moon-icon">
            <div className="moon-inner"></div>
            <div className="star star-1"></div>
            <div className="star star-2"></div>
            <div className="star star-3"></div>
          </div>
        </div>
      </button>
    </div>
  );
};

export default ThemeToggle;
