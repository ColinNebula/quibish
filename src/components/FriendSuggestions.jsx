// Friend Suggestions Component - AI-powered friend recommendations
import React, { useState, useEffect } from 'react';
import { friendService } from '../services/friendService';
import './FriendSuggestions.css';

const FriendSuggestions = ({ onSuggestionSent }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [sendingRequests, setSendingRequests] = useState(new Set());
  const [activeTab, setActiveTab] = useState('suggestions');

  useEffect(() => {
    loadSuggestions();
  }, []);

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (searchQuery && activeTab === 'search') {
        performSearch();
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [searchQuery, activeTab]);

  const loadSuggestions = async () => {
    setLoading(true);
    try {
      const result = await friendService.getFriendSuggestions(20);
      if (result.success) {
        setSuggestions(result.suggestions);
      }
    } catch (error) {
      console.error('Failed to load suggestions:', error);
    }
    setLoading(false);
  };

  const performSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const result = await friendService.searchUsers(searchQuery.trim());
      if (result.success) {
        setSearchResults(result.users);
      }
    } catch (error) {
      console.error('Search failed:', error);
      showNotification('Search failed', 'error');
    }
    setSearchLoading(false);
  };

  const handleSendRequest = async (userId, displayName) => {
    setSendingRequests(prev => new Set(prev).add(userId));
    
    try {
      const result = await friendService.sendFriendRequest(userId, `Hi! I'd like to connect with you.`);
      if (result.success) {
        if (result.autoAccepted) {
          showNotification(`You're now friends with ${displayName}! 🎉`, 'success');
        } else {
          showNotification(`Friend request sent to ${displayName}`, 'success');
        }
        
        // Remove from suggestions/search results
        setSuggestions(prev => prev.filter(s => s.id !== userId));
        setSearchResults(prev => prev.filter(s => s.id !== userId));
        
        if (onSuggestionSent) {
          onSuggestionSent();
        }
      } else {
        showNotification(result.error || 'Failed to send friend request', 'error');
      }
    } catch (error) {
      console.error('Send request error:', error);
      showNotification('Failed to send friend request', 'error');
    }
    
    setSendingRequests(prev => {
      const newSet = new Set(prev);
      newSet.delete(userId);
      return newSet;
    });
  };

  const showNotification = (message, type) => {
    window.dispatchEvent(new CustomEvent('showNotification', {
      detail: { message, type }
    }));
  };

  const currentData = activeTab === 'suggestions' ? suggestions : searchResults;
  const isLoading = activeTab === 'suggestions' ? loading : searchLoading;

  return (
    <div className="friend-suggestions-container">
      <div className="suggestions-header">
        <h3>Find Friends</h3>
        
        <div className="suggestions-tabs">
          <button
            className={`tab-btn ${activeTab === 'suggestions' ? 'active' : ''}`}
            onClick={() => setActiveTab('suggestions')}
          >
            🎯 Suggestions
          </button>
          <button
            className={`tab-btn ${activeTab === 'search' ? 'active' : ''}`}
            onClick={() => setActiveTab('search')}
          >
            🔍 Search
          </button>
        </div>
      </div>

      {activeTab === 'search' && (
        <div className="search-section">
          <div className="search-container">
            <input
              type="text"
              placeholder="Search for people by username or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            {searchLoading && <div className="search-spinner">⟳</div>}
          </div>
        </div>
      )}

      <div className="suggestions-content">
        {isLoading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading {activeTab}...</p>
          </div>
        ) : currentData.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              {activeTab === 'suggestions' ? '🎯' : '🔍'}
            </div>
            <h4>No {activeTab} found</h4>
            <p>
              {activeTab === 'suggestions' 
                ? "We don't have any friend suggestions for you right now. Try using search to find specific people."
                : searchQuery 
                  ? `No users found for "${searchQuery}". Try a different search term.`
                  : "Enter a username or name to search for people."
              }
            </p>
          </div>
        ) : (
          <div className="suggestions-grid">
            {currentData.map((person) => (
              <div key={person.id} className="suggestion-card">
                <div className="suggestion-avatar">
                  <img
                    src={person.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${person.id}`}
                    alt={person.displayName}
                    onError={(e) => {
                      e.target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=default${person.id}`;
                    }}
                  />
                </div>

                <div className="suggestion-info">
                  <h4 className="suggestion-name">{person.displayName || person.username}</h4>
                  <p className="suggestion-username">@{person.username}</p>
                  
                  {person.mutualFriends > 0 && (
                    <p className="mutual-friends">
                      👥 {person.mutualFriends} mutual friends
                    </p>
                  )}
                  
                  {person.reason && (
                    <p className="suggestion-reason">{person.reason}</p>
                  )}
                </div>

                <div className="suggestion-actions">
                  <button
                    className="add-friend-btn"
                    onClick={() => handleSendRequest(person.id, person.displayName || person.username)}
                    disabled={sendingRequests.has(person.id)}
                  >
                    {sendingRequests.has(person.id) ? (
                      <span className="btn-spinner">⟳</span>
                    ) : (
                      '➕'
                    )}
                    {sendingRequests.has(person.id) ? 'Sending...' : 'Add Friend'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {activeTab === 'suggestions' && suggestions.length > 0 && (
        <div className="suggestions-footer">
          <button className="refresh-btn" onClick={loadSuggestions}>
            🔄 Refresh Suggestions
          </button>
        </div>
      )}
    </div>
  );
};

export default FriendSuggestions;