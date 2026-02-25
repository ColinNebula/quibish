// Friends List Component - Display and manage friends
import React, { useState, useEffect } from 'react';
import { friendService } from '../services/friendService';
import FriendSuggestions from './FriendSuggestions';
import './FriendsList.css';

const FriendsList = () => {
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });

  useEffect(() => {
    loadFriends();
  }, [pagination.page, searchQuery]);

  const loadFriends = async () => {
    setLoading(true);
    try {
      const result = await friendService.getFriends({
        search: searchQuery,
        page: pagination.page,
        limit: pagination.limit
      });
      
      if (result.success) {
        setFriends(result.friends);
        setPagination(prev => ({
          ...prev,
          ...result.pagination
        }));
      }
    } catch (error) {
      console.error('Failed to load friends:', error);
      showNotification('Failed to load friends', 'error');
    }
    setLoading(false);
  };

  const handleRemoveFriend = async (friendId) => {
    if (!window.confirm('Are you sure you want to remove this friend?')) {
      return;
    }

    try {
      const result = await friendService.removeFriend(friendId);
      if (result.success) {
        setFriends(prev => prev.filter(f => f.id !== friendId));
        showNotification('Friend removed successfully', 'success');
      } else {
        showNotification(result.error || 'Failed to remove friend', 'error');
      }
    } catch (error) {
      console.error('Remove friend error:', error);
      showNotification('Failed to remove friend', 'error');
    }
  };

  const handleViewProfile = (friend) => {
    setSelectedFriend(friend);
    // In a real app, this would navigate to the friend's profile
    showNotification(`Viewing ${friend.displayName}'s profile`, 'info');
  };

  const handleStartChat = (friend) => {
    // In a real app, this would open a chat with the friend
    showNotification(`Starting chat with ${friend.displayName}`, 'info');
  };

  const showNotification = (message, type) => {
    window.dispatchEvent(new CustomEvent('showNotification', {
      detail: { message, type }
    }));
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 30) return `${diffDays} days ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  if (loading && friends.length === 0) {
    return (
      <div className="friends-list-container">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading friends...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="friends-list-container">
      <div className="friends-list-header">
        <h2>My Friends ({pagination.total})</h2>
        
        <div className="friends-actions">
          <div className="search-container">
            <input
              type="text"
              placeholder="Search friends..."
              value={searchQuery}
              onChange={handleSearch}
              className="search-input"
            />
            <span className="search-icon">🔍</span>
          </div>
          
          <button
            className="suggestions-btn"
            onClick={() => setShowSuggestions(!showSuggestions)}
          >
            {showSuggestions ? '👥' : '➕'} 
            {showSuggestions ? 'Hide' : 'Find'} Friends
          </button>
        </div>
      </div>

      {showSuggestions && (
        <div className="suggestions-section">
          <FriendSuggestions onSuggestionSent={() => setShowSuggestions(false)} />
        </div>
      )}

      <div className="friends-list-content">
        {friends.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">👥</div>
            <h3>No friends found</h3>
            <p>
              {searchQuery 
                ? `No friends match "${searchQuery}". Try a different search term.`
                : "You haven't added any friends yet. Start by finding people you know!"
              }
            </p>
            {!searchQuery && (
              <button
                className="add-friends-btn"
                onClick={() => setShowSuggestions(true)}
              >
                Find Friends
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="friends-grid">
              {friends.map((friend) => (
                <div key={friend.id} className="friend-card">
                  <div className="friend-avatar">
                    <img
                      src={friend.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.id}`}
                      alt={friend.displayName}
                      onError={(e) => {
                        e.target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=default${friend.id}`;
                      }}
                    />
                    <div className={`status-indicator ${friend.status || 'offline'}`}></div>
                  </div>

                  <div className="friend-info">
                    <h3 className="friend-name">{friend.displayName || friend.username}</h3>
                    <p className="friend-username">@{friend.username}</p>
                    
                    {friend.mutualFriends > 0 && (
                      <p className="mutual-friends">
                        {friend.mutualFriends} mutual friends
                      </p>
                    )}
                    
                    <p className="friends-since">
                      Friends since {formatTimeAgo(friend.friendsSince)}
                    </p>
                  </div>

                  <div className="friend-actions">
                    <button
                      className="action-btn message-btn"
                      onClick={() => handleStartChat(friend)}
                      title="Send message"
                    >
                      💬
                    </button>
                    
                    <button
                      className="action-btn profile-btn"
                      onClick={() => handleViewProfile(friend)}
                      title="View profile"
                    >
                      👤
                    </button>
                    
                    <div className="friend-menu">
                      <button className="action-btn menu-btn" title="More options">
                        ⋮
                      </button>
                      <div className="friend-menu-dropdown">
                        <button
                          onClick={() => handleViewProfile(friend)}
                          className="menu-item"
                        >
                          View Profile
                        </button>
                        <button
                          onClick={() => handleStartChat(friend)}
                          className="menu-item"
                        >
                          Send Message
                        </button>
                        <button
                          onClick={() => handleRemoveFriend(friend.id)}
                          className="menu-item remove-item"
                        >
                          Remove Friend
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {pagination.totalPages > 1 && (
              <div className="pagination">
                <button
                  className="page-btn"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                >
                  Previous
                </button>
                
                <span className="page-info">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                
                <button
                  className="page-btn"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <div className="friends-list-footer">
        <button className="refresh-btn" onClick={loadFriends}>
          🔄 Refresh
        </button>
      </div>
    </div>
  );
};

export default FriendsList;