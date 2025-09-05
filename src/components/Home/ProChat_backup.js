import React, { useState, useCallback, useMemo } from 'react';
import UserProfileModal from '../UserProfile';
import VideoCall from './VideoCall';
import PropTypes from 'prop-types';

// CSS imports
import './ProLayout.css';
import './ProMessages.css';
import './ProSidebar.css';
import './ProHeader.css';
import './ProChat.css';

const ProChat = ({ 
  user = { id: 'user1', name: 'Current User', avatar: null },
  conversations = [],
  currentConversation = null,
  onLogout = () => {},
  darkMode = false,
  onToggleDarkMode = () => {}
}) => {
  // Basic state
  const [isConnected] = useState(true);
  const [chatMessages, setChatMessages] = useState([
    {
      id: 1,
      text: "Welcome to the enhanced chat application!",
      user: { id: 'system', name: 'System', avatar: null },
      timestamp: new Date().toISOString(),
      reactions: []
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Enhanced features state
  const [profileModal, setProfileModal] = useState({ open: false, userId: null, username: null });

  // Message input handlers
  const handleSendMessage = useCallback(() => {
    if (!inputText.trim()) return;
    
    const newMessage = {
      id: Date.now(),
      text: inputText,
      user: user,
      timestamp: new Date().toISOString(),
      reactions: []
    };
    
    setChatMessages(prev => [...prev, newMessage]);
    setInputText('');
  }, [inputText, user]);

  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  // Sidebar handlers
  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => !prev);
  }, []);

  // Modal handlers
  const handleViewUserProfile = useCallback((userId, username) => {
    setProfileModal({ open: true, userId, username });
  }, []);

  const handleCloseProfileModal = useCallback(() => {
    setProfileModal({ open: false, userId: null, username: null });
  }, []);

  // Video call component
  const MemoizedVideoCall = useMemo(() => (
    <VideoCall />
  ), []);

  return (
    <div className="pro-layout">
      {/* Video Call Component */}
      {MemoizedVideoCall}
      
      {/* Sidebar */}
      <div className={`pro-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="pro-sidebar-header">
          <h2>Conversations</h2>
          <button onClick={toggleSidebar} className="toggle-btn">
            {sidebarCollapsed ? '→' : '←'}
          </button>
        </div>
        <div className="pro-sidebar-content">
          {conversations.map(conv => (
            <div key={conv.id} className="conversation-item">
              <span>{conv.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={`pro-main ${sidebarCollapsed ? 'collapsed' : ''}`}>
        {/* Header */}
        <div className="pro-header">
          <div className="conversation-info">
            <h3>{currentConversation?.name || 'Chat'}</h3>
            <span className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <div className="header-actions">
            <button onClick={onToggleDarkMode} className="theme-toggle">
              {darkMode ? '☀️' : '🌙'}
            </button>
            <button onClick={onLogout} className="logout-btn">
              Logout
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="pro-message-list">
          {chatMessages.map(message => (
            <div key={message.id} className="pro-message-blurb" data-message-id={message.id}>
              <div className="message-avatar">
                <img 
                  src={message.user.avatar || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=32&h=32&fit=crop&crop=face`}
                  alt={message.user.name}
                  onClick={() => handleViewUserProfile(message.user.id, message.user.name)}
                />
              </div>
              <div className="message-content">
                <div className="message-header">
                  <span className="user-name">{message.user.name}</span>
                  <span className="timestamp">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="message-text">{message.text}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Input Area */}
        <div className="pro-chat-input-container">
          <div className="input-wrapper">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="message-input"
              rows="1"
            />
            <button 
              onClick={handleSendMessage}
              disabled={!inputText.trim()}
              className="send-button"
            >
              Send
            </button>
          </div>
        </div>
      </div>

      {/* Profile Modal */}
      {profileModal.open && (
        <UserProfileModal 
          userId={profileModal.userId}
          username={profileModal.username}
          onClose={handleCloseProfileModal}
        />
      )}
    </div>
  );
};

// PropTypes
ProChat.propTypes = {
  user: PropTypes.object,
  conversations: PropTypes.array,
  currentConversation: PropTypes.object,
  onLogout: PropTypes.func,
  darkMode: PropTypes.bool,
  onToggleDarkMode: PropTypes.func
};

export default ProChat;
