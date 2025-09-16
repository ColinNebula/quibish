import React, { useState } from 'react';
import './HelpModal.css';

const HelpModal = ({ isOpen, onClose }) => {
  const [activeSection, setActiveSection] = useState('getting-started');
  const [searchTerm, setSearchTerm] = useState('');

  const helpSections = {
    'getting-started': {
      title: 'Getting Started',
      icon: '🚀',
      content: [
        {
          question: 'How do I start a new chat?',
          answer: 'Click the "New Chat" button in the sidebar or use the ➕ icon in the header. You can start direct messages or create group chats with multiple contacts.'
        },
        {
          question: 'How do I add contacts?',
          answer: 'Go to the Contacts section and click "Add Contact". You can manually add contacts or import them from your device if supported.'
        },
        {
          question: 'How do I send my first message?',
          answer: 'Select a conversation from the sidebar, type your message in the input field at the bottom, and press Enter or click the send button.'
        }
      ]
    },
    'messaging': {
      title: 'Messaging Features',
      icon: '💬',
      content: [
        {
          question: 'How do I send files and images?',
          answer: 'Click the attachment icon (📎) next to the message input. You can send images, documents, videos, and other file types.'
        },
        {
          question: 'How do I add reactions to messages?',
          answer: 'Hover over a message and click the reaction button, or long-press on mobile. Choose from available emoji reactions.'
        },
        {
          question: 'Can I edit or delete messages?',
          answer: 'Yes! Click the three dots menu on any message to edit, delete, or perform other actions on your messages.'
        },
        {
          question: 'How do I search for messages?',
          answer: 'Use the search icon in the header to search through your conversation history. You can search by text content or contact names.'
        }
      ]
    },
    'voice-video': {
      title: 'Voice & Video Calls',
      icon: '📞',
      content: [
        {
          question: 'How do I start a voice call?',
          answer: 'In any conversation, click the phone icon to start a voice call. Make sure you have microphone permissions enabled.'
        },
        {
          question: 'How do I start a video call?',
          answer: 'Click the video camera icon in the conversation header. Ensure your camera and microphone permissions are granted.'
        },
        {
          question: 'Can I mute myself during a call?',
          answer: 'Yes, use the mute button during any call to toggle your microphone on/off. Other participants will see a mute indicator.'
        },
        {
          question: 'What are global voice calls?',
          answer: 'Global voice calls allow you to connect with users worldwide. This feature requires special permissions and may have usage limits.'
        }
      ]
    },
    'settings': {
      title: 'Settings & Customization',
      icon: '⚙️',
      content: [
        {
          question: 'How do I change my profile picture?',
          answer: 'Go to your user profile settings and click on your current avatar. Upload a new image to change your profile picture across all conversations.'
        },
        {
          question: 'Can I enable dark mode?',
          answer: 'Yes! Look for the theme toggle in your settings or profile menu. Dark mode helps reduce eye strain in low-light environments.'
        },
        {
          question: 'How do I manage notifications?',
          answer: 'Access notification settings through the main settings menu. You can customize notification sounds, frequency, and which events trigger notifications.'
        },
        {
          question: 'Is my data encrypted?',
          answer: 'Yes, Quibish uses end-to-end encryption for your messages and calls to ensure your privacy and security.'
        }
      ]
    },
    'troubleshooting': {
      title: 'Troubleshooting',
      icon: '🔧',
      content: [
        {
          question: 'Messages are not sending',
          answer: 'Check your internet connection. If offline, messages will be saved and sent when you reconnect. Try refreshing the page if issues persist.'
        },
        {
          question: 'Voice/video calls not working',
          answer: 'Ensure microphone and camera permissions are granted. Check your browser settings and try using a different browser if problems continue.'
        },
        {
          question: 'App is running slowly',
          answer: 'Clear your browser cache, close other tabs, or restart your browser. Large conversation histories may impact performance.'
        },
        {
          question: 'I lost my conversation history',
          answer: 'Conversation history is stored locally and on our servers. Try logging out and back in, or contact support if data appears to be missing.'
        }
      ]
    },
    'privacy': {
      title: 'Privacy & Security',
      icon: '🔒',
      content: [
        {
          question: 'How is my data protected?',
          answer: 'We use industry-standard encryption, secure servers, and follow best practices for data protection. Your conversations are private and secure.'
        },
        {
          question: 'Who can see my profile information?',
          answer: 'Only your contacts can see your profile information. You control what information is shared and with whom.'
        },
        {
          question: 'Can I delete my account?',
          answer: 'Yes, you can delete your account and all associated data through the account settings. This action is permanent and cannot be undone.'
        },
        {
          question: 'How do I report inappropriate content?',
          answer: 'Use the report function on any message or contact. Our moderation team reviews all reports and takes appropriate action.'
        }
      ]
    }
  };

  // Filter content based on search term
  const getFilteredContent = () => {
    if (!searchTerm.trim()) {
      return helpSections[activeSection].content;
    }

    const allContent = Object.values(helpSections).flatMap(section => 
      section.content.map(item => ({ ...item, section: section.title }))
    );

    return allContent.filter(item => 
      item.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  // Handle overlay click
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const filteredContent = getFilteredContent();

  return (
    <div className="help-overlay" onClick={handleOverlayClick}>
      <div className="help-modal">
        <div className="help-header">
          <h3>Help & Support</h3>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="help-search">
          <input
            type="text"
            placeholder="Search help topics..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="help-search-input"
          />
        </div>

        <div className="help-content">
          {!searchTerm && (
            <div className="help-sidebar">
              <nav className="help-nav">
                {Object.entries(helpSections).map(([key, section]) => (
                  <button
                    key={key}
                    className={`nav-item ${activeSection === key ? 'active' : ''}`}
                    onClick={() => setActiveSection(key)}
                  >
                    <span className="nav-icon">{section.icon}</span>
                    <span className="nav-title">{section.title}</span>
                  </button>
                ))}
              </nav>
            </div>
          )}

          <div className={`help-main ${searchTerm ? 'search-mode' : ''}`}>
            {searchTerm ? (
              <div className="search-results">
                <h4>Search Results ({filteredContent.length})</h4>
                {filteredContent.length > 0 ? (
                  <div className="faq-list">
                    {filteredContent.map((item, index) => (
                      <div key={index} className="faq-item">
                        {item.section && (
                          <div className="faq-section">{item.section}</div>
                        )}
                        <h5 className="faq-question">{item.question}</h5>
                        <p className="faq-answer">{item.answer}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="no-results">
                    <p>No results found for "{searchTerm}"</p>
                    <span>Try different keywords or browse categories</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="section-content">
                <div className="section-header">
                  <span className="section-icon">
                    {helpSections[activeSection].icon}
                  </span>
                  <h4>{helpSections[activeSection].title}</h4>
                </div>
                
                <div className="faq-list">
                  {helpSections[activeSection].content.map((item, index) => (
                    <div key={index} className="faq-item">
                      <h5 className="faq-question">{item.question}</h5>
                      <p className="faq-answer">{item.answer}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="help-footer">
          <div className="footer-content">
            <p>Still need help?</p>
            <div className="footer-actions">
              <button className="contact-support-btn">
                📧 Contact Support
              </button>
              <button className="feedback-btn">
                📝 Send Feedback
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpModal;