import React, { useState, useEffect, useMemo } from 'react';
import './HelpModal.css';

// Move helpSections outside component to prevent recreation on every render
const helpSections = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: '🚀',
    content: [
      {
        question: 'How do I start using Quibish?',
        answer: 'Welcome to Quibish! To get started, simply log in with your credentials. If you\'re new, you can create an account by clicking the Sign Up button.',
        tags: ['login', 'account', 'demo']
      },
      {
        question: 'How do I create a new conversation?',
        answer: 'Click the "New Chat" button in the sidebar, then select a user from the list or create a group conversation. You can also click on any user in the contacts list to start chatting.',
        tags: ['chat', 'conversation', 'new']
      },
      {
        question: 'How do I navigate the interface?',
        answer: 'The main interface consists of three parts: the sidebar (conversations list), the chat area (messages), and the user panel. You can collapse the sidebar by clicking the menu button.',
        tags: ['interface', 'navigation', 'sidebar']
      }
    ]
  },
  {
    id: 'messaging',
    title: 'Messaging',
    icon: '💬',
    content: [
      {
        question: 'How do I send a message?',
        answer: 'Type your message in the input field at the bottom and press Enter or click the send button. You can also use Shift+Enter for line breaks.',
        tags: ['send', 'message', 'text']
      },
      {
        question: 'Can I send emojis and GIFs?',
        answer: 'Yes! Click the emoji button (😊) to open the emoji picker, or click the GIF button to search and send GIFs. You can also type emojis directly using your keyboard.',
        tags: ['emoji', 'gif', 'media']
      },
      {
        question: 'How do I share files and images?',
        answer: 'Click the attachment button (📎) to upload files, or the image button (📷) for photos. You can drag and drop files directly into the chat area. Supported formats include images, videos, and documents.',
        tags: ['files', 'images', 'upload', 'attachment']
      },
      {
        question: 'Can I edit or delete messages?',
        answer: 'Hover over your message and click the three dots menu to edit or delete. You can edit messages within a certain time frame after sending.',
        tags: ['edit', 'delete', 'message']
      },
      {
        question: 'How do message reactions work?',
        answer: 'Hover over any message and click the emoji reaction button, or double-click a message to quickly add a heart reaction. You can see who reacted by hovering over the reaction.',
        tags: ['reactions', 'emoji', 'like']
      }
    ]
  },
  {
    id: 'profile',
    title: 'Profile & Settings',
    icon: '👤',
    content: [
      {
        question: 'How do I update my profile?',
        answer: 'Click on your profile picture or name in the sidebar, then select "Edit Profile". You can update your name, bio, avatar, and other personal information.',
        tags: ['profile', 'edit', 'avatar', 'settings']
      },
      {
        question: 'How do I change my avatar?',
        answer: 'In the profile edit modal, click on your current avatar or the camera icon to upload a new profile picture. Supported formats are JPG, PNG, and GIF up to 5MB.',
        tags: ['avatar', 'profile', 'picture', 'upload']
      },
      {
        question: 'How do I enable dark mode?',
        answer: 'Click the settings gear icon in the sidebar and toggle the "Dark Mode" option. The interface will switch between light and dark themes.',
        tags: ['dark mode', 'theme', 'settings']
      },
      {
        question: 'What are the privacy settings?',
        answer: 'In Settings, you can control who can message you, see your online status, and view your profile information. You can also manage blocked users and notification preferences.',
        tags: ['privacy', 'settings', 'blocked', 'notifications']
      }
    ]
  },
  {
    id: 'features',
    title: 'Advanced Features',
    icon: '⭐',
    content: [
      {
        question: 'How does video calling work?',
        answer: 'Click the video call button in a conversation to start a video call. Make sure you have camera and microphone permissions enabled in your browser.',
        tags: ['video', 'call', 'camera', 'microphone']
      },
      {
        question: 'Can I search through my messages?',
        answer: 'Yes! Use the search bar in the sidebar to find conversations, or use the in-chat search to find specific messages within a conversation.',
        tags: ['search', 'find', 'messages']
      },
      {
        question: 'What are smart previews?',
        answer: 'When you share links, Quibish automatically generates previews showing the page title, description, and thumbnail image for a richer sharing experience.',
        tags: ['links', 'preview', 'smart', 'sharing']
      },
      {
        question: 'How do I use keyboard shortcuts?',
        answer: 'Press Ctrl+K (Cmd+K on Mac) to quickly search conversations, Escape to close modals, and Enter to send messages. Many more shortcuts are available throughout the interface.',
        tags: ['shortcuts', 'keyboard', 'hotkeys']
      }
    ]
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    icon: '🔧',
    content: [
      {
        question: 'Messages are not sending',
        answer: 'Check your internet connection first. If the problem persists, try refreshing the page. Make sure your browser supports modern web standards and has JavaScript enabled.',
        tags: ['sending', 'connection', 'error']
      },
      {
        question: 'I can\'t see new messages',
        answer: 'Try refreshing the page or check your internet connection. If you\'re in a group chat, make sure you haven\'t been removed from the conversation.',
        tags: ['receiving', 'messages', 'refresh']
      },
      {
        question: 'Video calls are not working',
        answer: 'Ensure your browser has permission to access your camera and microphone. Try using a different browser or check if other participants can hear/see you.',
        tags: ['video', 'call', 'permissions', 'browser']
      },
      {
        question: 'The app is running slowly',
        answer: 'Clear your browser cache and cookies. Close other browser tabs and applications. If you have many conversations, try archiving old ones to improve performance.',
        tags: ['slow', 'performance', 'cache']
      },
      {
        question: 'I forgot my password',
        answer: 'Use the "Forgot Password" link on the login page to reset your password. You\'ll receive an email with instructions to create a new password.',
        tags: ['password', 'reset', 'forgot', 'login']
      }
    ]
  },
  {
    id: 'shortcuts',
    title: 'Keyboard Shortcuts',
    icon: '⌨️',
    content: [
      {
        question: 'Navigation Shortcuts',
        answer: 'Ctrl/Cmd + K: Quick search conversations\nEscape: Close modals and dialogs\nCtrl/Cmd + N: New conversation\nCtrl/Cmd + ,: Open settings',
        tags: ['navigation', 'keyboard', 'shortcuts']
      },
      {
        question: 'Messaging Shortcuts',
        answer: 'Enter: Send message\nShift + Enter: New line\nCtrl/Cmd + E: Insert emoji\nCtrl/Cmd + U: Upload file\nUp Arrow: Edit last message',
        tags: ['messaging', 'keyboard', 'shortcuts']
      },
      {
        question: 'General Shortcuts',
        answer: 'Ctrl/Cmd + F: Search in current conversation\nCtrl/Cmd + R: Refresh\nF11: Toggle fullscreen\nCtrl/Cmd + +/-: Zoom in/out',
        tags: ['general', 'keyboard', 'shortcuts']
      }
    ]
  }
];

