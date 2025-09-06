import React, { useState } from 'react';
import './PrivacySettings.css';
import userDataService from '../../services/userDataService';

const PrivacySettings = ({ userProfile, onClose, onSave }) => {
  const [privacySettings, setPrivacySettings] = useState({
    profileVisibility: userProfile?.privacy?.profileVisibility || 'public',
    lastSeenVisibility: userProfile?.privacy?.lastSeenVisibility || 'everyone',
    onlineStatusVisibility: userProfile?.privacy?.onlineStatusVisibility || 'everyone',
    phoneVisibility: userProfile?.privacy?.phoneVisibility || 'contacts',
    emailVisibility: userProfile?.privacy?.emailVisibility || 'contacts',
    locationVisibility: userProfile?.privacy?.locationVisibility || 'contacts'
  });

  const [notifications, setNotifications] = useState({
    email: userProfile?.notifications?.email ?? true,
    push: userProfile?.notifications?.push ?? true,
    desktop: userProfile?.notifications?.desktop ?? true,
    sound: userProfile?.notifications?.sound ?? true,
    mentions: userProfile?.notifications?.mentions ?? true,
    directMessages: userProfile?.notifications?.directMessages ?? true,
    groupMessages: userProfile?.notifications?.groupMessages ?? true,
    marketing: userProfile?.notifications?.marketing ?? false
  });

  const [loading, setLoading] = useState(false);

  const visibilityOptions = [
    { value: 'everyone', label: 'Everyone', icon: '🌍', description: 'Visible to all users' },
    { value: 'contacts', label: 'Contacts Only', icon: '👥', description: 'Only your connections can see this' },
    { value: 'nobody', label: 'Nobody', icon: '🔒', description: 'Keep this information private' }
  ];

  const profileVisibilityOptions = [
    { value: 'public', label: 'Public', icon: '🌍', description: 'Anyone can view your profile' },
    { value: 'contacts', label: 'Contacts Only', icon: '👥', description: 'Only connections can view your profile' },
    { value: 'private', label: 'Private', icon: '🔒', description: 'Profile is completely private' }
  ];

  const handlePrivacyChange = (setting, value) => {
    setPrivacySettings(prev => ({
      ...prev,
      [setting]: value
    }));
  };

  const handleNotificationChange = (setting, value) => {
    setNotifications(prev => ({
      ...prev,
      [setting]: value
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const updatedProfile = {
        privacy: privacySettings,
        notifications: notifications
      };

      await userDataService.updateUserProfile(userProfile.id, updatedProfile);
      onSave(updatedProfile);
      onClose();
    } catch (error) {
      console.error('Error saving privacy settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const VisibilitySelector = ({ setting, value, options = visibilityOptions, title, description }) => (
    <div className="privacy-setting">
      <div className="setting-header">
        <h4>{title}</h4>
        <p className="setting-description">{description}</p>
      </div>
      <div className="visibility-options">
        {options.map(option => (
          <button
            key={option.value}
            className={`visibility-option ${value === option.value ? 'active' : ''}`}
            onClick={() => handlePrivacyChange(setting, option.value)}
          >
            <div className="option-icon">{option.icon}</div>
            <div className="option-content">
              <span className="option-label">{option.label}</span>
              <span className="option-desc">{option.description}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  const NotificationToggle = ({ setting, value, title, description }) => (
    <div className="notification-setting">
      <div className="setting-info">
        <h4>{title}</h4>
        <p className="setting-description">{description}</p>
      </div>
      <label className="toggle-switch">
        <input
          type="checkbox"
          checked={value}
          onChange={(e) => handleNotificationChange(setting, e.target.checked)}
        />
        <span className="toggle-slider"></span>
      </label>
    </div>
  );

  return (
    <div className="privacy-settings-overlay" onClick={onClose}>
      <div className="privacy-settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="privacy-settings-header">
          <h2>Privacy & Notifications</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="privacy-settings-content">
          {/* Privacy Section */}
          <div className="settings-section">
            <h3>👁️ Privacy Settings</h3>
            
            <VisibilitySelector
              setting="profileVisibility"
              value={privacySettings.profileVisibility}
              options={profileVisibilityOptions}
              title="Profile Visibility"
              description="Who can view your profile information"
            />

            <VisibilitySelector
              setting="onlineStatusVisibility"
              value={privacySettings.onlineStatusVisibility}
              title="Online Status"
              description="Who can see when you're online"
            />

            <VisibilitySelector
              setting="lastSeenVisibility"
              value={privacySettings.lastSeenVisibility}
              title="Last Seen"
              description="Who can see when you were last active"
            />

            <VisibilitySelector
              setting="phoneVisibility"
              value={privacySettings.phoneVisibility}
              title="Phone Number"
              description="Who can see your phone number"
            />

            <VisibilitySelector
              setting="emailVisibility"
              value={privacySettings.emailVisibility}
              title="Email Address"
              description="Who can see your email address"
            />

            <VisibilitySelector
              setting="locationVisibility"
              value={privacySettings.locationVisibility}
              title="Location"
              description="Who can see your location information"
            />
          </div>

          {/* Notifications Section */}
          <div className="settings-section">
            <h3>🔔 Notification Preferences</h3>
            
            <div className="notification-group">
              <h4>Communication</h4>
              <NotificationToggle
                setting="directMessages"
                value={notifications.directMessages}
                title="Direct Messages"
                description="Get notified when someone sends you a direct message"
              />
              
              <NotificationToggle
                setting="groupMessages"
                value={notifications.groupMessages}
                title="Group Messages"
                description="Receive notifications for group conversations"
              />
              
              <NotificationToggle
                setting="mentions"
                value={notifications.mentions}
                title="Mentions"
                description="Get notified when someone mentions you"
              />
            </div>

            <div className="notification-group">
              <h4>Delivery Methods</h4>
              <NotificationToggle
                setting="push"
                value={notifications.push}
                title="Push Notifications"
                description="Receive push notifications on your device"
              />
              
              <NotificationToggle
                setting="email"
                value={notifications.email}
                title="Email Notifications"
                description="Get notifications via email"
              />
              
              <NotificationToggle
                setting="desktop"
                value={notifications.desktop}
                title="Desktop Notifications"
                description="Show notifications on your desktop"
              />
              
              <NotificationToggle
                setting="sound"
                value={notifications.sound}
                title="Sound Alerts"
                description="Play sounds for notifications"
              />
            </div>

            <div className="notification-group">
              <h4>Marketing</h4>
              <NotificationToggle
                setting="marketing"
                value={notifications.marketing}
                title="Marketing Emails"
                description="Receive promotional content and updates"
              />
            </div>
          </div>
        </div>

        <div className="privacy-settings-footer">
          <button className="cancel-btn" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button className="save-btn" onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrivacySettings;