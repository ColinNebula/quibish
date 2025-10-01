import React from 'react';
import './ThreadIndicator.css';

const ThreadIndicator = ({ 
  thread, 
  onClick,
  compact = false,
  showParticipants = true 
}) => {
  if (!thread) return null;

  const { replyCount = 0, participants = new Set(), updatedAt } = thread;

  const formatLastActivity = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Active now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    
    return '>1w';
  };

  const isActive = () => {
    if (!updatedAt) return false;
    const diffMs = new Date() - new Date(updatedAt);
    return diffMs < 24 * 60 * 60 * 1000; // Active within 24 hours
  };

  const getParticipantCount = () => {
    return Array.from(participants).length;
  };

  return (
    <div 
      className={`thread-indicator ${compact ? 'compact' : ''} ${isActive() ? 'active' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyPress={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick?.();
        }
      }}
      title={`${replyCount} ${replyCount === 1 ? 'reply' : 'replies'} • ${getParticipantCount()} ${getParticipantCount() === 1 ? 'participant' : 'participants'}`}
    >
      <div className="indicator-icon">
        💬
      </div>
      
      <div className="indicator-content">
        <div className="indicator-count">
          {replyCount}
        </div>
        
        {!compact && (
          <div className="indicator-details">
            {showParticipants && getParticipantCount() > 0 && (
              <span className="indicator-participants">
                👥 {getParticipantCount()}
              </span>
            )}
            {updatedAt && (
              <span className="indicator-time">
                {formatLastActivity(updatedAt)}
              </span>
            )}
          </div>
        )}
      </div>

      {isActive() && (
        <div className="indicator-pulse"></div>
      )}
    </div>
  );
};

export default ThreadIndicator;
