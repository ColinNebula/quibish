import React, { useState, useEffect } from 'react';
import './ColorPreferences.css';

const ColorPreferences = ({ 
  user, 
  onSave, 
  darkMode 
}) => {
  // Available color themes (same as in ProChat)
  const colorThemes = [
    { id: 'blue', name: 'Ocean Blue', bg: '#e3f2fd', border: '#2196f3', accent: '#1976d2' },
    { id: 'purple', name: 'Royal Purple', bg: '#f3e5f5', border: '#9c27b0', accent: '#7b1fa2' },
    { id: 'green', name: 'Forest Green', bg: '#e8f5e8', border: '#4caf50', accent: '#388e3c' },
    { id: 'orange', name: 'Sunset Orange', bg: '#fff3e0', border: '#ff9800', accent: '#f57c00' },
    { id: 'pink', name: 'Rose Pink', bg: '#fce4ec', border: '#e91e63', accent: '#c2185b' },
    { id: 'teal', name: 'Mystic Teal', bg: '#e0f2f1', border: '#009688', accent: '#00695c' },
    { id: 'lightgreen', name: 'Spring Green', bg: '#f1f8e9', border: '#8bc34a', accent: '#689f38' },
    { id: 'indigo', name: 'Deep Indigo', bg: '#e8eaf6', border: '#3f51b5', accent: '#303f9f' },
    { id: 'amber', name: 'Golden Amber', bg: '#fff8e1', border: '#ffc107', accent: '#ffa000' },
    { id: 'peach', name: 'Warm Peach', bg: '#ffeaa7', border: '#fdcb6e', accent: '#e17055' },
    { id: 'coral', name: 'Coral Reef', bg: '#fab1a0', border: '#e17055', accent: '#d63031' },
    { id: 'lavender', name: 'Lavender Dream', bg: '#a29bfe', border: '#6c5ce7', accent: '#5f3dc4' },
  ];

  const [selectedTheme, setSelectedTheme] = useState(
    user?.preferences?.messageColor || 'auto'
  );
  const [previewMode, setPreviewMode] = useState(false);
  const [saving, setSaving] = useState(false);

  // Get user's auto-assigned color (based on user ID hash)
  const getAutoColor = () => {
    if (!user?.id) return colorThemes[0];
    
    let hash = 0;
    for (let i = 0; i < user.id.toString().length; i++) {
      const char = user.id.toString().charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    const colorIndex = Math.abs(hash) % colorThemes.length;
    return colorThemes[colorIndex];
  };

  const autoColor = getAutoColor();

  const handleThemeSelect = (themeId) => {
    setSelectedTheme(themeId);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updatedUser = {
        ...user,
        preferences: {
          ...user.preferences,
          messageColor: selectedTheme
        }
      };
      
      // Save to localStorage for persistence
      localStorage.setItem('userColorPreference', selectedTheme);
      
      // Dispatch custom event to notify ProChat of color change
      window.dispatchEvent(new CustomEvent('userColorChanged', { 
        detail: { colorTheme: selectedTheme } 
      }));
      
      if (onSave) {
        await onSave(updatedUser);
      }
      
      // Show success message
      alert('Color preference saved successfully!');
    } catch (error) {
      console.error('Error saving color preference:', error);
      alert('Failed to save color preference. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSelectedTheme('auto');
    localStorage.removeItem('userColorPreference');
  };

  const renderColorPreview = (theme) => {
    const isAuto = theme === 'auto';
    const colorData = isAuto ? autoColor : colorThemes.find(t => t.id === theme);
    
    if (!colorData) return null;

    return (
      <div 
        className="color-preview-card"
        style={{
          backgroundColor: colorData.bg,
          borderLeftColor: colorData.border,
          borderLeftWidth: '4px',
          borderLeftStyle: 'solid'
        }}
      >
        <div className="preview-header">
          <span 
            className="preview-username"
            style={{ color: colorData.accent }}
          >
            {user?.name || 'Your Name'}
          </span>
          <span className="preview-time">2:34 PM</span>
        </div>
        <div className="preview-message">
          This is how your messages will look with this color theme! 🎨
        </div>
      </div>
    );
  };

  return (
    <div className={`color-preferences ${darkMode ? 'dark' : ''}`}>
      <div className="preferences-header">
        <h3>Message Card Colors</h3>
        <p>Customize how your messages appear to other users in conversations</p>
      </div>

      <div className="current-preview">
        <h4>Current Selection Preview</h4>
        {renderColorPreview(selectedTheme)}
      </div>

      <div className="color-options">
        <h4>Choose Your Color Theme</h4>
        
        <div className="color-grid">
          {/* Auto option */}
          <div 
            className={`color-option ${selectedTheme === 'auto' ? 'selected' : ''}`}
            onClick={() => handleThemeSelect('auto')}
          >
            <div 
              className="color-swatch auto-swatch"
              style={{
                background: `linear-gradient(45deg, ${autoColor.bg}, ${autoColor.border})`
              }}
            >
              <span className="auto-label">AUTO</span>
            </div>
            <span className="color-name">Auto-Assigned</span>
            <span className="color-description">Based on your unique ID</span>
          </div>

          {/* Manual color options */}
          {colorThemes.map(theme => (
            <div 
              key={theme.id}
              className={`color-option ${selectedTheme === theme.id ? 'selected' : ''}`}
              onClick={() => handleThemeSelect(theme.id)}
            >
              <div 
                className="color-swatch"
                style={{
                  backgroundColor: theme.bg,
                  border: `3px solid ${theme.border}`
                }}
              >
                <div 
                  className="swatch-accent"
                  style={{ backgroundColor: theme.accent }}
                />
              </div>
              <span className="color-name">{theme.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="preferences-actions">
        <button 
          className="reset-button"
          onClick={handleReset}
          disabled={saving}
        >
          Reset to Auto
        </button>
        <button 
          className="save-button"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="preferences-info">
        <h4>About Message Colors</h4>
        <ul>
          <li>🎨 <strong>Auto-Assigned:</strong> A unique color is automatically chosen based on your user ID</li>
          <li>🌈 <strong>Custom Colors:</strong> Choose your preferred color theme from our curated palette</li>
          <li>👥 <strong>Consistency:</strong> Your chosen color will appear consistently across all conversations</li>
          <li>🔄 <strong>Live Updates:</strong> Changes are applied immediately to new messages</li>
        </ul>
      </div>
    </div>
  );
};

export default ColorPreferences;