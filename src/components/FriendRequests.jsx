// Friend Request Component - Handle incoming and outgoing friend requests
import React, { useState, useEffect } from 'react';
import { friendService } from '../services/friendService';
import './FriendRequests.css';

const FriendRequests = () => {
  const [requests, setRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [activeTab, setActiveTab] = useState('received');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(new Set());

  useEffect(() => {
    loadRequests();
  }, [activeTab]);

  const loadRequests = async () => {
    setLoading(true);
    try {
      if (activeTab === 'received') {
        const result = await friendService.getFriendRequests('received', 'pending');
        if (result.success) {
          setRequests(result.requests);
        }
      } else {
        const result = await friendService.getFriendRequests('sent', 'pending');
        if (result.success) {
          setSentRequests(result.requests);
        }
      }
    } catch (error) {
      console.error('Failed to load friend requests:', error);
    }
    setLoading(false);
  };

  const handleAcceptRequest = async (requestId) => {
    setProcessing(prev => new Set(prev).add(requestId));
    try {
      const result = await friendService.respondToFriendRequest(requestId, 'accept');
      if (result.success) {
        setRequests(prev => prev.filter(req => req.id !== requestId));
        // Show success notification
        showNotification('Friend request accepted! 🎉', 'success');
      } else {
        showNotification(result.error || 'Failed to accept request', 'error');
      }
    } catch (error) {
      console.error('Accept request error:', error);
      showNotification('Failed to accept request', 'error');
    }
    setProcessing(prev => {
      const newSet = new Set(prev);
      newSet.delete(requestId);
      return newSet;
    });
  };

  const handleDeclineRequest = async (requestId) => {
    setProcessing(prev => new Set(prev).add(requestId));
    try {
      const result = await friendService.respondToFriendRequest(requestId, 'decline');
      if (result.success) {
        setRequests(prev => prev.filter(req => req.id !== requestId));
        showNotification('Friend request declined', 'info');
      } else {
        showNotification(result.error || 'Failed to decline request', 'error');
      }
    } catch (error) {
      console.error('Decline request error:', error);
      showNotification('Failed to decline request', 'error');
    }
    setProcessing(prev => {
      const newSet = new Set(prev);
      newSet.delete(requestId);
      return newSet;
    });
  };

  const showNotification = (message, type) => {
    // Dispatch custom event for global notification system
    window.dispatchEvent(new CustomEvent('showNotification', {
      detail: { message, type }
    }));
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="friend-requests-container">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading friend requests...</p>
        </div>
      </div>
    );
  }

  const currentRequests = activeTab === 'received' ? requests : sentRequests;

  return (
    <div className="friend-requests-container">
      <div className="friend-requests-header">
        <h2>Friend Requests</h2>
        <div className="request-tabs">
          <button
            className={`tab-button ${activeTab === 'received' ? 'active' : ''}`}
            onClick={() => setActiveTab('received')}
          >
            Received ({requests.length})
          </button>
          <button
            className={`tab-button ${activeTab === 'sent' ? 'active' : ''}`}
            onClick={() => setActiveTab('sent')}
          >
            Sent ({sentRequests.length})
          </button>
        </div>
      </div>

      <div className="friend-requests-content">
        {currentRequests.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              {activeTab === 'received' ? '📨' : '📤'}
            </div>
            <h3>No {activeTab} requests</h3>
            <p>
              {activeTab === 'received' 
                ? "You don't have any pending friend requests." 
                : "You haven't sent any friend requests recently."
              }
            </p>
          </div>
        ) : (
          <div className="requests-list">
            {currentRequests.map((request) => (
              <div key={request.id} className="request-item">
                <div className="request-avatar">
                  <img
                    src={request.senderDetails?.avatar || request.receiverDetails?.avatar || 
                         `https://api.dicebear.com/7.x/avataaars/svg?seed=${request.senderId || request.receiverId}`}
                    alt="Avatar"
                    onError={(e) => {
                      e.target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=default${request.id}`;
                    }}
                  />
                  {(request.senderDetails?.status || request.receiverDetails?.status) === 'online' && (
                    <div className="online-indicator"></div>
                  )}
                </div>

                <div className="request-details">
                  <div className="request-user">
                    <span className="username">
                      {activeTab === 'received' 
                        ? request.senderDetails?.displayName || request.senderDetails?.username
                        : request.receiverDetails?.displayName || request.receiverDetails?.username
                      }
                    </span>
                    {request.senderDetails?.mutualFriends > 0 && (
                      <span className="mutual-friends">
                        {request.senderDetails.mutualFriends} mutual friends
                      </span>
                    )}
                  </div>
                  
                  <div className="request-meta">
                    <span className="request-time">{formatTimeAgo(request.sentAt)}</span>
                    {request.offline && (
                      <span className="offline-badge">Offline</span>
                    )}
                  </div>

                  {request.message && (
                    <div className="request-message">
                      <p>"{request.message}"</p>
                    </div>
                  )}
                </div>

                {activeTab === 'received' && (
                  <div className="request-actions">
                    <button
                      className="accept-btn"
                      onClick={() => handleAcceptRequest(request.id)}
                      disabled={processing.has(request.id)}
                    >
                      {processing.has(request.id) ? (
                        <span className="btn-spinner">⟳</span>
                      ) : (
                        '✓'
                      )}
                      Accept
                    </button>
                    <button
                      className="decline-btn"
                      onClick={() => handleDeclineRequest(request.id)}
                      disabled={processing.has(request.id)}
                    >
                      {processing.has(request.id) ? (
                        <span className="btn-spinner">⟳</span>
                      ) : (
                        '✗'
                      )}
                      Decline
                    </button>
                  </div>
                )}

                {activeTab === 'sent' && (
                  <div className="request-status">
                    <span className="pending-status">
                      ⏱️ Pending
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="friend-requests-footer">
        <button className="refresh-btn" onClick={loadRequests}>
          🔄 Refresh
        </button>
      </div>
    </div>
  );
};

export default FriendRequests;