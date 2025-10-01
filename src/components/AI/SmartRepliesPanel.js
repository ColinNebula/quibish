// Smart Replies Panel Component
import React, { useState, useEffect, useCallback } from 'react';
import aiService from '../../services/aiService';
import './SmartRepliesPanel.css';

const SmartRepliesPanel = ({ 
  lastMessage, 
  conversationHistory = [],
  onReplySelect,
  onClose,
  isVisible = false
}) => {
  const [smartReplies, setSmartReplies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sentiment, setSentiment] = useState(null);

  // Generate smart replies when last message changes
  useEffect(() => {
    if (lastMessage && isVisible) {
      generateReplies();
      analyzeSentiment();
    }
  }, [lastMessage, isVisible]);

  // Generate smart reply suggestions
  const generateReplies = useCallback(async () => {
    if (!lastMessage) return;

    setLoading(true);
    try {
      const replies = await aiService.generateSmartReplies(
        lastMessage,
        conversationHistory
      );
      setSmartReplies(replies);
    } catch (error) {
      console.error('Failed to generate smart replies:', error);
      setSmartReplies([]);
    } finally {
      setLoading(false);
    }
  }, [lastMessage, conversationHistory]);

  // Analyze message sentiment
  const analyzeSentiment = useCallback(async () => {
    if (!lastMessage) return;

    try {
      const analysis = await aiService.analyzeSentiment(lastMessage);
      setSentiment(analysis);
    } catch (error) {
      console.error('Failed to analyze sentiment:', error);
    }
  }, [lastMessage]);

  // Handle reply selection
  const handleReplyClick = (reply) => {
    if (onReplySelect) {
      onReplySelect(reply.text);
    }
  };

  // Get sentiment color
  const getSentimentColor = () => {
    if (!sentiment) return '#9ca3af';
    
    if (sentiment.overall === 'positive') return '#10b981';
    if (sentiment.overall === 'negative') return '#ef4444';
    return '#6b7280';
  };

  // Get sentiment emoji
  const getSentimentEmoji = () => {
    if (!sentiment) return '😐';
    
    if (sentiment.overall === 'positive') return '😊';
    if (sentiment.overall === 'negative') return '😟';
    return '😐';
  };

  if (!isVisible) return null;

  return (
    <div className="smart-replies-panel">
      {/* Header */}
      <div className="smart-replies-header">
        <div className="header-left">
          <span className="ai-icon">🤖</span>
          <h4>Smart Replies</h4>
        </div>
        {sentiment && (
          <div className="sentiment-indicator" style={{ color: getSentimentColor() }}>
            <span className="sentiment-emoji">{getSentimentEmoji()}</span>
            <span className="sentiment-label">{sentiment.overall}</span>
          </div>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="smart-replies-loading">
          <div className="loading-spinner"></div>
          <p>Generating suggestions...</p>
        </div>
      )}

      {/* Smart Replies */}
      {!loading && smartReplies.length > 0 && (
        <div className="smart-replies-list">
          {smartReplies.map((reply, index) => (
            <button
              key={index}
              className={`smart-reply-btn ${reply.isEmoji ? 'emoji-reply' : ''}`}
              onClick={() => handleReplyClick(reply)}
              title={`${Math.round(reply.confidence * 100)}% confidence`}
            >
              <span className="reply-text">{reply.text}</span>
              {reply.confidence > 0.8 && !reply.isEmoji && (
                <span className="confidence-badge">✨</span>
              )}
              {reply.category && !reply.isEmoji && (
                <span className="category-tag">{reply.category}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && smartReplies.length === 0 && (
        <div className="smart-replies-empty">
          <span className="empty-icon">💭</span>
          <p>No suggestions available</p>
        </div>
      )}

      {/* Footer */}
      <div className="smart-replies-footer">
        <button className="refresh-btn" onClick={generateReplies}>
          🔄 Refresh
        </button>
        <span className="ai-powered">Powered by AI</span>
      </div>
    </div>
  );
};

export default SmartRepliesPanel;
