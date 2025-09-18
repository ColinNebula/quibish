import React, { useState, useEffect } from 'react';
import pushNotificationService from '../../services/pushNotificationService';
import './NotificationSettings.css';

const NotificationSettings = ({ isOpen, onClose, user }) => {
  const [settings, setSettings] = useState({
    pushEnabled: false,
    emailEnabled: true,
    soundEnabled: true,
    vibrationEnabled: true,
    showPreview: true,
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '08:00'
    },
    emailFrequency: 'immediate', // immediate, hourly, daily, weekly
    notifyOnMention: true,
    notifyOnDM: true,
    notifyOnGroupMessage: false
  });

  const [pushStatus, setPushStatus] = useState({
    isSupported: false,
    permission: 'default',
    hasSubscription: false
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadNotificationSettings();
      checkPushStatus();
    }
  }, [isOpen]);

  const loadNotificationSettings = async () => {
    try {
      // Load user's notification preferences from backend
      const response = await fetch('/api/users/notification-preferences', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const preferences = await response.json();
        setSettings(prev => ({ ...prev, ...preferences }));
      }
    } catch (error) {
      console.error('Failed to load notification settings:', error);
    }
  };

  const saveNotificationSettings = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/users/notification-preferences', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      });

      if (response.ok) {
        setSuccess('Notification settings saved successfully!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      console.error('Failed to save notification settings:', error);
      setError('Failed to save notification settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const checkPushStatus = () => {
    const status = pushNotificationService.getSubscriptionStatus();
    setPushStatus(status);
  };

  const handlePushToggle = async () => {
    if (!pushStatus.isSupported) {
      setError('Push notifications are not supported in this browser');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (settings.pushEnabled) {
        // Disable push notifications
        await pushNotificationService.unsubscribe();
        setSettings(prev => ({ ...prev, pushEnabled: false }));
        checkPushStatus();
      } else {
        // Enable push notifications
        await pushNotificationService.requestPermission();
        setSettings(prev => ({ ...prev, pushEnabled: true }));
        checkPushStatus();
      }
    } catch (error) {
      console.error('Failed to toggle push notifications:', error);
      setError('Failed to enable push notifications. Please check your browser settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleTestNotification = async () => {
    setLoading(true);
    setError('');

    try {
      if (settings.pushEnabled && pushStatus.hasSubscription) {
        await pushNotificationService.testNotification('Test notification from Quibish! 🎉');
        setSuccess('Test notification sent!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError('Push notifications must be enabled first');
      }
    } catch (error) {
      console.error('Failed to send test notification:', error);
      setError('Failed to send test notification');
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleQuietHoursChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      quietHours: {
        ...prev.quietHours,
        [key]: value
      }
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="notification-settings-overlay">
      <div className="notification-settings-modal">
        <div className="notification-settings-header">
          <h2>🔔 Notification Settings</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="notification-settings-content">
          {error && (
            <div className="alert alert-error">
              <span>⚠️ {error}</span>
            </div>
          )}

          {success && (
            <div className="alert alert-success">
              <span>✅ {success}</span>
            </div>
          )}

          {/* Push Notifications Section */}
          <div className="settings-section">
            <h3>📱 Push Notifications</h3>
            <div className="setting-item">
              <div className="setting-info">
                <label>Enable Push Notifications</label>
                <span className="setting-description">
                  Get notifications even when the app is closed
                </span>
              </div>
              <div className="setting-controls">
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.pushEnabled}
                    onChange={handlePushToggle}
                    disabled={loading || !pushStatus.isSupported}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>

            {!pushStatus.isSupported && (
              <div className="warning-message">
                Push notifications are not supported in this browser
              </div>
            )}

            {settings.pushEnabled && (
              <div className="push-status">
                <p>Status: {pushStatus.hasSubscription ? '✅ Active' : '⚠️ Not subscribed'}</p>
                <button 
                  className="test-btn"
                  onClick={handleTestNotification}
                  disabled={loading || !pushStatus.hasSubscription}
                >
                  Send Test Notification
                </button>
              </div>
            )}
          </div>

          {/* Email Notifications Section */}
          <div className="settings-section">
            <h3>📧 Email Notifications</h3>
            <div className="setting-item">
              <div className="setting-info">
                <label>Enable Email Notifications</label>
                <span className="setting-description">
                  Receive email alerts when you're offline
                </span>
              </div>
              <div className="setting-controls">
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.emailEnabled}
                    onChange={(e) => handleSettingChange('emailEnabled', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>

            {settings.emailEnabled && (
              <div className="setting-item">
                <div className="setting-info">
                  <label>Email Frequency</label>
                  <span className="setting-description">
                    How often to send email notifications
                  </span>
                </div>
                <div className="setting-controls">
                  <select
                    value={settings.emailFrequency}
                    onChange={(e) => handleSettingChange('emailFrequency', e.target.value)}
                    className="frequency-select"
                  >
                    <option value="immediate">Immediate</option>
                    <option value="hourly">Hourly digest</option>
                    <option value="daily">Daily digest</option>
                    <option value="weekly">Weekly digest</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Notification Types Section */}
          <div className="settings-section">
            <h3>📋 Notification Types</h3>
            <div className="setting-item">
              <div className="setting-info">
                <label>Direct Messages</label>
                <span className="setting-description">
                  Notify when you receive a direct message
                </span>
              </div>
              <div className="setting-controls">
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.notifyOnDM}
                    onChange={(e) => handleSettingChange('notifyOnDM', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <label>Mentions</label>
                <span className="setting-description">
                  Notify when someone mentions you
                </span>
              </div>
              <div className="setting-controls">
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.notifyOnMention}
                    onChange={(e) => handleSettingChange('notifyOnMention', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <label>Group Messages</label>
                <span className="setting-description">
                  Notify for all group messages
                </span>
              </div>
              <div className="setting-controls">
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.notifyOnGroupMessage}
                    onChange={(e) => handleSettingChange('notifyOnGroupMessage', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>
          </div>

          {/* Notification Behavior Section */}
          <div className="settings-section">
            <h3>🔊 Notification Behavior</h3>
            <div className="setting-item">
              <div className="setting-info">
                <label>Sound</label>
                <span className="setting-description">
                  Play sound for notifications
                </span>
              </div>
              <div className="setting-controls">
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.soundEnabled}
                    onChange={(e) => handleSettingChange('soundEnabled', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <label>Vibration</label>
                <span className="setting-description">
                  Vibrate on mobile devices
                </span>
              </div>
              <div className="setting-controls">
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.vibrationEnabled}
                    onChange={(e) => handleSettingChange('vibrationEnabled', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <label>Show Message Preview</label>
                <span className="setting-description">
                  Show message content in notifications
                </span>
              </div>
              <div className="setting-controls">
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.showPreview}
                    onChange={(e) => handleSettingChange('showPreview', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>
          </div>

          {/* Quiet Hours Section */}
          <div className="settings-section">
            <h3>🌙 Quiet Hours</h3>
            <div className="setting-item">
              <div className="setting-info">
                <label>Enable Quiet Hours</label>
                <span className="setting-description">
                  No notifications during specified hours
                </span>
              </div>
              <div className="setting-controls">
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.quietHours.enabled}
                    onChange={(e) => handleQuietHoursChange('enabled', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>

            {settings.quietHours.enabled && (
              <div className="quiet-hours-times">
                <div className="time-input-group">
                  <label>From:</label>
                  <input
                    type="time"
                    value={settings.quietHours.start}
                    onChange={(e) => handleQuietHoursChange('start', e.target.value)}
                    className="time-input"
                  />
                </div>
                <div className="time-input-group">
                  <label>To:</label>
                  <input
                    type="time"
                    value={settings.quietHours.end}
                    onChange={(e) => handleQuietHoursChange('end', e.target.value)}
                    className="time-input"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="notification-settings-footer">
          <button 
            className="cancel-btn"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button 
            className="save-btn"
            onClick={saveNotificationSettings}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationSettings;