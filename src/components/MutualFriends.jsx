// Mutual Friends Component - Show shared connections between users
import React, { useState, useEffect } from 'react';
import { friendService } from '../services/friendService';
import './MutualFriends.css';

const MutualFriends = ({ friendId, friendName, isVisible, onClose }) => {
  const [mutualFriends, setMutualFriends] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isVisible && friendId) {
      loadMutualFriends();
    }
  }, [isVisible, friendId]);

  const loadMutualFriends = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await friendService.getMutualFriends(friendId, 20);
      if (result.success) {
        setMutualFriends(result.mutualFriends);
      } else {
        setError('Failed to load mutual friends');
      }
    } catch (error) {
      console.error('Mutual friends error:', error);
      setError('Failed to load mutual friends');
    }
    setLoading(false);
  };

  const handleViewProfile = (friend) => {
    // In a real app, navigate to friend's profile
    window.dispatchEvent(new CustomEvent('showNotification', {
      detail: { message: `Viewing ${friend.displayName}'s profile`, type: 'info' }
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

  if (!isVisible) return null;

  return (
    <div className="mutual-friends-overlay" onClick={onClose}>
      <div className="mutual-friends-modal" onClick={(e) => e.stopPropagation()}>
        <div className="mutual-friends-header">
          <h3>Mutual Friends with {friendName}</h3>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="mutual-friends-content">
          {loading ? (
            <div className="loading-container">
              <div className="spinner"></div>
              <p>Loading mutual friends...</p>
            </div>
          ) : error ? (
            <div className="error-state">
              <div className="error-icon">⚠️</div>
              <h4>Error Loading Mutual Friends</h4>
              <p>{error}</p>
              <button className="retry-btn" onClick={loadMutualFriends}>
                Try Again
              </button>
            </div>
          ) : mutualFriends.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">👥</div>
              <h4>No Mutual Friends</h4>
              <p>You and {friendName} don't have any mutual friends yet.</p>
            </div>
          ) : (
            <>
              <div className="mutual-friends-summary">
                <p>{mutualFriends.length} mutual friend{mutualFriends.length !== 1 ? 's' : ''}</p>
              </div>
              
              <div className="mutual-friends-list">
                {mutualFriends.map((friend) => (
                  <div key={friend.id} className="mutual-friend-item">
                    <div className="mutual-friend-avatar">
                      <img
                        src={friend.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.id}`}
                        alt={friend.displayName}
                        onError={(e) => {
                          e.target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=default${friend.id}`;
                        }}
                      />
                    </div>

                    <div className="mutual-friend-info">
                      <h4 className="mutual-friend-name">
                        {friend.displayName || friend.username}
                      </h4>
                      <p className="mutual-friend-username">@{friend.username}</p>
                      {friend.friendsSince && (
                        <p className="friends-since">
                          Friends since {formatTimeAgo(friend.friendsSince)}
                        </p>
                      )}
                    </div>

                    <div className="mutual-friend-actions">
                      <button
                        className="view-profile-btn"
                        onClick={() => handleViewProfile(friend)}
                      >
                        👤 Profile
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MutualFriends;