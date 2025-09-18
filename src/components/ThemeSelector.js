import React, { useState, useEffect } from 'react';
import dynamicThemeService from '../services/dynamicThemeService';
import './ThemeSelector.css';

const ThemeSelector = () => {
  const [currentTheme, setCurrentTheme] = useState('auto');
  const [isOpen, setIsOpen] = useState(false);
  const [effectsEnabled, setEffectsEnabled] = useState(true);
  const [autoMode, setAutoMode] = useState(true);

  useEffect(() => {
    // Load saved preferences
    const savedTheme = localStorage.getItem('quibish-theme-preference') || 'auto';
    const savedEffects = localStorage.getItem('quibish-effects-enabled');
    const savedAutoMode = localStorage.getItem('quibish-auto-mode');

    setCurrentTheme(savedTheme);
    setEffectsEnabled(savedEffects !== 'false');
    setAutoMode(savedAutoMode !== 'false');

    // Apply saved settings
    if (savedEffects === 'false') {
      dynamicThemeService.toggleEffects(false);
    }

    // Initialize theme service animations
    dynamicThemeService.addAnimationStyles();
  }, []);

  const themes = [
    { id: 'auto', name: 'Auto (Seasonal)', icon: '🌟', description: 'Automatically changes with seasons' },
    { id: 'spring', name: 'Spring Bloom', icon: '🌸', description: 'Fresh greens and blooming flowers' },
    { id: 'summer', name: 'Summer Vibes', icon: '☀️', description: 'Bright blues and sunny vibes' },
    { id: 'autumn', name: 'Autumn Leaves', icon: '🍂', description: 'Warm oranges and falling leaves' },
    { id: 'winter', name: 'Winter Wonder', icon: '❄️', description: 'Cool blues and snowy effects' },
    { id: 'dark', name: 'Dark Mode', icon: '🌙', description: 'Easy on the eyes' },
    { id: 'cosmic', name: 'Cosmic', icon: '🌌', description: 'Deep space vibes' },
    { id: 'ocean', name: 'Ocean Depths', icon: '🌊', description: 'Calming ocean blues' }
  ];

  const handleThemeChange = (themeId) => {
    setCurrentTheme(themeId);
    
    if (themeId === 'auto') {
      setAutoMode(true);
      localStorage.setItem('quibish-auto-mode', 'true');
      dynamicThemeService.detectAndApplySeason();
    } else {
      setAutoMode(false);
      localStorage.setItem('quibish-auto-mode', 'false');
      dynamicThemeService.applyTheme(themeId);
    }
    
    localStorage.setItem('quibish-theme-preference', themeId);
  };

  const toggleEffects = () => {
    const newEffectsState = !effectsEnabled;
    setEffectsEnabled(newEffectsState);
    dynamicThemeService.toggleEffects(newEffectsState);
    localStorage.setItem('quibish-effects-enabled', newEffectsState.toString());
  };

  const createCustomTheme = () => {
    const name = prompt('Enter custom theme name:');
    if (!name) return;

    const primaryColor = prompt('Enter primary color (hex):') || '#3b82f6';
    const secondaryColor = prompt('Enter secondary color (hex):') || '#60a5fa';
    const accentColor = prompt('Enter accent color (hex):') || '#f59e0b';
    
    const colors = {
      primary: primaryColor,
      secondary: secondaryColor,
      accent: accentColor
    };
    
    const background = `linear-gradient(135deg, ${primaryColor}20 0%, ${secondaryColor}20 50%, ${accentColor}20 100%)`;
    
    dynamicThemeService.createCustomTheme(name, colors, background);
    handleThemeChange(name);
  };

  return (
    <>
      {/* Theme Toggle Button */}
      <button 
        className={`theme-toggle ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Theme Settings"
      >
        <span className="theme-icon">🎨</span>
      </button>

      {/* Theme Panel */}
      {isOpen && (
        <div className="theme-panel">
          <div className="theme-panel-header">
            <h3>🎨 Themes & Effects</h3>
            <button 
              className="close-btn"
              onClick={() => setIsOpen(false)}
            >
              ✕
            </button>
          </div>

          <div className="theme-panel-content">
            {/* Theme Options */}
            <div className="theme-section">
              <h4>Choose Theme</h4>
              <div className="theme-grid">
                {themes.map(theme => (
                  <div
                    key={theme.id}
                    className={`theme-card ${currentTheme === theme.id ? 'active' : ''}`}
                    onClick={() => handleThemeChange(theme.id)}
                  >
                    <div className="theme-preview">
                      <span className="theme-emoji">{theme.icon}</span>
                    </div>
                    <div className="theme-info">
                      <div className="theme-name">{theme.name}</div>
                      <div className="theme-description">{theme.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Effects Controls */}
            <div className="theme-section">
              <h4>Visual Effects</h4>
              <div className="effects-controls">
                <label className="toggle-label">
                  <input
                    type="checkbox"
                    checked={effectsEnabled}
                    onChange={toggleEffects}
                  />
                  <span className="toggle-slider"></span>
                  <span className="toggle-text">
                    {effectsEnabled ? '✨ Effects On' : '🚫 Effects Off'}
                  </span>
                </label>

                <label className="toggle-label">
                  <input
                    type="checkbox"
                    checked={autoMode}
                    onChange={(e) => {
                      setAutoMode(e.target.checked);
                      localStorage.setItem('quibish-auto-mode', e.target.checked.toString());
                      if (e.target.checked) {
                        handleThemeChange('auto');
                      }
                    }}
                  />
                  <span className="toggle-slider"></span>
                  <span className="toggle-text">
                    {autoMode ? '🌟 Auto Season' : '🔒 Manual Mode'}
                  </span>
                </label>
              </div>
            </div>

            {/* Custom Theme */}
            <div className="theme-section">
              <h4>Personalization</h4>
              <button 
                className="custom-theme-btn"
                onClick={createCustomTheme}
              >
                <span>🎨</span>
                Create Custom Theme
              </button>
            </div>

            {/* Current Theme Info */}
            <div className="theme-section">
              <div className="current-theme-info">
                <h4>Current Theme</h4>
                <div className="current-theme-display">
                  <span className="current-theme-icon">
                    {themes.find(t => t.id === currentTheme)?.icon || '🎨'}
                  </span>
                  <span className="current-theme-name">
                    {themes.find(t => t.id === currentTheme)?.name || 'Custom Theme'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Background Overlay */}
      {isOpen && (
        <div 
          className="theme-panel-overlay"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
};

export default ThemeSelector;