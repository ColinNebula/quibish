import React, { useState } from 'react';
import './WhatsNewModal.css';

/**
 * Modal component for displaying new features
 * 
 * @component WhatsNewModal
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Function} props.onClose - Function to close the modal
 * @param {boolean} props.darkMode - Whether dark mode is enabled
 * @param {string} props.version - Current app version
 * @returns {JSX.Element} Rendered modal
 */
const WhatsNewModal = ({ isOpen, onClose, darkMode = false, version = '1.0.0' }) => {
  const [activeTab, setActiveTab] = useState('features');
  
  if (!isOpen) return null;
  
  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };
  
  const handleClose = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };
  
  // Features for the current version
  const newFeatures = [
    {
      id: 'feature-1',
      title: 'Professional UI Enhancements',
      description: 'The entire application has been redesigned with a professional look and feel, including consistent styling, improved navigation, and a modern aesthetic.',
      icon: 'design'
    },
    {
      id: 'feature-2',
      title: 'Dark Mode Improvements',
      description: 'Dark mode now applies consistently across the entire application, with improved contrast and readability.',
      icon: 'theme'
    },
    {
      id: 'feature-3',
      title: 'Notification Center',
      description: 'Stay informed with the new notification center that displays system announcements, updates, and important information.',
      icon: 'notification'
    },
    {
      id: 'feature-4',
      title: 'Enhanced User Profiles',
      description: 'User profiles now support more customization options, including status messages, profile pictures, and personal information.',
      icon: 'profile'
    },
    {
      id: 'feature-5',
      title: 'Activity Tracking',
      description: 'Track user activity across the application, including logins, messages sent, and profile updates.',
      icon: 'activity'
    },
  ];
  
  // Planned features for future releases
  const upcomingFeatures = [
    {
      id: 'upcoming-1',
      title: 'Message Search',
      description: 'Quickly find messages across all conversations with advanced search capabilities.',
      version: '1.4.0'
    },
    {
      id: 'upcoming-2',
      title: 'Video Calling',
      description: 'Seamless video calling directly within the application.',
      version: '1.5.0'
    },
    {
      id: 'upcoming-3',
      title: 'Screen Sharing',
      description: 'Share your screen during calls and conversations.',
      version: '1.5.0'
    },
    {
      id: 'upcoming-4',
      title: 'Mobile Applications',
      description: 'Native mobile apps for iOS and Android.',
      version: '2.0.0'
    }
  ];
  
  return (
    <div className={`whats-new-backdrop ${darkMode ? 'dark' : ''}`} onClick={handleClose}>
      <div className="whats-new-modal" onClick={e => e.stopPropagation()}>
        <div className="whats-new-header">
          <h2>What's New in QuibiChat {version}</h2>
          <button className="close-button" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z" fill="currentColor"/>
            </svg>
          </button>
        </div>
        
        <div className="whats-new-tabs">
          <button 
            className={`tab-button ${activeTab === 'features' ? 'active' : ''}`}
            onClick={() => handleTabChange('features')}
          >
            New Features
          </button>
          <button 
            className={`tab-button ${activeTab === 'upcoming' ? 'active' : ''}`}
            onClick={() => handleTabChange('upcoming')}
          >
            Coming Soon
          </button>
        </div>
        
        <div className="whats-new-content">
          {activeTab === 'features' ? (
            <div className="features-list">
              {newFeatures.map(feature => (
                <div key={feature.id} className="feature-item">
                  <div className={`feature-icon ${feature.icon}`}>
                    {feature.icon === 'design' && (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" fill="currentColor"/>
                      </svg>
                    )}
                    {feature.icon === 'theme' && (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M20 8.69V4h-4.69L12 .69 8.69 4H4v4.69L.69 12 4 15.31V20h4.69L12 23.31 15.31 20H20v-4.69L23.31 12 20 8.69zM12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6zm0-10c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4z" fill="currentColor"/>
                      </svg>
                    )}
                    {feature.icon === 'notification' && (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z" fill="currentColor"/>
                      </svg>
                    )}
                    {feature.icon === 'profile' && (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="currentColor"/>
                      </svg>
                    )}
                    {feature.icon === 'activity' && (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M13.5 8H12v5l4.28 2.54.72-1.21-3.5-2.08V8zM13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9z" fill="currentColor"/>
                      </svg>
                    )}
                  </div>
                  <div className="feature-content">
                    <h3 className="feature-title">{feature.title}</h3>
                    <p className="feature-description">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="upcoming-list">
              <div className="upcoming-intro">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" className="upcoming-icon">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm4.17-5.24l-1.1-1.1c.71-1.33.53-3.01-.59-4.13C13.79 8.84 12.9 8.5 12 8.5c-.03 0-.06.01-.09.01L13 9.6l-1.06 1.06-2.83-2.83L11.94 5 13 6.06l-.96.96c1.27.01 2.53.48 3.5 1.44 1.7 1.71 1.91 4.36.63 6.3zm-1.28 1.41L12.06 19 11 17.94l.95-.95c-1.26-.01-2.52-.5-3.48-1.46-1.71-1.71-1.92-4.35-.64-6.29l1.1 1.1c-.71 1.33-.53 3.01.59 4.13.7.7 1.63 1.04 2.56 1.01L11 14.4l1.06-1.06 2.83 2.83z" fill="currentColor"/>
                </svg>
                <p>Here's what we're working on for future releases.</p>
              </div>
              
              {upcomingFeatures.map(feature => (
                <div key={feature.id} className="upcoming-item">
                  <div className="version-badge">v{feature.version}</div>
                  <div className="upcoming-content">
                    <h3>{feature.title}</h3>
                    <p>{feature.description}</p>
                  </div>
                </div>
              ))}
              
              <div className="feedback-cta">
                <h3>Have suggestions?</h3>
                <p>We'd love to hear your ideas for improving QuibiChat.</p>
                <button className="suggest-button">Send Feedback</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WhatsNewModal;
