import React, { useState, useEffect } from 'react';
import './NotificationSettings.css';

const NotificationSettings = ({ user, darkMode, onUnsavedChanges }) => {
  const [settings, setSettings] = useState({
    // Message Notifications
    messageNotifications: true,
    messageSounds: true,
    messagePreview: true,
    
    // Email Notifications
    emailDigest: true,
    emailNewMessages: false,
    emailSecurityAlerts: true,
    
    // Push Notifications
    pushEnabled: true,
    pushMessages: true,
    pushMentions: true,
    pushGroupActivity: false,
    
    // Do Not Disturb
    dndEnabled: false,
    dndStart: '22:00',
    dndEnd: '08:00',
    dndDays: ['saturday', 'sunday'],
    
    // Advanced
    vibration: true,
    ledFlash: false,
    notificationGrouping: true,
    customTones: false
  });

  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    onUnsavedChanges?.(hasChanges);
  }, [hasChanges, onUnsavedChanges]);

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
    setHasChanges(true);
  };

  const handleArrayToggle = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: prev[key].includes(value) 
        ? prev[key].filter(item => item !== value)
        : [...prev[key], value]
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    // Save settings logic here
    console.log('Saving notification settings:', settings);
    setHasChanges(false);
    // Show success message
    const event = new CustomEvent('showToast', {
      detail: { message: 'Notification settings saved!', type: 'success' }
    });
    window.dispatchEvent(event);
  };

  const handleReset = () => {
    const confirmReset = window.confirm('Reset all notification settings to default?');
    if (confirmReset) {
      setSettings({
        messageNotifications: true,
        messageSounds: true,
        messagePreview: true,
        emailDigest: true,
        emailNewMessages: false,
        emailSecurityAlerts: true,
        pushEnabled: true,
        pushMessages: true,
        pushMentions: true,
        pushGroupActivity: false,
        dndEnabled: false,
        dndStart: '22:00',
        dndEnd: '08:00',
        dndDays: ['saturday', 'sunday'],
        vibration: true,
        ledFlash: false,
        notificationGrouping: true,
        customTones: false
      });
      setHasChanges(true);
    }
  };

  const ToggleSwitch = ({ checked, onChange, disabled = false }) => (
    <label className={`toggle-switch ${disabled ? 'disabled' : ''}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
      />
      <span className="toggle-slider"></span>
    </label>
  );

  const daysOfWeek = [
    { id: 'monday', label: 'Mon' },
    { id: 'tuesday', label: 'Tue' },
    { id: 'wednesday', label: 'Wed' },
    { id: 'thursday', label: 'Thu' },
    { id: 'friday', label: 'Fri' },
    { id: 'saturday', label: 'Sat' },
    { id: 'sunday', label: 'Sun' }
  ];

  return (
    <div className={`notification-settings ${darkMode ? 'dark' : ''}`}>
      {/* Message Notifications */}
      <div className="settings-group">
        <h3 className="group-title">
          <span className="group-icon">💬</span>
          Message Notifications
        </h3>
        
        <div className="setting-item">
          <div className="setting-info">
            <label className="setting-label">Enable Message Notifications</label>
            <p className="setting-description">Receive notifications for new messages</p>
          </div>
          <ToggleSwitch
            checked={settings.messageNotifications}
            onChange={(value) => handleSettingChange('messageNotifications', value)}
          />
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <label className="setting-label">Notification Sounds</label>
            <p className="setting-description">Play sound when receiving messages</p>
          </div>
          <ToggleSwitch
            checked={settings.messageSounds}
            onChange={(value) => handleSettingChange('messageSounds', value)}
            disabled={!settings.messageNotifications}
          />
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <label className="setting-label">Message Preview</label>
            <p className="setting-description">Show message content in notifications</p>
          </div>
          <ToggleSwitch
            checked={settings.messagePreview}
            onChange={(value) => handleSettingChange('messagePreview', value)}
            disabled={!settings.messageNotifications}
          />
        </div>
      </div>

      {/* Email Notifications */}
      <div className="settings-group">
        <h3 className="group-title">
          <span className="group-icon">📧</span>
          Email Notifications
        </h3>
        
        <div className="setting-item">
          <div className="setting-info">
            <label className="setting-label">Daily Email Digest</label>
            <p className="setting-description">Daily summary of your activity</p>
          </div>
          <ToggleSwitch
            checked={settings.emailDigest}
            onChange={(value) => handleSettingChange('emailDigest', value)}
          />
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <label className="setting-label">New Message Emails</label>
            <p className="setting-description">Email notifications for new messages</p>
          </div>
          <ToggleSwitch
            checked={settings.emailNewMessages}
            onChange={(value) => handleSettingChange('emailNewMessages', value)}
          />
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <label className="setting-label">Security Alerts</label>
            <p className="setting-description">Important security notifications</p>
          </div>
          <ToggleSwitch
            checked={settings.emailSecurityAlerts}
            onChange={(value) => handleSettingChange('emailSecurityAlerts', value)}
          />
        </div>
      </div>

      {/* Push Notifications */}
      <div className="settings-group">
        <h3 className="group-title">
          <span className="group-icon">📱</span>
          Push Notifications
        </h3>
        
        <div className="setting-item">
          <div className="setting-info">
            <label className="setting-label">Enable Push Notifications</label>
            <p className="setting-description">Receive push notifications on your device</p>
          </div>
          <ToggleSwitch
            checked={settings.pushEnabled}
            onChange={(value) => handleSettingChange('pushEnabled', value)}
          />
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <label className="setting-label">Message Notifications</label>
            <p className="setting-description">Push notifications for new messages</p>
          </div>
          <ToggleSwitch
            checked={settings.pushMessages}
            onChange={(value) => handleSettingChange('pushMessages', value)}
            disabled={!settings.pushEnabled}
          />
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <label className="setting-label">Mentions & Replies</label>
            <p className="setting-description">When someone mentions or replies to you</p>
          </div>
          <ToggleSwitch
            checked={settings.pushMentions}
            onChange={(value) => handleSettingChange('pushMentions', value)}
            disabled={!settings.pushEnabled}
          />
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <label className="setting-label">Group Activity</label>
            <p className="setting-description">Activity in your groups and channels</p>
          </div>
          <ToggleSwitch
            checked={settings.pushGroupActivity}
            onChange={(value) => handleSettingChange('pushGroupActivity', value)}
            disabled={!settings.pushEnabled}
          />
        </div>
      </div>

      {/* Do Not Disturb */}
      <div className="settings-group">
        <h3 className="group-title">
          <span className="group-icon">🌙</span>
          Do Not Disturb
        </h3>
        
        <div className="setting-item">
          <div className="setting-info">
            <label className="setting-label">Enable Do Not Disturb</label>
            <p className="setting-description">Quiet hours with no notifications</p>
          </div>
          <ToggleSwitch
            checked={settings.dndEnabled}
            onChange={(value) => handleSettingChange('dndEnabled', value)}
          />
        </div>

        {settings.dndEnabled && (
          <>
            <div className="setting-item">
              <div className="setting-info">
                <label className="setting-label">Time Range</label>
                <p className="setting-description">When do not disturb should be active</p>
              </div>
              <div className="time-range">
                <input
                  type="time"
                  value={settings.dndStart}
                  onChange={(e) => handleSettingChange('dndStart', e.target.value)}
                  className="time-input"
                />
                <span className="time-separator">to</span>
                <input
                  type="time"
                  value={settings.dndEnd}
                  onChange={(e) => handleSettingChange('dndEnd', e.target.value)}
                  className="time-input"
                />
              </div>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <label className="setting-label">Active Days</label>
                <p className="setting-description">Days when do not disturb is active</p>
              </div>
              <div className="days-selector">
                {daysOfWeek.map((day) => (
                  <button
                    key={day.id}
                    className={`day-btn ${settings.dndDays.includes(day.id) ? 'active' : ''}`}
                    onClick={() => handleArrayToggle('dndDays', day.id)}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Advanced Settings */}
      <div className="settings-group">
        <h3 className="group-title">
          <span className="group-icon">⚙️</span>
          Advanced
        </h3>
        
        <div className="setting-item">
          <div className="setting-info">
            <label className="setting-label">Vibration</label>
            <p className="setting-description">Vibrate on notifications</p>
          </div>
          <ToggleSwitch
            checked={settings.vibration}
            onChange={(value) => handleSettingChange('vibration', value)}
          />
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <label className="setting-label">LED Flash</label>
            <p className="setting-description">Flash LED light for notifications</p>
          </div>
          <ToggleSwitch
            checked={settings.ledFlash}
            onChange={(value) => handleSettingChange('ledFlash', value)}
          />
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <label className="setting-label">Group Notifications</label>
            <p className="setting-description">Bundle similar notifications together</p>
          </div>
          <ToggleSwitch
            checked={settings.notificationGrouping}
            onChange={(value) => handleSettingChange('notificationGrouping', value)}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="settings-actions">
        <button className="settings-btn secondary" onClick={handleReset}>
          Reset to Default
        </button>
        <button 
          className={`settings-btn primary ${hasChanges ? 'has-changes' : ''}`}
          onClick={handleSave}
          disabled={!hasChanges}
        >
          {hasChanges ? 'Save Changes' : 'All Saved'}
        </button>
      </div>
    </div>
  );
};

export default NotificationSettings;