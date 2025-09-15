import React, { useState } from 'react';
import './Settings.css';
import './tabs.css';

const Settings = ({ user, preferences, onClose, onUpdate }) => {
  // Initialize with user preferences if available, otherwise defaults
  const [appSettings, setAppSettings] = useState({
    theme: preferences?.theme || 'light',
    fontSize: preferences?.fontSize || 'medium',
    messageGrouping: preferences?.messageGrouping !== false, // Default to true
    autoPlayMedia: preferences?.autoPlayMedia !== false, // Default to true
    soundEffects: preferences?.soundEffects !== false, // Default to true
    desktopNotifications: preferences?.desktopNotifications !== false, // Default to true
    language: preferences?.language || 'en',
    enhancedConnection: preferences?.enhancedConnection !== false, // Default to true
    persistentConnection: preferences?.persistentConnection !== false, // Default to true
  });

  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState('appearance');
  
  // Handle settings changes with modern feedback
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Apply the change with subtle animation
    const element = e.target;
    if (element.parentNode) {
      element.parentNode.classList.add('setting-changed');
      setTimeout(() => {
        element.parentNode.classList.remove('setting-changed');
      }, 300);
    }
    
    setAppSettings({
      ...appSettings,
      [name]: type === 'checkbox' ? checked : value
    });
    setSaved(false);
  };

  // Save settings with animation
  const handleSave = () => {
    // Add saving animation class
    const saveButton = document.querySelector('.settings-save-btn');
    if (saveButton) {
      saveButton.classList.add('saved');
      setTimeout(() => saveButton.classList.remove('saved'), 1500);
    }
    
    onUpdate(appSettings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="settings-container">
      <div className="settings-header">
        <h2>App Settings</h2>
        <button className="close-button" onClick={onClose}>×</button>
      </div>
      
      <div className="settings-tabs">
        <button 
          className={`settings-tab ${activeTab === 'appearance' ? 'active' : ''}`}
          onClick={() => setActiveTab('appearance')}
        >
          <span className="tab-icon">🎨</span>
          <span className="tab-label">Appearance</span>
        </button>
        <button 
          className={`settings-tab ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          <span className="tab-icon">💬</span>
          <span className="tab-label">Chat</span>
        </button>
        <button 
          className={`settings-tab ${activeTab === 'notifications' ? 'active' : ''}`}
          onClick={() => setActiveTab('notifications')}
        >
          <span className="tab-icon">🔔</span>
          <span className="tab-label">Notifications</span>
        </button>
        <button 
          className={`settings-tab ${activeTab === 'connection' ? 'active' : ''}`}
          onClick={() => setActiveTab('connection')}
        >
          <span className="tab-icon">🔌</span>
          <span className="tab-label">Connection</span>
        </button>
        <button 
          className={`settings-tab ${activeTab === 'language' ? 'active' : ''}`}
          onClick={() => setActiveTab('language')}
        >
          <span className="tab-icon">🌐</span>
          <span className="tab-label">Language</span>
        </button>
      </div>
      
      <div className="settings-content">
        {/* Appearance Tab */}
        {activeTab === 'appearance' && (
          <div className="settings-group">
            <h3>Appearance</h3>
            
            <div className="setting-item">
              <label htmlFor="theme">Theme</label>
              <select 
                id="theme" 
                name="theme"
                value={appSettings.theme}
                onChange={handleChange}
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="system">System Default</option>
              </select>
            </div>
            
            <div className="setting-item">
              <label htmlFor="fontSize">Font Size</label>
              <select 
                id="fontSize" 
                name="fontSize"
                value={appSettings.fontSize}
                onChange={handleChange}
              >
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </div>
          </div>
        )}
        
        {/* Chat Tab */}
        {activeTab === 'chat' && (
          <div className="settings-group">
            <h3>Chat Settings</h3>
            
            <div className="setting-item checkbox">
              <input 
                type="checkbox" 
                id="messageGrouping" 
                name="messageGrouping"
                checked={appSettings.messageGrouping}
                onChange={handleChange}
              />
              <label htmlFor="messageGrouping">Group messages by sender</label>
            </div>
            
            <div className="setting-item checkbox">
              <input 
                type="checkbox" 
                id="autoPlayMedia" 
                name="autoPlayMedia"
                checked={appSettings.autoPlayMedia}
                onChange={handleChange}
              />
              <label htmlFor="autoPlayMedia">Auto-play media</label>
            </div>
          </div>
        )}
        
        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="settings-group">
            <h3>Notification Settings</h3>
            
            <div className="setting-item checkbox">
              <input 
                type="checkbox" 
                id="soundEffects" 
                name="soundEffects"
                checked={appSettings.soundEffects}
                onChange={handleChange}
              />
              <label htmlFor="soundEffects">Sound effects</label>
            </div>
            
            <div className="setting-item checkbox">
              <input 
                type="checkbox" 
                id="desktopNotifications" 
                name="desktopNotifications"
                checked={appSettings.desktopNotifications}
                onChange={handleChange}
              />
              <label htmlFor="desktopNotifications">Desktop notifications</label>
            </div>
          </div>
        )}
        
        {/* Connection Tab */}
        {activeTab === 'connection' && (
          <div className="settings-group">
            <h3>Connection Settings</h3>
            
            <div className="setting-item checkbox">
              <input 
                type="checkbox" 
                id="enhancedConnection" 
                name="enhancedConnection"
                checked={appSettings.enhancedConnection}
                onChange={handleChange}
              />
              <label htmlFor="enhancedConnection">Enhanced connection monitoring</label>
            </div>
            
            <div className="setting-item checkbox">
              <input 
                type="checkbox" 
                id="persistentConnection" 
                name="persistentConnection"
                checked={appSettings.persistentConnection}
                onChange={handleChange}
                disabled={!appSettings.enhancedConnection}
              />
              <label htmlFor="persistentConnection" className={!appSettings.enhancedConnection ? 'disabled' : ''}>
                Persistent connection (reconnects across page reloads)
              </label>
              {appSettings.enhancedConnection && appSettings.persistentConnection && (
                <div className="setting-description">
                  Your connection will persist across page reloads and network changes.
                  Connection ID and state are saved locally.
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Language Tab */}
        {activeTab === 'language' && (
          <div className="settings-group">
            <h3>Language Settings</h3>
            
            <div className="setting-item">
              <label htmlFor="language">Interface Language</label>
              <select 
                id="language" 
                name="language"
                value={appSettings.language}
                onChange={handleChange}
              >
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
                <option value="de">Deutsch</option>
              </select>
            </div>
          </div>
        )}
      </div>
      
      <div className="settings-footer">
        <button 
          className={`settings-save-btn ${saved ? 'saved' : ''}`}
          onClick={handleSave}
        >
          {saved ? '✓ Saved!' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
};

export default Settings;
