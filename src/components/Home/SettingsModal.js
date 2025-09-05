import React, { useState, useEffect } from 'react';
import EnhancedProfile from '../Profile/EnhancedProfile';
import UserAnalytics from './UserAnalytics';
import TwoFactorSettings from '../TwoFactorAuth/TwoFactorSettings';
import './SettingsModal.css';

const SettingsModal = ({ 
  isOpen, 
  onClose, 
  initialSection = 'profile',
  user,
  onSaveProfile,
  darkMode
}) => {
  const [activeSection, setActiveSection] = useState(initialSection);
  
  // Update active section when initialSection prop changes
  useEffect(() => {
    setActiveSection(initialSection);
  }, [initialSection]);
  
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);
  
  if (!isOpen) return null;
  
  // Prevent click events from bubbling up to the overlay
  const handleContentClick = (e) => {
    e.stopPropagation();
  };
  
  // Render the active section content
  const renderSectionContent = () => {
    switch (activeSection) {
      case 'profile':
        return (
          <div className="enhanced-profile-container">
            <EnhancedProfile 
              user={user}
              onUpdate={onSaveProfile}
              onClose={onClose}
              darkMode={darkMode}
            />
          </div>
        );
      case 'analytics':
        return (
          <div className="settings-section">
            <h2>User Analytics</h2>
            <UserAnalytics userId={user?.id} darkMode={darkMode} />
          </div>
        );
      case 'preferences':
        return (
          <div className="settings-section">
            <h2>Preferences</h2>
            <p>Application preferences will be shown here.</p>
            {/* Preferences settings would go here */}
          </div>
        );
      case 'notifications':
        return (
          <div className="settings-section">
            <h2>Notifications</h2>
            <p>Notification settings will be shown here.</p>
            {/* Notification settings would go here */}
          </div>
        );
      case 'privacy':
        return (
          <div className="settings-section">
            <TwoFactorSettings />
          </div>
        );
      default:
        return (
          <div className="settings-section">
            <h2>Settings</h2>
            <p>Select a section from the menu above.</p>
          </div>
        );
    }
  };
  
  return (
    <div className="settings-modal-overlay" onClick={onClose}>
      <div className={`settings-modal ${darkMode ? 'dark' : ''}`} onClick={handleContentClick}>
        <div className="settings-modal-header">
          <h2 className="settings-modal-title">Settings</h2>
          <button className="settings-modal-close" onClick={onClose} aria-label="Close settings">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        <div className="settings-modal-nav">
          <div 
            className={`settings-nav-item ${activeSection === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveSection('profile')}
          >
            Profile
          </div>
          <div 
            className={`settings-nav-item ${activeSection === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveSection('analytics')}
          >
            Analytics
          </div>
          <div 
            className={`settings-nav-item ${activeSection === 'preferences' ? 'active' : ''}`}
            onClick={() => setActiveSection('preferences')}
          >
            Preferences
          </div>
          <div 
            className={`settings-nav-item ${activeSection === 'notifications' ? 'active' : ''}`}
            onClick={() => setActiveSection('notifications')}
          >
            Notifications
          </div>
          <div 
            className={`settings-nav-item ${activeSection === 'privacy' ? 'active' : ''}`}
            onClick={() => setActiveSection('privacy')}
          >
            Privacy & Security
          </div>
        </div>
        
        <div className="settings-modal-body">
          {renderSectionContent()}
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
