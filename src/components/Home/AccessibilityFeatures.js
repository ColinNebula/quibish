import React, { useEffect, useState } from 'react';
import './AccessibilityFeatures.css';

const AccessibilityFeatures = ({ darkMode, setFontSize, currentFontSize, highContrast, setHighContrast }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [fontSizeValue, setFontSizeValue] = useState(currentFontSize || 100);
  const [isHighContrast, setIsHighContrast] = useState(highContrast || false);
  
  useEffect(() => {
    // Apply font size to :root CSS variable
    document.documentElement.style.setProperty('--app-font-size-factor', `${fontSizeValue}%`);
    
    // Save font size preference
    localStorage.setItem('appFontSize', fontSizeValue);
    
    // Call parent setter if provided
    if (setFontSize) {
      setFontSize(fontSizeValue);
    }
  }, [fontSizeValue, setFontSize]);
  
  useEffect(() => {
    // Apply high contrast mode
    if (isHighContrast) {
      document.body.classList.add('high-contrast-mode');
    } else {
      document.body.classList.remove('high-contrast-mode');
    }
    
    // Save preference
    localStorage.setItem('highContrastMode', isHighContrast);
    
    // Call parent setter if provided
    if (setHighContrast) {
      setHighContrast(isHighContrast);
    }
  }, [isHighContrast, setHighContrast]);
  
  const handleFontSizeChange = (value) => {
    // Limit values between 80% and 150%
    const newSize = Math.min(150, Math.max(80, value));
    setFontSizeValue(newSize);
  };
  
  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };
  
  return (
    <div className={`accessibility-container ${darkMode ? 'dark-theme' : ''}`}>
      <button 
        className="accessibility-toggle" 
        onClick={toggleMenu}
        aria-label="Accessibility options"
        aria-expanded={isOpen}
        title="Accessibility options"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm9 7h-6v13h-2v-6h-2v6H9V9H3V7h18v2z" fill="currentColor"/>
        </svg>
      </button>
      
      {isOpen && (
        <div className="accessibility-menu" role="menu">
          <div className="accessibility-header">
            <h3>Accessibility Options</h3>
            <button 
              className="close-button" 
              onClick={toggleMenu}
              aria-label="Close accessibility menu"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor"/>
              </svg>
            </button>
          </div>
          
          <div className="accessibility-option">
            <label htmlFor="font-size-control">Text Size</label>
            <div className="control-row">
              <button 
                className="size-button" 
                onClick={() => handleFontSizeChange(fontSizeValue - 10)}
                aria-label="Decrease text size"
                disabled={fontSizeValue <= 80}
              >
                <span>A-</span>
              </button>
              <input
                id="font-size-control"
                type="range"
                min="80"
                max="150"
                step="10"
                value={fontSizeValue}
                onChange={(e) => handleFontSizeChange(parseInt(e.target.value))}
                aria-label="Adjust text size"
              />
              <button 
                className="size-button" 
                onClick={() => handleFontSizeChange(fontSizeValue + 10)}
                aria-label="Increase text size"
                disabled={fontSizeValue >= 150}
              >
                <span>A+</span>
              </button>
            </div>
            <span className="size-value">{fontSizeValue}%</span>
          </div>
          
          <div className="accessibility-option">
            <label htmlFor="high-contrast-switch">High Contrast</label>
            <div className="switch-container">
              <input
                id="high-contrast-switch"
                type="checkbox"
                checked={isHighContrast}
                onChange={() => setIsHighContrast(!isHighContrast)}
                aria-label="Toggle high contrast mode"
              />
              <span className="switch-slider"></span>
            </div>
          </div>
          
          <div className="accessibility-footer">
            <button 
              className="reset-button"
              onClick={() => {
                setFontSizeValue(100);
                setIsHighContrast(false);
              }}
              aria-label="Reset accessibility settings"
            >
              Reset to Default
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccessibilityFeatures;