const HelpModal = ({ isOpen, onClose }) => {
  const [activeSection, setActiveSection] = useState('getting-started');
  const [searchQuery, setSearchQuery] = useState('');

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Use useMemo for search functionality to prevent infinite re-renders
  const filteredContent = useMemo(() => {
    if (searchQuery.trim() === '') {
      return [];
    }

    const query = searchQuery.toLowerCase();
    const results = [];

    helpSections.forEach(section => {
      section.content.forEach(item => {
        const matchesQuestion = item.question.toLowerCase().includes(query);
        const matchesAnswer = item.answer.toLowerCase().includes(query);
        const matchesTags = item.tags.some(tag => tag.toLowerCase().includes(query));

        if (matchesQuestion || matchesAnswer || matchesTags) {
          results.push({
            ...item,
            section: section.title,
            sectionId: section.id,
            sectionIcon: section.icon
          });
        }
      });
    });

    return results;
  }, [searchQuery]);

  const handleSectionClick = (sectionId) => {
    setActiveSection(sectionId);
    setSearchQuery('');
  };

  const handleSearchResultClick = (sectionId) => {
    setActiveSection(sectionId);
    setSearchQuery('');
  };

  const highlightText = (text, query) => {
    if (!query) return text;
    
    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? 
        <mark key={index} className="search-highlight">{part}</mark> : 
        part
    );
  };

  if (!isOpen) return null;

  return (
    <div className="help-modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="help-modal">
        <div className="help-modal-header">
          <h2>Help & Support</h2>
          <button className="help-close-btn" onClick={onClose}>×</button>
        </div>

        <div className="help-modal-content">
          {/* Search Bar */}
          <div className="help-search-section">
            <div className="help-search-bar">
              <span className="help-search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search for help topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="help-search-input"
              />
              {searchQuery && (
                <button 
                  className="help-search-clear"
                  onClick={() => setSearchQuery('')}
                >
                  ×
                </button>
              )}
            </div>

            {/* Search Results */}
            {searchQuery && (
              <div className="help-search-results">
                <h4>Search Results ({filteredContent.length})</h4>
                {filteredContent.length > 0 ? (
                  <div className="help-search-items">
                    {filteredContent.map((item, index) => (
                      <div 
                        key={index} 
                        className="help-search-item"
                        onClick={() => handleSearchResultClick(item.sectionId)}
                      >
                        <div className="help-search-item-header">
                          <span className="help-search-section-badge">
                            {item.sectionIcon} {item.section}
                          </span>
                        </div>
                        <h5>{highlightText(item.question, searchQuery)}</h5>
                        <p>{highlightText(item.answer.substring(0, 150), searchQuery)}...</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="help-no-results">
                    <p>No results found for "{searchQuery}"</p>
                    <p>Try different keywords or browse the sections below.</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="help-main-content">
            {/* Sidebar Navigation */}
            <div className="help-sidebar">
              <div className="help-sections">
                {helpSections.map(section => (
                  <button
                    key={section.id}
                    className={`help-section-btn ${activeSection === section.id ? 'active' : ''}`}
                    onClick={() => handleSectionClick(section.id)}
                  >
                    <span className="help-section-icon">{section.icon}</span>
                    <span className="help-section-title">{section.title}</span>
                  </button>
                ))}
              </div>

              <div className="help-quick-actions">
                <h4>Quick Actions</h4>
                <button className="help-action-btn" onClick={() => window.open('mailto:support@quibish.com')}>
                  📧 Contact Support
                </button>
                <button className="help-action-btn" onClick={() => setActiveSection('troubleshooting')}>
                  🔧 Troubleshooting
                </button>
                <button className="help-action-btn" onClick={() => setActiveSection('shortcuts')}>
                  ⌨️ Keyboard Shortcuts
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="help-content-area">
              {!searchQuery && (
                <>
                  {(() => {
                    const currentSection = helpSections.find(s => s.id === activeSection);
                    return (
                      <div className="help-section-content">
                        <div className="help-section-header">
                          <h3>
                            <span className="help-section-icon-large">{currentSection.icon}</span>
                            {currentSection.title}
                          </h3>
                        </div>

                        <div className="help-items">
                          {currentSection.content.map((item, index) => (
                            <div key={index} className="help-item">
                              <h4 className="help-question">{item.question}</h4>
                              <div className="help-answer">
                                {item.answer.split('\n').map((line, lineIndex) => (
                                  <p key={lineIndex}>{line}</p>
                                ))}
                              </div>
                              {item.tags && (
                                <div className="help-tags">
                                  {item.tags.map(tag => (
                                    <span key={tag} className="help-tag">#{tag}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="help-modal-footer">
          <div className="help-footer-content">
            <div className="help-footer-section">
              <h4>Still need help?</h4>
              <p>Contact our support team at <a href="mailto:support@quibish.com">support@quibish.com</a></p>
            </div>
            <div className="help-footer-section">
              <h4>Version Info</h4>
              <p>Quibish v1.0.0 • Last updated: September 2025</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpModal;