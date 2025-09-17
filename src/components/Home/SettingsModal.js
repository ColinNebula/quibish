import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import './SettingsModal.css';

const SettingsModal = ({ isOpen, onClose, initialSection = 'general' }) => {
  const { user, updateUser } = useAuth();
  const [activeSection, setActiveSection] = useState(initialSection);
  const [settings, setSettings] = useState({
    // General Settings
    theme: 'light',
    language: 'en',
    timezone: 'auto',
    
    // Notification Settings
    notifications: {
      desktop: true,
      sound: true,
      vibration: true,
      email: false,
      newMessages: true,
      mentions: true,
      calls: true
    },
    
    // Privacy Settings
    privacy: {
      profileVisibility: 'friends',
      lastSeen: true,
      readReceipts: true,
      typing: true,
      blockedUsers: []
    },
    
    // Chat Settings
    chat: {
      fontSize: 'medium',
      enterToSend: true,
      autoDownload: true,
      encryption: true,
      backupEnabled: true
    },
    
    // Media Settings
    media: {
      autoPlayVideos: true,
      autoDownloadImages: true,
      quality: 'high',
      compression: 'auto'
    }
  });

  const [loading, setLoading] = useState(false);

  // Load settings from localStorage or user profile
  useEffect(() => {
    const loadSettings = () => {
      try {
        const savedSettings = localStorage.getItem('quibish_settings');
        if (savedSettings) {
          setSettings(prev => ({ ...prev, ...JSON.parse(savedSettings) }));
        }
        
        // Also load from user object if available
        if (user) {
          setSettings(prev => ({
            ...prev,
            theme: user.theme || prev.theme,
            notifications: { ...prev.notifications, ...user.notifications },
            privacy: { ...prev.privacy, ...user.privacy }
          }));
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };

    if (isOpen) {
      loadSettings();
    }
  }, [isOpen, user]);

  // Save settings
  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      // Save to localStorage
      localStorage.setItem('quibish_settings', JSON.stringify(settings));
      
      // Update user context with relevant settings
      if (updateUser && user) {
        updateUser({
          ...user,
          theme: settings.theme,
          notifications: settings.notifications,
          privacy: settings.privacy
        });
      }
      
      // Apply theme immediately
      document.documentElement.setAttribute('data-theme', settings.theme);
      
      console.log('Settings saved successfully');
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Update a setting
  const updateSetting = (section, key, value) => {
    setSettings(prev => ({
      ...prev,
      [section]: typeof prev[section] === 'object' && !Array.isArray(prev[section])
        ? { ...prev[section], [key]: value }
        : value
    }));
  };

  // Reset settings to defaults
  const resetSettings = () => {
    // eslint-disable-next-line no-restricted-globals
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
      localStorage.removeItem('quibish_settings');
      window.location.reload();
    }
  };

  const sections = [
    { id: 'general', name: 'General', icon: '⚙️' },
    { id: 'notifications', name: 'Notifications', icon: '🔔' },
    { id: 'privacy', name: 'Privacy', icon: '🔒' },
    { id: 'chat', name: 'Chat', icon: '💬' },
    { id: 'media', name: 'Media', icon: '📱' },
    { id: 'account', name: 'Account', icon: '👤' }
  ];

  if (!isOpen) return null;

  return (
    <div className="settings-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="settings-modal">
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="settings-content">
          {/* Settings Navigation */}
          <div className="settings-nav">
            {sections.map(section => (
              <button
                key={section.id}
                className={`nav-item ${activeSection === section.id ? 'active' : ''}`}
                onClick={() => setActiveSection(section.id)}
              >
                <span className="nav-icon">{section.icon}</span>
                <span className="nav-text">{section.name}</span>
              </button>
            ))}
          </div>

          {/* Settings Panels */}
          <div className="settings-panel">
            {activeSection === 'general' && (
              <div className="settings-section">
                <h3>General Settings</h3>
                
                <div className="setting-group">
                  <label>Theme</label>
                  <select 
                    value={settings.theme} 
                    onChange={(e) => updateSetting('theme', null, e.target.value)}
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="auto">Auto (System)</option>
                  </select>
                </div>

                <div className="setting-group">
                  <label>Language</label>
                  <select 
                    value={settings.language} 
                    onChange={(e) => updateSetting('language', null, e.target.value)}
                  >
                    <option value="en">English</option>
                    <option value="es">Español</option>
                    <option value="fr">Français</option>
                    <option value="de">Deutsch</option>
                  </select>
                </div>

                <div className="setting-group">
                  <label>Timezone</label>
                  <select 
                    value={settings.timezone} 
                    onChange={(e) => updateSetting('timezone', null, e.target.value)}
                  >
                    <option value="auto">Auto-detect</option>
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">Eastern Time</option>
                    <option value="America/Los_Angeles">Pacific Time</option>
                  </select>
                </div>
              </div>
            )}

            {activeSection === 'notifications' && (
              <div className="settings-section">
                <h3>Notification Settings</h3>
                
                <div className="setting-group">
                  <label className="toggle-label">
                    <input
                      type="checkbox"
                      checked={settings.notifications.desktop}
                      onChange={(e) => updateSetting('notifications', 'desktop', e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                    Desktop Notifications
                  </label>
                </div>

                <div className="setting-group">
                  <label className="toggle-label">
                    <input
                      type="checkbox"
                      checked={settings.notifications.sound}
                      onChange={(e) => updateSetting('notifications', 'sound', e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                    Sound Notifications
                  </label>
                </div>

                <div className="setting-group">
                  <label className="toggle-label">
                    <input
                      type="checkbox"
                      checked={settings.notifications.newMessages}
                      onChange={(e) => updateSetting('notifications', 'newMessages', e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                    New Messages
                  </label>
                </div>

                <div className="setting-group">
                  <label className="toggle-label">
                    <input
                      type="checkbox"
                      checked={settings.notifications.mentions}
                      onChange={(e) => updateSetting('notifications', 'mentions', e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                    Mentions & Replies
                  </label>
                </div>
              </div>
            )}

            {activeSection === 'privacy' && (
              <div className="settings-section">
                <h3>Privacy Settings</h3>
                
                <div className="setting-group">
                  <label>Profile Visibility</label>
                  <select 
                    value={settings.privacy.profileVisibility} 
                    onChange={(e) => updateSetting('privacy', 'profileVisibility', e.target.value)}
                  >
                    <option value="public">Public</option>
                    <option value="friends">Friends Only</option>
                    <option value="private">Private</option>
                  </select>
                </div>

                <div className="setting-group">
                  <label className="toggle-label">
                    <input
                      type="checkbox"
                      checked={settings.privacy.lastSeen}
                      onChange={(e) => updateSetting('privacy', 'lastSeen', e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                    Show Last Seen
                  </label>
                </div>

                <div className="setting-group">
                  <label className="toggle-label">
                    <input
                      type="checkbox"
                      checked={settings.privacy.readReceipts}
                      onChange={(e) => updateSetting('privacy', 'readReceipts', e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                    Read Receipts
                  </label>
                </div>
              </div>
            )}

            {activeSection === 'chat' && (
              <div className="settings-section">
                <h3>Chat Settings</h3>
                
                <div className="setting-group">
                  <label>Font Size</label>
                  <select 
                    value={settings.chat.fontSize} 
                    onChange={(e) => updateSetting('chat', 'fontSize', e.target.value)}
                  >
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                    <option value="extra-large">Extra Large</option>
                  </select>
                </div>

                <div className="setting-group">
                  <label className="toggle-label">
                    <input
                      type="checkbox"
                      checked={settings.chat.enterToSend}
                      onChange={(e) => updateSetting('chat', 'enterToSend', e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                    Enter to Send Messages
                  </label>
                </div>

                <div className="setting-group">
                  <label className="toggle-label">
                    <input
                      type="checkbox"
                      checked={settings.chat.encryption}
                      onChange={(e) => updateSetting('chat', 'encryption', e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                    End-to-End Encryption
                  </label>
                </div>
              </div>
            )}

            {activeSection === 'media' && (
              <div className="settings-section">
                <h3>Media Settings</h3>
                
                <div className="setting-group">
                  <label className="toggle-label">
                    <input
                      type="checkbox"
                      checked={settings.media.autoPlayVideos}
                      onChange={(e) => updateSetting('media', 'autoPlayVideos', e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                    Auto-play Videos
                  </label>
                </div>

                <div className="setting-group">
                  <label className="toggle-label">
                    <input
                      type="checkbox"
                      checked={settings.media.autoDownloadImages}
                      onChange={(e) => updateSetting('media', 'autoDownloadImages', e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                    Auto-download Images
                  </label>
                </div>

                <div className="setting-group">
                  <label>Media Quality</label>
                  <select 
                    value={settings.media.quality} 
                    onChange={(e) => updateSetting('media', 'quality', e.target.value)}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="original">Original</option>
                  </select>
                </div>
              </div>
            )}

            {activeSection === 'account' && (
              <div className="settings-section">
                <h3>Account Settings</h3>
                
                <div className="setting-group">
                  <label>Account Information</label>
                  <div className="account-info">
                    <p><strong>Name:</strong> {user?.name || 'Demo User'}</p>
                    <p><strong>Email:</strong> {user?.email || 'demo@quibish.com'}</p>
                    <p><strong>Status:</strong> {user?.status || 'Online'}</p>
                  </div>
                </div>

                <div className="setting-group">
                  <button className="danger-btn" onClick={resetSettings}>
                    Reset All Settings
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="settings-footer">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button 
            className="btn-primary" 
            onClick={handleSaveSettings}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;