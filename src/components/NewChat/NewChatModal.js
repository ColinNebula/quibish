import React, { useState, useCallback, useEffect, useRef } from 'react';
import './NewChatModal.css';

// Mock data for demonstration
const mockUsers = [
  { id: 'user2', name: 'Alice Johnson', email: 'alice@example.com', avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=40&h=40&fit=crop&crop=face', status: 'online' },
  { id: 'user3', name: 'Bob Smith', email: 'bob@example.com', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face', status: 'away' },
  { id: 'user4', name: 'Carol White', email: 'carol@example.com', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=40&h=40&fit=crop&crop=face', status: 'offline' },
  { id: 'user5', name: 'David Brown', email: 'david@example.com', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face', status: 'online' },
  { id: 'user6', name: 'Eva Green', email: 'eva@example.com', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=40&h=40&fit=crop&crop=face', status: 'busy' },
];

const NewChatModal = ({ 
  isOpen, 
  onClose, 
  onCreateChat, 
  currentUser,
  darkMode = false 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [recentContacts, setRecentContacts] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [isGroupChat, setIsGroupChat] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const searchInputRef = useRef(null);

  // Close modal and reset state
  const handleClose = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedUsers([]);
    setIsGroupChat(false);
    setGroupName('');
    setError(null);
    setLoading(false);
    onClose();
  }, [onClose]);

  // Load recent contacts
  const loadRecentContacts = useCallback(async () => {
    try {
      setLoading(true);
      // Import services dynamically to avoid circular dependencies
      const { userService } = await import('../../services/apiClient');
      const result = await userService.getAllUsers(5); // Get first 5 users as "recent"
      
      if (result.success) {
        // Filter out current user
        const filteredUsers = result.users.filter(user => user.id !== currentUser?.id);
        setRecentContacts(filteredUsers.slice(0, 3));
      } else {
        // Fallback to mock data if API fails
        const filteredMockUsers = mockUsers.filter(user => user.id !== currentUser?.id);
        setRecentContacts(filteredMockUsers.slice(0, 3));
      }
    } catch (error) {
      console.error('Error loading recent contacts:', error);
      // Fallback to mock data
      const filteredMockUsers = mockUsers.filter(user => user.id !== currentUser?.id);
      setRecentContacts(filteredMockUsers.slice(0, 3));
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  // Focus search input when modal opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current.focus();
      }, 100);
    }
  }, [isOpen]);

  // Load recent contacts on mount
  useEffect(() => {
    if (isOpen) {
      loadRecentContacts();
    }
  }, [isOpen, loadRecentContacts]);

  // Search users
  const handleSearch = useCallback(async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Import services dynamically to avoid circular dependencies
      const { userService } = await import('../../services/apiClient');
      const result = await userService.searchUsers(query);
      
      if (result.success) {
        setSearchResults(result.users);
      } else {
        setError(result.error || 'Search failed');
        setSearchResults([]);
      }
    } catch (err) {
      setError('Failed to search users');
      console.error('Search error:', err);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle search input change
  const handleSearchChange = useCallback((e) => {
    const query = e.target.value;
    setSearchQuery(query);
    handleSearch(query);
  }, [handleSearch]);

  // Toggle user selection
  const toggleUserSelection = useCallback((user) => {
    setSelectedUsers(prev => {
      const isSelected = prev.find(u => u.id === user.id);
      if (isSelected) {
        return prev.filter(u => u.id !== user.id);
      } else {
        return [...prev, user];
      }
    });
  }, []);

  // Remove selected user
  const removeSelectedUser = useCallback((userId) => {
    setSelectedUsers(prev => prev.filter(u => u.id !== userId));
  }, []);

  // Create chat
  const handleCreateChat = useCallback(async () => {
    if (selectedUsers.length === 0) {
      setError('Please select at least one user');
      return;
    }

    if (isGroupChat && !groupName.trim()) {
      setError('Please enter a group name');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Check if user is authenticated
      const { authService } = await import('../../services/apiClient');
      const token = authService.getToken();
      
      if (!token) {
        setError('You need to be logged in to create conversations. Please refresh the page and log in again.');
        setLoading(false);
        return;
      }

      // Import services dynamically to avoid circular dependencies
      const { conversationService } = await import('../../services/apiClient');
      const participants = [currentUser, ...selectedUsers];
      const result = await conversationService.createConversation(
        participants,
        isGroupChat ? 'group' : 'direct',
        isGroupChat ? groupName : null
      );

      if (result.success) {
        // Call parent handler with the created conversation
        if (onCreateChat) {
          await onCreateChat(result.conversation);
        }

        // Reset form and close modal
        handleClose();
      } else {
        setError(result.error || 'Failed to create chat');
      }
    } catch (err) {
      // Enhanced error handling for authentication issues
      if (err.message && err.message.includes('Access token is required')) {
        setError('Authentication required. Please refresh the page and log in again.');
      } else if (err.message && err.message.includes('Invalid or expired token')) {
        setError('Your session has expired. Please refresh the page and log in again.');
      } else {
        setError(err.message || 'Failed to create chat');
      }
      console.error('Create chat error:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedUsers, isGroupChat, groupName, currentUser, onCreateChat, handleClose]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  const displayUsers = searchQuery ? searchResults : recentContacts;

  return (
    <div className={`new-chat-modal-overlay ${darkMode ? 'dark' : ''}`} onClick={handleClose}>
      <div className="new-chat-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>New Chat</h2>
          <button className="close-button" onClick={handleClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="modal-content">
          {/* Chat Type Toggle */}
          <div className="chat-type-toggle">
            <button 
              className={`toggle-btn ${!isGroupChat ? 'active' : ''}`}
              onClick={() => setIsGroupChat(false)}
            >
              Direct Chat
            </button>
            <button 
              className={`toggle-btn ${isGroupChat ? 'active' : ''}`}
              onClick={() => setIsGroupChat(true)}
            >
              Group Chat
            </button>
          </div>

          {/* Group Name Input */}
          {isGroupChat && (
            <div className="group-name-section">
              <label htmlFor="groupName">Group Name</label>
              <input
                id="groupName"
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Enter group name..."
                maxLength="50"
              />
            </div>
          )}

          {/* Selected Users */}
          {selectedUsers.length > 0 && (
            <div className="selected-users">
              <h3>Selected Users ({selectedUsers.length})</h3>
              <div className="selected-users-list">
                {selectedUsers.map(user => (
                  <div key={user.id} className="selected-user">
                    <img src={user.avatar} alt={user.name} className="user-avatar" />
                    <span className="user-name">{user.name}</span>
                    <button 
                      className="remove-user"
                      onClick={() => removeSelectedUser(user.id)}
                      title="Remove user"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search Section */}
          <div className="search-section">
            <div className="search-input-container">
              <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Search users by name or email..."
                className="search-input"
              />
              {loading && <div className="search-loading">🔄</div>}
            </div>
          </div>

          {/* Users List */}
          <div className="users-section">
            <h3>{searchQuery ? 'Search Results' : 'Recent Contacts'}</h3>
            {displayUsers.length > 0 ? (
              <div className="users-list">
                {displayUsers.map(user => {
                  const isSelected = selectedUsers.find(u => u.id === user.id);
                  return (
                    <div 
                      key={user.id} 
                      className={`user-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => toggleUserSelection(user)}
                    >
                      <img src={user.avatar} alt={user.name} className="user-avatar" />
                      <div className="user-info">
                        <div className="user-name">{user.name}</div>
                        <div className="user-email">{user.email}</div>
                      </div>
                      <div className={`user-status ${user.status}`}></div>
                      {isSelected && (
                        <div className="selection-indicator">✓</div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="no-users">
                {searchQuery ? 'No users found' : 'No recent contacts'}
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="error-message">
              {error}
              {(error.includes('Authentication required') || error.includes('session has expired') || error.includes('Access token is required')) && (
                <div className="auth-helper">
                  <p>Try logging in with demo credentials:</p>
                  <button 
                    className="demo-login-btn"
                    onClick={async () => {
                      try {
                        const { authService } = await import('../../services/apiClient');
                        const result = await authService.login('admin', 'admin');
                        if (result.success) {
                          window.location.reload(); // Refresh to update auth state
                        }
                      } catch (err) {
                        console.error('Demo login failed:', err);
                      }
                    }}
                  >
                    Quick Login (admin/admin)
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="cancel-button" onClick={handleClose} disabled={loading}>
            Cancel
          </button>
          <button 
            className="create-button" 
            onClick={handleCreateChat}
            disabled={loading || selectedUsers.length === 0}
          >
            {loading ? 'Creating...' : `Create ${isGroupChat ? 'Group' : 'Chat'}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewChatModal;