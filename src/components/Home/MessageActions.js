import React, { useState, useCallback, useMemo } from 'react';
import './MessageActions.css';

const MessageActions = ({ 
  message, 
  onReply, 
  onReact, 
  onEdit, 
  onDelete, 
  onTranslate,
  currentUser 
}) => {
  const [showActions, setShowActions] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  
  // Generate context-aware actions based on message content
  const contextualActions = useMemo(() => {
    const actions = ['reply', 'react'];
    
    // Add copy action for code blocks
    if (message.text.includes('```') || message.text.includes('`')) {
      actions.push('copy-code');
    }
    
    // Add link preview for URLs
    if (message.text.match(/https?:\/\/[^\s]+/)) {
      actions.push('preview-links');
    }
    
    // Add download for media files
    if (message.file) {
      actions.push('download');
      if (message.file.type.startsWith('image/')) {
        actions.push('view-full');
      }
    }
    
    // Add translate for other users' messages
    if (message.user.id !== currentUser.id) {
      actions.push('translate');
    }
    
    // Add edit/delete for own messages
    if (message.user.id === currentUser.id) {
      actions.push('edit', 'delete');
    }
    
    // Add summarize for long messages
    if (message.text.length > 500) {
      actions.push('summarize');
    }
    
    return actions;
  }, [message, currentUser.id]);
  
  // Handle specific actions
  const handleCopyCode = useCallback(() => {
    const codeBlocks = message.text.match(/```[\s\S]*?```/g) || [];
    const inlineCode = message.text.match(/`[^`]+`/g) || [];
    const allCode = [...codeBlocks, ...inlineCode].join('\n');
    
    navigator.clipboard?.writeText(allCode.replace(/```/g, '').replace(/`/g, ''));
    // Show success feedback
    console.log('Code copied to clipboard');
  }, [message.text]);
  
  const handlePreviewLinks = useCallback(() => {
    const links = message.text.match(/https?:\/\/[^\s]+/g) || [];
    // Open first link in new tab for now
    if (links.length > 0) {
      window.open(links[0], '_blank', 'noopener,noreferrer');
    }
  }, [message.text]);
  
  const handleDownload = useCallback(() => {
    if (message.file) {
      const link = document.createElement('a');
      link.href = message.file.url;
      link.download = message.file.name;
      link.click();
    }
  }, [message.file]);
  
  const handleViewFull = useCallback(() => {
    // This would open the image in a lightbox/modal
    console.log('Opening full image view for:', message.file?.name);
  }, [message.file]);
  
  const handleSummarize = useCallback(() => {
    // This would generate an AI summary
    const summary = message.text.substring(0, 150) + '... [AI Summary would appear here]';
    console.log('Summary:', summary);
  }, [message.text]);
  
  const commonReactions = ['👍', '❤️', '😂', '😮', '😢', '😡'];
  
  const renderActionButton = (action) => {
    const actionConfig = {
      reply: { icon: '↩️', label: 'Reply', onClick: () => onReply(message.id) },
      react: { 
        icon: '😊', 
        label: 'React', 
        onClick: () => setShowReactionPicker(!showReactionPicker) 
      },
      'copy-code': { icon: '📋', label: 'Copy Code', onClick: handleCopyCode },
      'preview-links': { icon: '🔗', label: 'Preview Links', onClick: handlePreviewLinks },
      download: { icon: '⬇️', label: 'Download', onClick: handleDownload },
      'view-full': { icon: '🔍', label: 'View Full', onClick: handleViewFull },
      translate: { icon: '🌐', label: 'Translate', onClick: () => onTranslate(message.id) },
      edit: { icon: '✏️', label: 'Edit', onClick: () => onEdit(message.id) },
      delete: { icon: '🗑️', label: 'Delete', onClick: () => onDelete(message.id) },
      summarize: { icon: '📝', label: 'Summarize', onClick: handleSummarize }
    };
    
    const config = actionConfig[action];
    if (!config) return null;
    
    return (
      <button
        key={action}
        className={`message-action-btn action-${action}`}
        onClick={config.onClick}
        title={config.label}
      >
        <span className="action-icon">{config.icon}</span>
        <span className="action-label">{config.label}</span>
      </button>
    );
  };
  
  return (
    <div 
      className={`message-actions ${showActions ? 'visible' : ''}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => {
        setShowActions(false);
        setShowReactionPicker(false);
      }}
    >
      <div className="actions-trigger">
        <button className="actions-toggle" title="More actions">
          ⋯
        </button>
      </div>
      
      {showActions && (
        <div className="actions-menu">
          {contextualActions.map(action => renderActionButton(action))}
        </div>
      )}
      
      {showReactionPicker && (
        <div className="reaction-picker">
          {commonReactions.map(emoji => (
            <button
              key={emoji}
              className="reaction-btn"
              onClick={() => {
                onReact(message.id, emoji);
                setShowReactionPicker(false);
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default MessageActions;