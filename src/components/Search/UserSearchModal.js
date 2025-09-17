import React, { useState, useEffect, useRef } from 'react';
import { userSearchService } from '../../services/userSearchService';
import './UserSearchModal.css';

const UserSearchModal = ({ 
  isOpen, 
  onClose, 
  onUserSelect, 
  searchQuery = '',
  onSearchQueryChange 
}) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [recentSearches, setRecentSearches] = useState([]);
  const [searchInput, setSearchInput] = useState(searchQuery);
  const [creatingChat, setCreatingChat] = useState(null); // ID of user for which chat is being created
  const inputRef = useRef(null);

  // Load recent searches on mount
  useEffect(() => {
    if (isOpen) {
      setRecentSearches(userSearchService.getRecentSearches());
      setSearchInput(searchQuery);
      
      // Focus input when modal opens
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
    }
  }, [isOpen, searchQuery]);

  // Debounced search function
  const debouncedSearch = userSearchService.createDebouncedSearch((result) => {
    setLoading(false);
    if (result.success) {
      setUsers(result.users);
      setError('');
    } else {
      setError(result.error);
      setUsers([]);
    }
  }, 300);

  // Handle search input change
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchInput(value);
    onSearchQueryChange?.(value);

    if (value.trim().length >= 2) {
      setLoading(true);
      setError('');
      debouncedSearch(value);
    } else {
      setUsers([]);
      setLoading(false);
      setError('');
    }
  };

  // Handle user selection
  const handleUserSelect = async (user) => {
    if (creatingChat === user.id) {
      return; // Prevent double-clicking
    }

    try {
      setCreatingChat(user.id);
      
      if (searchInput.trim()) {
        userSearchService.addToRecentSearches(searchInput, user);
      }
      
      // Call the parent handler and wait for it to complete
      await onUserSelect(user);
      
      // Close modal after successful chat creation
      onClose();
    } catch (error) {
      console.error('Error creating chat:', error);
      // Don't close modal on error, let user try again
    } finally {
      setCreatingChat(null);
    }
  };

  // Handle recent search click
  const handleRecentSearchClick = async (entry) => {
    setSearchInput(entry.query);
    onSearchQueryChange?.(entry.query);
    await handleUserSelect(entry.user);
  };

  // Clear recent searches
  const handleClearRecent = () => {
    userSearchService.clearRecentSearches();
    setRecentSearches([]);
  };

  // Handle overlay click
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="user-search-overlay" onClick={handleOverlayClick}>
      <div className="user-search-modal" onKeyDown={handleKeyDown}>
        <div className="user-search-header">
          <h3>🔍 Search Users</h3>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="user-search-content">
          <div className="search-input-section">
            <div className="search-input-container">
              <span className="search-icon">🔍</span>
              <input
                ref={inputRef}
                type="text"
                placeholder="Search users by name, username, or email..."
                value={searchInput}
                onChange={handleSearchChange}
                className="user-search-input"
                autoComplete="off"
              />
              {searchInput && (
                <button
                  className="clear-search-btn"
                  onClick={() => {
                    setSearchInput('');
                    onSearchQueryChange?.('');
                    setUsers([]);
                    setError('');
                  }}
                >
                  ×
                </button>
              )}
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="search-loading">
              <div className="loading-spinner"></div>
              <p>Searching users...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="search-error">
              <span className="error-icon">⚠️</span>
              <p>{error}</p>
            </div>
          )}

          {/* Search Results */}
          {!loading && !error && searchInput.trim().length >= 2 && (
            <div className="search-results">
              <div className="results-header">
                <h4>Search Results</h4>
                {users.length > 0 && (
                  <span className="results-count">{users.length} user{users.length !== 1 ? 's' : ''} found</span>
                )}
              </div>
              
              {users.length > 0 ? (
                <div className="users-list">
                  {users.map((user) => (
                    <div
                      key={user.id}
                      className="user-item"
                      onClick={() => handleUserSelect(user)}
                    >
                      <div className="user-avatar">
                        {user.avatar ? (
                          <img 
                            src={user.avatar} 
                            alt={user.name}
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div 
                          className="avatar-fallback"
                          style={{ display: user.avatar ? 'none' : 'flex' }}
                        >
                          {(user.name || user.username || '?').charAt(0).toUpperCase()}
                        </div>
                        <div className={`status-indicator ${user.status || 'offline'}`}></div>
                      </div>
                      
                      <div className="user-info">
                        <div className="user-name">{user.name || user.username}</div>
                        <div className="user-details">
                          <span className="username">@{user.username}</span>
                          {user.bio && <span className="bio">{user.bio}</span>}
                          {user.location && <span className="location">📍 {user.location}</span>}
                        </div>
                      </div>
                      
                      <div className="user-actions">
                        <button 
                          className={`chat-btn ${creatingChat === user.id ? 'loading' : ''}`}
                          title={creatingChat === user.id ? "Creating chat..." : "Start Chat"}
                          disabled={creatingChat === user.id}
                        >
                          {creatingChat === user.id ? (
                            <div className="loading-spinner-small"></div>
                          ) : (
                            '💬'
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-results">
                  <span className="no-results-icon">🔍</span>
                  <h4>No users found</h4>
                  <p>Try searching with different keywords</p>
                </div>
              )}
            </div>
          )}

          {/* Recent Searches */}
          {!loading && !error && searchInput.trim().length < 2 && recentSearches.length > 0 && (
            <div className="recent-searches">
              <div className="recent-header">
                <h4>Recent Searches</h4>
                <button className="clear-recent-btn" onClick={handleClearRecent}>
                  Clear All
                </button>
              </div>
              
              <div className="recent-list">
                {recentSearches.map((entry, index) => (
                  <div
                    key={`${entry.user.id}-${index}`}
                    className="recent-item"
                    onClick={() => handleRecentSearchClick(entry)}
                  >
                    <div className="recent-avatar">
                      {entry.user.avatar ? (
                        <img src={entry.user.avatar} alt={entry.user.name} />
                      ) : (
                        <div className="avatar-fallback">
                          {(entry.user.name || entry.user.username || '?').charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    
                    <div className="recent-info">
                      <div className="recent-name">{entry.user.name || entry.user.username}</div>
                      <div className="recent-query">"{entry.query}"</div>
                    </div>
                    
                    <div className="recent-time">
                      {new Date(entry.timestamp).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && searchInput.trim().length < 2 && recentSearches.length === 0 && (
            <div className="empty-state">
              <span className="empty-icon">👥</span>
              <h4>Search for Users</h4>
              <p>Enter at least 2 characters to search for other users</p>
              <div className="search-tips">
                <h5>Search Tips:</h5>
                <ul>
                  <li>🔤 Search by name: "John Doe"</li>
                  <li>📧 Search by username: "johndoe"</li>
                  <li>✉️ Search by email: "john@example.com"</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserSearchModal;