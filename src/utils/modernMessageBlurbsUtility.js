/**
 * Modern Message Blurbs Enhancement Utilities
 * Comprehensive helper functions to apply 8 modernization features to messages
 */

/**
 * Message Type Detection
 * Determines the type of message for context-aware animations
 */
export const getMessageType = (message) => {
  if (message.image || message.imageUrl) return 'image';
  if (message.video || message.videoUrl) return 'video';
  if (message.file || message.fileUrl) return 'file';
  if (message.gif || message.gifUrl) return 'gif';
  if (message.linkPreview) return 'link';
  if (message.voiceMessage) return 'voice';
  return 'text';
};

/**
 * 1. MESSAGE STATUS INDICATORS
 * Returns status indicator configuration for delivery/read status
 */
export const getMessageStatus = (message) => {
  if (message.error) {
    return { status: 'error', icon: '⚠️', label: 'Error' };
  }
  if (message.pending) {
    return { status: 'pending', icon: '⏱️', label: 'Sending...' };
  }
  if (message.read) {
    return { status: 'read', icon: '✓✓', label: 'Read' };
  }
  if (message.delivered) {
    return { status: 'delivered', icon: '✓', label: 'Delivered' };
  }
  return null;
};

/**
 * 2. MESSAGE ACTION TOOLBAR
 * Returns array of actions available for a message
 */
export const getMessageActions = (message, isCurrentUser = false) => {
  const actions = [
    { id: 'reply', icon: '↩️', label: 'Reply', show: true },
    { id: 'react', icon: '😊', label: 'React', show: true },
    { id: 'forward', icon: '↪️', label: 'Forward', show: true },
  ];

  // Add edit action only for current user's messages
  if (isCurrentUser && !message.isSystemMessage) {
    actions.push({ id: 'edit', icon: '✎', label: 'Edit', show: true });
  }

  // Add delete action for current user
  if (isCurrentUser) {
    actions.push({ id: 'more', icon: '⋯', label: 'More', show: true });
  }

  return actions;
};

/**
 * 3. RICH METADATA BADGES
 * Returns array of badges to display on message
 */
export const getMessageBadges = (message) => {
  const badges = [];

  if (message.isEdited) {
    badges.push({ type: 'edited', label: 'Edited', icon: '✎' });
  }
  if (message.isForwarded) {
    badges.push({ type: 'forwarded', label: 'Forwarded', icon: '↪' });
  }
  if (message.isPinned) {
    badges.push({ type: 'pinned', label: 'Pinned', icon: '📌' });
  }
  if (message.isSystemMessage) {
    badges.push({ type: 'system', label: 'System', icon: 'ℹ️' });
  }
  if (message.isImportant) {
    badges.push({ type: 'important', label: 'Important', icon: '⭐' });
  }

  return badges;
};

/**
 * 4. ADVANCED LINK PREVIEWS
 * Returns link preview data if available
 */
export const getLinkPreviewData = (message) => {
  if (!message.linkPreview) return null;

  return {
    url: message.linkPreview.url,
    title: message.linkPreview.title || 'Link',
    description: message.linkPreview.description,
    image: message.linkPreview.image,
    domain: message.linkPreview.domain || new URL(message.linkPreview.url).hostname,
  };
};

/**
 * 5. MESSAGE GROUPING
 * Determines if message should be grouped with adjacent messages
 */
export const getMessageGrouping = (message, previousMessage, nextMessage) => {
  if (!previousMessage || previousMessage.senderId !== message.senderId) {
    // First message in group or new sender
    if (nextMessage && nextMessage.senderId === message.senderId) {
      return 'group-start';
    }
    return 'group-single';
  }

  if (!nextMessage || nextMessage.senderId !== message.senderId) {
    // Last message in group
    return 'group-end';
  }

  // Middle of group
  return 'group-middle';
};

/**
 * 6. CONTEXT-AWARE ANIMATIONS
 * Returns animation class based on message type and index
 */
export const getAnimationClass = (message, index) => {
  const messageType = getMessageType(message);
  const animationClass = `type-${messageType}`;
  const delayClass = `animate-delay-${Math.min(index, 4)}`;

  return `${animationClass} ${delayClass}`;
};

/**
 * 7. ADVANCED REACTIONS
 * Returns formatted reactions with viewer information
 */
export const getFormattedReactions = (reactions) => {
  if (!reactions || reactions.length === 0) return [];

  // Group reactions by emoji
  const grouped = reactions.reduce((acc, reaction) => {
    const existing = acc.find(r => r.emoji === reaction.emoji);
    if (existing) {
      existing.count += 1;
      existing.viewers = [...(existing.viewers || []), reaction.viewer];
    } else {
      acc.push({
        emoji: reaction.emoji,
        count: 1,
        viewers: [reaction.viewer],
      });
    }
    return acc;
  }, []);

  return grouped;
};

/**
 * Get reaction viewer avatars (limited to 3, +N more format)
 */
export const getReactionViewers = (viewers, limit = 3) => {
  if (!viewers || viewers.length === 0) return { displayed: [], more: 0 };

  return {
    displayed: viewers.slice(0, limit),
    more: Math.max(0, viewers.length - limit),
  };
};

