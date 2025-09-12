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
  const [focusedItemIndex, setFocusedItemIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  // Section configuration with icons and descriptions
  const sections = [
    {
      id: 'profile',
      title: 'Profile',
      icon: '👤',
      description: 'Manage your profile information and avatar',
      keywords: ['profile', 'avatar', 'personal', 'info', 'photo', 'name', 'email'],
      badge: null
    },
    {
      id: 'preferences',
      title: 'Preferences',
      icon: '🎨',
      description: 'Customize your experience and appearance',
      keywords: ['preferences', 'appearance', 'theme', 'colors', 'customization', 'ui'],
      badge: 'NEW'
    },
    {
      id: 'notifications',
      title: 'Notifications',
      icon: '🔔',
      description: 'Control how you receive notifications',
      keywords: ['notifications', 'alerts', 'sounds', 'email', 'push', 'messages'],
      badge: null
    },
    {
      id: 'privacy',
      title: 'Privacy & Security',
      icon: '🔒',
      description: 'Security settings and two-factor authentication',
      keywords: ['privacy', 'security', '2fa', 'password', 'authentication', 'protection'],
      badge: null
    },
    {
      id: 'analytics',
      title: 'Analytics',
      icon: '📊',
      description: 'View your usage statistics and insights',
      keywords: ['analytics', 'statistics', 'usage', 'insights', 'data', 'metrics'],
      badge: null
    }
  ];

  // Filter sections based on search with enhanced keyword matching
  const filteredSections = sections.filter(section => {
    const query = searchQuery.toLowerCase();
    return (
      section.title.toLowerCase().includes(query) ||
      section.description.toLowerCase().includes(query) ||
      section.keywords.some(keyword => keyword.includes(query))
    );
  });

  // Enhanced search suggestions
  const getSearchSuggestions = () => {
    if (!searchQuery) return [];
    
    const allKeywords = sections.flatMap(section => 
      section.keywords.map(keyword => ({
        keyword,
        section: section.title,
        sectionId: section.id
      }))
    );
    
    return allKeywords
      .filter(item => item.keyword.includes(searchQuery.toLowerCase()))
      .slice(0, 5);
  };

  // Update active section when initialSection prop changes
  useEffect(() => {
    setActiveSection(initialSection);
  }, [initialSection]);

  // Handle section change with animation
  const handleSectionChange = useCallback((sectionId) => {
    if (sectionId === activeSection) return;
    
    setIsAnimating(true);
    setIsLoading(true);
    setLoadingMessage(`Loading ${sections.find(s => s.id === sectionId)?.title || 'section'}...`);
    
    setTimeout(() => {
      setActiveSection(sectionId);
      setIsAnimating(false);
      setIsLoading(false);
      setLoadingMessage('');
    }, 150);
  }, [activeSection, sections]);

  // Close on escape key and manage body scroll
  useEffect(() => {
    if (!isOpen) return;
    
    // Lock body scroll when modal is open
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    
    const handleKeyDown = (e) => {
      switch (e.key) {
        case 'Escape':
          if (hasUnsavedChanges) {
            const confirmClose = window.confirm('You have unsaved changes. Are you sure you want to close?');
            if (!confirmClose) return;
          }
          setHasUnsavedChanges(false);
          onClose();
          break;
          
        case 'ArrowDown':
          if (e.target.closest('.settings-navigation')) {
            e.preventDefault();
            setFocusedItemIndex(prev => 
              prev < filteredSections.length - 1 ? prev + 1 : 0
            );
          }
          break;
          
        case 'ArrowUp':
          if (e.target.closest('.settings-navigation')) {
            e.preventDefault();
            setFocusedItemIndex(prev => 
              prev > 0 ? prev - 1 : filteredSections.length - 1
            );
          }
          break;
          
        case 'Enter':
          if (focusedItemIndex >= 0 && filteredSections[focusedItemIndex]) {
            e.preventDefault();
            handleSectionChange(filteredSections[focusedItemIndex].id);
            setFocusedItemIndex(-1);
          }
          break;
          
        case '/':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            document.querySelector('.search-input')?.focus();
          }
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      // Restore body scroll when modal closes
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, hasUnsavedChanges, onClose, focusedItemIndex, filteredSections, handleSectionChange]);

  // Handle close with unsaved changes warning
  const handleClose = useCallback((e) => {
    // Only close if clicking the overlay, not its children
    if (e && e.target !== e.currentTarget) return;
    
    if (hasUnsavedChanges) {
      const confirmClose = window.confirm('You have unsaved changes. Are you sure you want to close?');
      if (!confirmClose) return;
    }
    setHasUnsavedChanges(false);
    onClose();
  }, [hasUnsavedChanges, onClose]);

  // Force close (for close button)
  const handleForceClose = useCallback(() => {
    if (hasUnsavedChanges) {
      const confirmClose = window.confirm('You have unsaved changes. Are you sure you want to close?');
      if (!confirmClose) return;
    }
    setHasUnsavedChanges(false);
    onClose();
  }, [hasUnsavedChanges, onClose]);

  // Enhanced quick actions with more functionality
  const quickActions = [
    {
      title: 'Export Data',
      icon: '💾',
      action: () => {
        setIsLoading(true);
        setLoadingMessage('Preparing data export...');
        setTimeout(() => {
          // Simulate data export
          const data = { user, settings: 'mock data' };
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `quibish-data-${new Date().toISOString().split('T')[0]}.json`;
          a.click();
          URL.revokeObjectURL(url);
          setIsLoading(false);
          setLoadingMessage('');
        }, 1500);
      },
      description: 'Download your account data'
    },
    {
      title: 'Reset Settings',
      icon: '🔄',
      action: () => {
        if (window.confirm('Are you sure you want to reset all settings to default? This cannot be undone.')) {
          setIsLoading(true);
          setLoadingMessage('Resetting settings...');
          setTimeout(() => {
            localStorage.removeItem('quibish-settings');
            setIsLoading(false);
            setLoadingMessage('');
            window.location.reload();
          }, 1000);
        }
      },
      description: 'Reset all settings to default'
    },
    {
      title: 'Import Settings',
      icon: '📥',
      action: () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
          const file = e.target.files[0];
          if (file) {
            setIsLoading(true);
            setLoadingMessage('Importing settings...');
            const reader = new FileReader();
            reader.onload = (e) => {
              try {
                const settings = JSON.parse(e.target.result);
                localStorage.setItem('quibish-settings', JSON.stringify(settings));
                setTimeout(() => {
                  setIsLoading(false);
                  setLoadingMessage('');
                  alert('Settings imported successfully!');
                }, 1000);
              } catch (error) {
                setIsLoading(false);
                setLoadingMessage('');
                alert('Invalid settings file format.');
              }
            };
            reader.readAsText(file);
          }
        };
        input.click();
      },
      description: 'Import settings from file'
    },
    {
      title: 'Contact Support',
      icon: '💬',
      action: () => {
        window.open('mailto:support@quibish.com?subject=Settings Support Request', '_blank');
      },
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
        {/* Loading Overlay */}
        {isLoading && (
          <div className="loading-overlay">
            <div className="loading-spinner"></div>
            <div className="loading-message">{loadingMessage}</div>
          </div>
        )}
        
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
              <button className="settings-modal-close" onClick={handleForceClose} aria-label="Close settings">
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
                placeholder="Search settings... (Ctrl+/ to focus)"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setFocusedItemIndex(-1);
                }}
                className="search-input"
                autoComplete="off"
              />
              {searchQuery && (
                <button 
                  className="search-clear"
                  onClick={() => {
                    setSearchQuery('');
                    setFocusedItemIndex(-1);
                  }}
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </div>
            
            {/* Search Suggestions */}
            {searchQuery && getSearchSuggestions().length > 0 && (
              <div className="search-suggestions">
                <div className="suggestions-title">Suggestions:</div>
                <div className="suggestions-list">
                  {getSearchSuggestions().map((suggestion, index) => (
                    <button
                      key={`${suggestion.sectionId}-${suggestion.keyword}`}
                      className="suggestion-item"
                      onClick={() => {
                        handleSectionChange(suggestion.sectionId);
                        setSearchQuery('');
                        setFocusedItemIndex(-1);
                      }}
                    >
                      <span className="suggestion-keyword">{suggestion.keyword}</span>
                      <span className="suggestion-section">in {suggestion.section}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Main Content Area */}
        <div className="settings-modal-content">
          {/* Navigation Sidebar */}
          <div className="settings-navigation">
            {/* Search Results Info */}
            {searchQuery && (
              <div className="search-results-info">
                <small>{filteredSections.length} results for "{searchQuery}"</small>
                {filteredSections.length === 0 && (
                  <p className="no-results">No settings found. Try a different search term.</p>
                )}
              </div>
            )}
            
            {filteredSections.length > 0 && (
              <>
                <div className="navigation-section">
                  <h3 className="section-title">User Settings</h3>
                  <ul className="navigation-items">
                    {filteredSections.filter(s => ['profile', 'preferences'].includes(s.id)).map((section, index) => (
                      <li key={section.id} className={`navigation-item ${activeSection === section.id ? 'active' : ''} ${focusedItemIndex === index ? 'focused' : ''}`}>
                        <button 
                          onClick={() => handleSectionChange(section.id)} 
                          aria-label={`Go to ${section.title} settings`}
                          onFocus={() => setFocusedItemIndex(index)}
                          onBlur={() => setFocusedItemIndex(-1)}
                        >
                          <span className="nav-icon" role="img" aria-label={section.title}>{section.icon}</span>
                          <div className="nav-content">
                            <div className="nav-title">{section.title}</div>
                            <p className="nav-description">{section.description}</p>
                          </div>
                          {section.badge && (
                            <span className="nav-badge">{section.badge}</span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="navigation-section">
                  <h3 className="section-title">System & Security</h3>
                  <ul className="navigation-items">
                    {filteredSections.filter(s => ['notifications', 'privacy', 'analytics'].includes(s.id)).map((section, index) => {
                      const adjustedIndex = index + filteredSections.filter(s => ['profile', 'preferences'].includes(s.id)).length;
                      return (
                        <li key={section.id} className={`navigation-item ${activeSection === section.id ? 'active' : ''} ${focusedItemIndex === adjustedIndex ? 'focused' : ''}`}>
                          <button 
                            onClick={() => handleSectionChange(section.id)} 
                            aria-label={`Go to ${section.title} settings`}
                            onFocus={() => setFocusedItemIndex(adjustedIndex)}
                            onBlur={() => setFocusedItemIndex(-1)}
                          >
                            <span className="nav-icon" role="img" aria-label={section.title}>{section.icon}</span>
                            <div className="nav-content">
                              <div className="nav-title">{section.title}</div>
                              <p className="nav-description">{section.description}</p>
                            </div>
                            {section.badge && (
                              <span className="nav-badge">{section.badge}</span>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </>
            )}
            
            {/* Enhanced Quick Actions */}
            <div className="quick-actions">
              <h4>Quick Actions</h4>
              <div className="quick-action-buttons">
                {quickActions.map((action, index) => (
                  <button
                    key={index}
                    className="quick-action-button"
                    onClick={action.action}
                    title={action.title}
                    aria-label={action.description}
                    data-tooltip={action.title}
                  >
                    <span className="action-icon" role="img">{action.icon}</span>
                  </button>
                ))}
              </div>
              
              {/* Current Section Breadcrumb */}
              <div className="current-section-info">
                <div className="breadcrumb">
                  <span className="breadcrumb-home">Settings</span>
                  <span className="breadcrumb-separator">›</span>
                  <span className="breadcrumb-current">{currentSection.title}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Content Area */}
          <div className="settings-content">
            <div className="content-wrapper">
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
