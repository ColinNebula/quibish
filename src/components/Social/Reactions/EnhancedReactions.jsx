import React, { useState, useRef, useEffect } from 'react';
import './EnhancedReactions.css';

const reactions = [
  { id: 'like', emoji: '👍', label: 'Like', color: '#0084ff' },
  { id: 'love', emoji: '❤️', label: 'Love', color: '#f33e5b' },
  { id: 'haha', emoji: '😂', label: 'Haha', color: '#f7b125' },
  { id: 'wow', emoji: '😮', label: 'Wow', color: '#f7b125' },
  { id: 'sad', emoji: '😢', label: 'Sad', color: '#5890ff' },
  { id: 'angry', emoji: '😠', label: 'Angry', color: '#e9710f' },
  { id: 'insightful', emoji: '💡', label: 'Insightful', color: '#0084ff' },
  { id: 'celebrate', emoji: '🎉', label: 'Celebrate', color: '#44bfb7' }
];

const EnhancedReactions = ({ 
  postId, 
  currentReaction = null,
  reactionCounts = {},
  onReact,
  showInline = false 
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const longPressTimer = useRef(null);
  const buttonRef = useRef(null);

  const handleMouseDown = () => {
    longPressTimer.current = setTimeout(() => {
      setShowPicker(true);
      navigator.vibrate?.(50); // Haptic feedback if supported
    }, 300); // 300ms long press
  };

  const handleMouseUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  const handleClick = async (e) => {
    e.stopPropagation();
    
    // If picker not showing, quick tap = toggle like
    if (!showPicker) {
      handleQuickReaction('like');
    }
  };

  const handleQuickReaction = async (reactionType) => {
    setIsAnimating(true);
    
    try {
      // If clicking same reaction, remove it
      const newReaction = currentReaction === reactionType ? null : reactionType;
      await onReact?.(postId, newReaction);
    } catch (error) {
      console.error('Error reacting:', error);
    } finally {
      setTimeout(() => setIsAnimating(false), 600);
    }
  };

  const handleReactionSelect = async (reactionType) => {
    setShowPicker(false);
    setIsAnimating(true);
    
    try {
      // If clicking same reaction, remove it
      const newReaction = currentReaction === reactionType ? null : reactionType;
      await onReact?.(postId, newReaction);
    } catch (error) {
      console.error('Error selecting reaction:', error);
    } finally {
      setTimeout(() => setIsAnimating(false), 600);
    }
  };

  const getTotalReactions = () => {
    return Object.values(reactionCounts).reduce((sum, count) => sum + count, 0);
  };

  const getTopReactions = (limit = 3) => {
    return Object.entries(reactionCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .filter(([, count]) => count > 0);
  };

  const getCurrentReactionData = () => {
    return reactions.find(r => r.id === currentReaction);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (buttonRef.current && !buttonRef.current.contains(event.target)) {
        setShowPicker(false);
      }
    };

    if (showPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showPicker]);

  const currentReactionData = getCurrentReactionData();
  const totalReactions = getTotalReactions();
  const topReactions = getTopReactions();

  return (
    <div className="enhanced-reactions-container" ref={buttonRef}>
      {/* Main Reaction Button */}
      <button
        className={`reaction-button ${currentReaction ? 'reacted' : ''} ${isAnimating ? 'animating' : ''}`}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchEnd={handleMouseUp}
        style={{
          color: currentReactionData?.color || '#65676b'
        }}
      >
        <span className="reaction-icon">
          {currentReactionData ? currentReactionData.emoji : '👍'}
        </span>
        <span className="reaction-label">
          {currentReactionData ? currentReactionData.label : 'Like'}
        </span>
      </button>

      {/* Reaction Counts Display */}
      {totalReactions > 0 && showInline && (
        <div className="reaction-counts-inline">
          <div className="reaction-emoji-stack">
            {topReactions.map(([reactionId, count]) => {
              const reaction = reactions.find(r => r.id === reactionId);
              return (
                <span key={reactionId} className="reaction-emoji-small">
                  {reaction?.emoji}
                </span>
              );
            })}
          </div>
          <span className="reaction-count-text">{totalReactions}</span>
        </div>
      )}

      {/* Reaction Picker Popup */}
      {showPicker && (
        <div className="reaction-picker-popup">
          <div className="reaction-picker-inner">
            {reactions.map((reaction) => (
              <button
                key={reaction.id}
                className={`reaction-option ${currentReaction === reaction.id ? 'selected' : ''}`}
                onClick={() => handleReactionSelect(reaction.id)}
                title={reaction.label}
              >
                <span className="reaction-emoji-large">{reaction.emoji}</span>
                <span className="reaction-label-small">{reaction.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Reaction Summary Component - Shows who reacted with what
export const ReactionSummary = ({ reactions, onClick }) => {
  const getReactionGroups = () => {
    const groups = {};
    reactions.forEach(r => {
      if (!groups[r.reaction_type]) {
        groups[r.reaction_type] = [];
      }
      groups[r.reaction_type].push(r);
    });
    return groups;
  };

  const reactionGroups = getReactionGroups();
  const totalCount = reactions.length;

  if (totalCount === 0) return null;

  return (
    <div className="reaction-summary" onClick={onClick}>
      <div className="reaction-emoji-group">
        {Object.keys(reactionGroups).slice(0, 3).map(reactionType => {
          const reaction = reactions.find(r => r.id === reactionType);
          return (
            <span key={reactionType} className="reaction-emoji-badge">
              {reaction?.emoji}
            </span>
          );
        })}
      </div>
      <span className="reaction-summary-text">
        {totalCount}
      </span>
    </div>
  );
};

// Reaction Details Modal - Shows detailed breakdown
export const ReactionDetailsModal = ({ postId, onClose }) => {
  const [activeTab, setActiveTab] = useState('all');
  const [reactionData, setReactionData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReactionData();
  }, [postId]);

  const fetchReactionData = async () => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const response = await fetch(`/api/posts/${postId}/reactions/detailed`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        setReactionData(data.reactions);
      }
    } catch (error) {
      console.error('Error fetching reaction details:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredReactions = () => {
    if (activeTab === 'all') return reactionData;
    return reactionData.filter(r => r.reaction_type === activeTab);
  };

  const getReactionCounts = () => {
    const counts = { all: reactionData.length };
    reactions.forEach(reaction => {
      counts[reaction.id] = reactionData.filter(r => r.reaction_type === reaction.id).length;
    });
    return counts;
  };

  const reactionCounts = getReactionCounts();
  const filteredReactions = getFilteredReactions();

  return (
    <div className="reaction-details-modal-overlay" onClick={onClose}>
      <div className="reaction-details-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Reactions</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Reaction Tabs */}
        <div className="reaction-tabs">
          <button
            className={`reaction-tab ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All {reactionCounts.all}
          </button>
          {reactions.map(reaction => (
            reactionCounts[reaction.id] > 0 && (
              <button
                key={reaction.id}
                className={`reaction-tab ${activeTab === reaction.id ? 'active' : ''}`}
                onClick={() => setActiveTab(reaction.id)}
              >
                {reaction.emoji} {reactionCounts[reaction.id]}
              </button>
            )
          ))}
        </div>

        {/* Reaction List */}
        <div className="reaction-list">
          {loading ? (
            <div className="loading-state">Loading...</div>
          ) : filteredReactions.length === 0 ? (
            <div className="empty-state">No reactions yet</div>
          ) : (
            filteredReactions.map(reaction => {
              const reactionType = reactions.find(r => r.id === reaction.reaction_type);
              return (
                <div key={reaction.id} className="reaction-item">
                  <img 
                    src={reaction.user_avatar} 
                    alt={reaction.user_name}
                    className="reaction-user-avatar"
                  />
                  <div className="reaction-user-info">
                    <span className="reaction-user-name">{reaction.user_name}</span>
                    <span className="reaction-timestamp">
                      {formatRelativeTime(reaction.created_at)}
                    </span>
                  </div>
                  <span className="reaction-emoji-indicator">
                    {reactionType?.emoji}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

// Utility function
const formatRelativeTime = (timestamp) => {
  const now = new Date();
  const past = new Date(timestamp);
  const diffMs = now - past;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return past.toLocaleDateString();
};

export default EnhancedReactions;