/**
 * 8. READ RECEIPTS
 * Returns formatted read receipt information
 */
export const getReadReceipts = (message) => {
  if (!message.readBy || message.readBy.length === 0) return null;

  // Get unique readers, limit to 3
  const uniqueReaders = Array.from(new Map(
    message.readBy.map(r => [r.id, r])
  ).values());

  return {
    readers: uniqueReaders.slice(0, 3),
    more: Math.max(0, uniqueReaders.length - 3),
    readAt: message.readAt || new Date(),
  };
};

/**
 * COMPREHENSIVE MESSAGE ENHANCEMENT
 * All-in-one function to get all enhancement data for a message
 */
export const enhanceMessage = (message, previousMessage, nextMessage, isCurrentUser, index) => {
  return {
    // 1. Status indicators
    status: getMessageStatus(message),

    // 2. Action toolbar
    actions: getMessageActions(message, isCurrentUser),

    // 3. Metadata badges
    badges: getMessageBadges(message),

    // 4. Link previews
    linkPreview: getLinkPreviewData(message),

    // 5. Message grouping
    grouping: getMessageGrouping(message, previousMessage, nextMessage),

    // 6. Animations
    animationClass: getAnimationClass(message, index),

    // 7. Reactions
    reactions: getFormattedReactions(message.reactions),

    // 8. Read receipts
    readReceipts: getReadReceipts(message),

    // Additional helpful data
    messageType: getMessageType(message),
    isGrouped: message.id === previousMessage?.id, // For group detection
  };
};

/**
 * CLASS NAME BUILDER
 * Builds complete className string with all enhancements
 */
export const buildMessageClassName = (message, previousMessage, nextMessage, isCurrentUser, index) => {
  const enhancement = enhanceMessage(message, previousMessage, nextMessage, isCurrentUser, index);
  
  const classes = [
    'pro-message-blurb',
    `type-${enhancement.messageType}`,
    `animate-delay-${Math.min(index, 4)}`,
    enhancement.grouping,
    isCurrentUser ? 'current-user-message' : 'other-user-message',
    message.isSystemMessage && 'system-message',
    message.isImportant && 'important-message',
  ];

  return classes.filter(Boolean).join(' ');
};

/**
 * SAMPLE JSX SNIPPETS
 * Use these patterns when rendering enhanced messages
 */

/*

// Example 1: Render message with all enhancements
<div className={buildMessageClassName(message, prevMsg, nextMsg, isCurrentUser, index)}>
  {enhancement.status && (
    <div className="message-status">
      <span className={`status-indicator ${enhancement.status.status}`}></span>
    </div>
  )}

  <div className="message-content">
    {message.text}
  </div>

  {enhancement.badges.length > 0 && (
    <div className="message-badges">
      {enhancement.badges.map(badge => (
        <span key={badge.type} className={`message-badge ${badge.type}`}>
          {badge.label}
        </span>
      ))}
    </div>
  )}

  {enhancement.linkPreview && (
    <div className="link-preview-modern">
      {enhancement.linkPreview.image && (
        <img src={enhancement.linkPreview.image} alt={enhancement.linkPreview.title} />
      )}
      <div className="link-preview-content-modern">
        <div className="link-preview-title-modern">{enhancement.linkPreview.title}</div>
        <div className="link-preview-description-modern">{enhancement.linkPreview.description}</div>
        <div className="link-preview-domain-modern">{enhancement.linkPreview.domain}</div>
      </div>
    </div>
  )}

  {enhancement.reactions.length > 0 && (
    <div className="message-reactions-inline">
      {enhancement.reactions.map(reaction => (
        <div key={reaction.emoji} className="reaction-bubble-inline with-viewers">
          <span className="reaction-emoji">{reaction.emoji}</span>
          <span className="reaction-count">{reaction.count}</span>
        </div>
      ))}
    </div>
  )}

  <div className="message-action-toolbar">
    {enhancement.actions.map(action => (
      <button
        key={action.id}
        className={`action-button ${action.id}`}
        onClick={() => handleMessageAction(action.id)}
        title={action.label}
      >
        {action.icon}
      </button>
    ))}
  </div>

  {enhancement.readReceipts && (
    <div className="read-receipt-container">
      <div className="read-receipt-avatars">
        {enhancement.readReceipts.readers.map(reader => (
          <img
            key={reader.id}
            src={reader.avatar}
            alt={reader.name}
            className="read-receipt-avatar"
            title={reader.name}
          />
        ))}
        {enhancement.readReceipts.more > 0 && (
          <div className="read-receipt-more">+{enhancement.readReceipts.more}</div>
        )}
      </div>
      <span className="read-receipt-text">Read</span>
    </div>
  )}
</div>

// Example 2: Typing indicator
<div className="enhanced-typing-indicator">
  <div className="typing-dot"></div>
  <div className="typing-dot"></div>
  <div className="typing-dot"></div>
</div>

*/

export default {
  getMessageType,
  getMessageStatus,
  getMessageActions,
  getMessageBadges,
  getLinkPreviewData,
  getMessageGrouping,
  getAnimationClass,
  getFormattedReactions,
  getReactionViewers,
  getReadReceipts,
  enhanceMessage,
  buildMessageClassName,
};
