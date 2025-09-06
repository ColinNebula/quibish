import React, { useState, useEffect, useCallback } from 'react';
import EnhancedProfile from '../Profile/EnhancedProfile';
import UserAnalytics from './UserAnalytics';
import TwoFactorSettings from '../TwoFactorAuth/TwoFactorSettings';
import ColorPreferences from '../Profile/ColorPreferences';
import NotificationSettings from './NotificationSettings';
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
  const [isAnimating, setIsAnimating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Section configuration with icons and descriptions
  const sections = [
    {
      id: 'profile',
      title: 'Profile',
      icon: '👤',
      description: 'Manage your profile information and avatar',
      badge: null
    },
    {
      id: 'preferences',
      title: 'Preferences',
      icon: '🎨',
      description: 'Customize your experience and appearance',
      badge: 'NEW'
    },
    {
      id: 'notifications',
      title: 'Notifications',
      icon: '🔔',
      description: 'Control how you receive notifications',
      badge: null
    },
    {
      id: 'privacy',
      title: 'Privacy & Security',
      icon: '🔒',
      description: 'Security settings and two-factor authentication',
      badge: null
    },
    {
      id: 'analytics',
      title: 'Analytics',
      icon: '📊',
      description: 'View your usage statistics and insights',
      badge: null
    }
  ];

  // Filter sections based on search
  const filteredSections = sections.filter(section =>
    section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    section.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Update active section when initialSection prop changes
  useEffect(() => {
    setActiveSection(initialSection);
  }, [initialSection]);

  // Handle section change with animation
  const handleSectionChange = useCallback((sectionId) => {
    if (sectionId === activeSection) return;
    
    setIsAnimating(true);
    setTimeout(() => {
      setActiveSection(sectionId);
      setIsAnimating(false);
    }, 150);
  }, [activeSection]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        if (hasUnsavedChanges) {
          const confirmClose = window.confirm('You have unsaved changes. Are you sure you want to close?');
          if (!confirmClose) return;
        }
        setHasUnsavedChanges(false);
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, hasUnsavedChanges, onClose]);

  // Handle close with unsaved changes warning
  const handleClose = useCallback(() => {
    if (hasUnsavedChanges) {
      const confirmClose = window.confirm('You have unsaved changes. Are you sure you want to close?');
      if (!confirmClose) return;
    }
    setHasUnsavedChanges(false);
    onClose();
  }, [hasUnsavedChanges, onClose]);

  // Quick actions
  const quickActions = [
    {
      title: 'Export Data',
      icon: '💾',
      action: () => console.log('Export data'),
      description: 'Download your account data'
    },
    {
      title: 'Reset Settings',
      icon: '🔄',
      action: () => console.log('Reset settings'),
      description: 'Reset all settings to default'
    },
    {
      title: 'Contact Support',
      icon: '💬',
      action: () => console.log('Contact support'),
      description: 'Get help with your account'
    }
  ];

  if (!isOpen) return null;
  
  // Prevent click events from bubbling up to the overlay
  const handleContentClick = (e) => {
    e.stopPropagation();
  };

  // Get current section info
  const currentSection = sections.find(s => s.id === activeSection) || sections[0];
  
  // Render the active section content
  const renderSectionContent = () => {
    const content = (() => {
      switch (activeSection) {
        case 'profile':
          return (
            <div className="enhanced-profile-container">
              <div className="section-header">
                <h2>
                  <span className="section-icon">{currentSection.icon}</span>
                  {currentSection.title}
                </h2>
                <p>{currentSection.description}</p>
              </div>
              <EnhancedProfile 
                user={user}
                onUpdate={onSaveProfile}
                onClose={onClose}
                darkMode={darkMode}
                onUnsavedChanges={setHasUnsavedChanges}
              />
            </div>
          );
        case 'analytics':
          return (
            <div className="settings-section">
              <div className="section-header">
                <h2>
                  <span className="section-icon">{currentSection.icon}</span>
                  {currentSection.title}
                </h2>
                <p>{currentSection.description}</p>
              </div>
              <UserAnalytics userId={user?.id} darkMode={darkMode} />
            </div>
          );
        case 'preferences':
          return (
            <div className="settings-section">
              <div className="section-header">
                <h2>
                  <span className="section-icon">{currentSection.icon}</span>
                  {currentSection.title}
                </h2>
                <p>{currentSection.description}</p>
                {currentSection.badge && (
                  <span className="section-badge">{currentSection.badge}</span>
                )}
              </div>
              <ColorPreferences 
                user={user}
                onSave={onSaveProfile}
                darkMode={darkMode}
                onUnsavedChanges={setHasUnsavedChanges}
              />
            </div>
          );
        case 'notifications':
          return (
            <div className="settings-section">
              <div className="section-header">
                <h2>
                  <span className="section-icon">{currentSection.icon}</span>
                  {currentSection.title}
                </h2>
                <p>{currentSection.description}</p>
              </div>
              <NotificationSettings 
                user={user}
                darkMode={darkMode}
                onUnsavedChanges={setHasUnsavedChanges}
              />
            </div>
          );
        case 'privacy':
          return (
            <div className="settings-section">
              <div className="section-header">
                <h2>
                  <span className="section-icon">{currentSection.icon}</span>
                  {currentSection.title}
                </h2>
                <p>{currentSection.description}</p>
              </div>
              <TwoFactorSettings onUnsavedChanges={setHasUnsavedChanges} />
            </div>
          );
        default:
          return (
            <div className="settings-section">
              <div className="section-header">
                <h2>
                  <span className="section-icon">⚙️</span>
                  Settings
                </h2>
                <p>Select a section from the navigation above.</p>
              </div>
            </div>
          );
      }
    })();

    return (
      <div className={`section-content ${isAnimating ? 'animating' : ''}`}>
        {content}
      </div>
    );
  };
  
  return (
    <div className="settings-modal-overlay" onClick={handleClose}>
      <div className={`settings-modal ${darkMode ? 'dark' : ''}`} onClick={handleContentClick}>
        {/* Enhanced Header */}
        <div className="settings-modal-header">
          <div className="header-content">
            <div className="header-main">
              <h2 className="settings-modal-title">
                <span className="title-icon">⚙️</span>
                Settings
              </h2>
              <p className="settings-subtitle">Customize your Quibish experience</p>
            </div>
            <div className="header-actions">
              {hasUnsavedChanges && (
                <div className="unsaved-indicator" title="You have unsaved changes">
                  <div className="indicator-dot"></div>
                  <span>Unsaved</span>
                </div>
              )}
              <button className="settings-modal-close" onClick={handleClose} aria-label="Close settings">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          </div>
          
          {/* Search Bar */}
          <div className="settings-search">
            <div className="search-input-container">
              <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
              <input
                type="text"
                placeholder="Search settings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              {searchQuery && (
                <button 
                  className="search-clear"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        </div>
        
        {/* Main Content Area */}
        <div className="settings-modal-content">
          {/* Navigation Sidebar */}
          <div className="settings-navigation">
            <div className="navigation-section">
              <h3 className="section-title">User Settings</h3>
              <ul className="navigation-items">
                {filteredSections.slice(0, 2).map((section) => (
                  <li key={section.id} className={`navigation-item ${activeSection === section.id ? 'active' : ''}`}>
                    <button onClick={() => handleSectionChange(section.id)}>
                      <span className="nav-icon">{section.icon}</span>
                      <div className="nav-content">
                        <div className="nav-title">{section.title}</div>
                        <p className="nav-description">{section.description}</p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="navigation-section">
              <h3 className="section-title">Privacy & Security</h3>
              <ul className="navigation-items">
                {filteredSections.slice(2).map((section) => (
                  <li key={section.id} className={`navigation-item ${activeSection === section.id ? 'active' : ''}`}>
                    <button onClick={() => handleSectionChange(section.id)}>
                      <span className="nav-icon">{section.icon}</span>
                      <div className="nav-content">
                        <div className="nav-title">{section.title}</div>
                        <p className="nav-description">{section.description}</p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            
            {/* Quick Actions */}
            <div className="quick-actions">
              <h4>Quick Actions</h4>
              <div className="quick-action-buttons">
                {quickActions.map((action, index) => (
                  <button
                    key={index}
                    className="quick-action-button"
                    onClick={action.action}
                    title={action.description}
                  >
                    <span>{action.icon}</span>
                    {action.title}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          {/* Content Area */}
          <div className="settings-content">
            <div className="content-section">
              {renderSectionContent()}
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="settings-modal-footer">
          <div className="footer-info">
            <span className="app-version">Quibish v2.0.0</span>
            <span>Logged in as {user?.name || 'User'}</span>
          </div>
          <div className="footer-actions">
            <button className="footer-button" onClick={() => setSearchQuery('')}>
              Reset Search
            </button>
            <button className="footer-button primary" onClick={handleClose}>
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
