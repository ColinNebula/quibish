import React, { useState, useCallback } from 'react';
import { mobileUtils } from '../../services/mobileInteractionService';
import './ContactCard.css';

const ContactCard = ({
  contact,
  viewMode = 'grid',
  isSelected = false,
  onSelect,
  onEdit,
  onDelete,
  onToggleFavorite,
  onStartChat,
  onStartCall,
  darkMode = false
}) => {
  const [showActions, setShowActions] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Generate initials from name
  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Generate avatar color based on name
  const getAvatarColor = (name) => {
    if (!name) return '#667eea';
    
    const colors = [
      '#667eea', '#764ba2', '#f093fb', '#f5576c',
      '#4facfe', '#43e97b', '#fa709a', '#ffecd2',
      '#a8edea', '#fed6e3', '#d299c2', '#fef9d3'
    ];
    
    const index = name.length % colors.length;
    return colors[index];
  };

  // Format phone number for display
  const formatPhone = (phone) => {
    if (!phone) return '';
    
    // Remove all non-digits
    const digits = phone.replace(/\D/g, '');
    
    // Format as (XXX) XXX-XXXX for US numbers
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    
    return phone;
  };

  // Get contact status indicator
  const getStatusInfo = () => {
    if (contact.isOnline) {
      return { icon: '🟢', text: 'Online', class: 'online' };
    }
    if (contact.lastSeen) {
      const lastSeen = new Date(contact.lastSeen);
      const now = new Date();
      const diff = now - lastSeen;
      
      if (diff < 5 * 60 * 1000) { // 5 minutes
        return { icon: '🟡', text: 'Recently active', class: 'recent' };
      }
      if (diff < 24 * 60 * 60 * 1000) { // 24 hours
        return { icon: '⚪', text: 'Today', class: 'today' };
      }
    }
    return { icon: '⚫', text: 'Offline', class: 'offline' };
  };

  // Handle contact actions
  const handleToggleFavorite = useCallback((e) => {
    e.stopPropagation();
    onToggleFavorite?.(contact.id);
    mobileUtils?.haptic?.('light');
  }, [contact.id, onToggleFavorite]);

  const handleStartChat = useCallback((e) => {
    e.stopPropagation();
    onStartChat?.(contact);
    mobileUtils?.haptic?.('medium');
  }, [contact, onStartChat]);

  const handleStartCall = useCallback((e) => {
    e.stopPropagation();
    onStartCall?.(contact);
    mobileUtils?.haptic?.('medium');
  }, [contact, onStartCall]);

  const handleEdit = useCallback((e) => {
    e.stopPropagation();
    onEdit?.(contact);
    setShowActions(false);
  }, [contact, onEdit]);

  const handleDelete = useCallback((e) => {
    e.stopPropagation();
    onDelete?.(contact.id);
    setShowActions(false);
  }, [contact.id, onDelete]);

  const handleCardClick = useCallback(() => {
    if (onSelect) {
      onSelect(contact.id);
    } else {
      setShowActions(!showActions);
    }
  }, [contact.id, onSelect, showActions]);

  const handleCardLongPress = useCallback(() => {
    if (!onSelect) {
      setShowActions(true);
      mobileUtils?.haptic?.('medium');
    }
  }, [onSelect]);

  const statusInfo = getStatusInfo();
  const avatarColor = getAvatarColor(contact.name);

  return (
    <div 
      className={`contact-card ${viewMode} ${isSelected ? 'selected' : ''} ${darkMode ? 'dark' : ''} ${showActions ? 'actions-open' : ''}`}
      onClick={handleCardClick}
      onContextMenu={(e) => {
        e.preventDefault();
        handleCardLongPress();
      }}
    >
      {/* Selection Checkbox */}
      {onSelect && (
        <div className="selection-checkbox">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onSelect(contact.id)}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Avatar */}
      <div className="contact-avatar-container">
        <div 
          className="contact-avatar"
          style={{ backgroundColor: contact.avatar ? 'transparent' : avatarColor }}
        >
          {contact.avatar && !imageError ? (
            <img 
              src={contact.avatar} 
              alt={contact.name}
              onError={() => setImageError(true)}
            />
          ) : (
            <span className="avatar-initials">
              {getInitials(contact.name)}
            </span>
          )}
        </div>
        
        {/* Status Indicator */}
        <div className={`status-indicator ${statusInfo.class}`}>
          <span className="status-icon">{statusInfo.icon}</span>
        </div>

        {/* Favorite Star */}
        {contact.isFavorite && (
          <div className="favorite-indicator">⭐</div>
        )}
      </div>

      {/* Contact Info */}
      <div className="contact-info">
        <div className="contact-name-section">
          <h3 className="contact-name" title={contact.name}>
            {contact.name || 'Unknown Contact'}
          </h3>
          {contact.nickname && (
            <span className="contact-nickname">"{contact.nickname}"</span>
          )}
        </div>

        <div className="contact-details">
          {contact.company && (
            <div className="contact-company" title={contact.company}>
              🏢 {contact.company}
            </div>
          )}
          
          {contact.jobTitle && (
            <div className="contact-job-title" title={contact.jobTitle}>
              💼 {contact.jobTitle}
            </div>
          )}

          {contact.email && (
            <div className="contact-email" title={contact.email}>
              📧 {contact.email}
            </div>
          )}

          {contact.phone && (
            <div className="contact-phone" title={contact.phone}>
              📱 {formatPhone(contact.phone)}
            </div>
          )}

          {contact.location && (
            <div className="contact-location" title={contact.location}>
              📍 {contact.location}
            </div>
          )}
        </div>

        {/* Tags/Categories */}
        {contact.tags && contact.tags.length > 0 && (
          <div className="contact-tags">
            {contact.tags.slice(0, 3).map((tag, index) => (
              <span key={index} className={`contact-tag ${tag.toLowerCase()}`}>
                {tag}
              </span>
            ))}
            {contact.tags.length > 3 && (
              <span className="contact-tag more">+{contact.tags.length - 3}</span>
            )}
          </div>
        )}

        {/* Last Contact Info */}
        {contact.lastContacted && (
          <div className="last-contact-info">
            <span className="last-contact-label">Last contact:</span>
            <span className="last-contact-date">
              {new Date(contact.lastContacted).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="contact-quick-actions">
        <button
          className="quick-action-btn favorite-btn"
          onClick={handleToggleFavorite}
          title={contact.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          {contact.isFavorite ? '⭐' : '☆'}
        </button>

        {onStartChat && (
          <button
            className="quick-action-btn chat-btn"
            onClick={handleStartChat}
            title="Start chat"
          >
            💬
          </button>
        )}

        {onStartCall && contact.phone && (
          <button
            className="quick-action-btn call-btn"
            onClick={handleStartCall}
            title="Start call"
          >
            📞
          </button>
        )}

        <button
          className="quick-action-btn more-btn"
          onClick={(e) => {
            e.stopPropagation();
            setShowActions(!showActions);
          }}
          title="More actions"
        >
          ⋯
        </button>
      </div>

      {/* Extended Actions Menu */}
      {showActions && (
        <div className="contact-actions-menu">
          <div className="actions-menu-backdrop" onClick={() => setShowActions(false)} />
          <div className="actions-menu-content">
            <button className="action-menu-item" onClick={handleEdit}>
              <span className="action-icon">✏️</span>
              <span className="action-label">Edit Contact</span>
            </button>
            
            {contact.email && (
              <button 
                className="action-menu-item"
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.href = `mailto:${contact.email}`;
                }}
              >
                <span className="action-icon">📧</span>
                <span className="action-label">Send Email</span>
              </button>
            )}

            {contact.phone && (
              <button 
                className="action-menu-item"
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.href = `tel:${contact.phone}`;
                }}
              >
                <span className="action-icon">📞</span>
                <span className="action-label">Call Phone</span>
              </button>
            )}

            {contact.website && (
              <button 
                className="action-menu-item"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(contact.website, '_blank');
                }}
              >
                <span className="action-icon">🌐</span>
                <span className="action-label">Visit Website</span>
              </button>
            )}

            <button 
              className="action-menu-item share-btn"
              onClick={(e) => {
                e.stopPropagation();
                // Share contact functionality
                if (navigator.share) {
                  navigator.share({
                    title: `Contact: ${contact.name}`,
                    text: `${contact.name}\n${contact.email || ''}\n${contact.phone || ''}`,
                  });
                }
              }}
            >
              <span className="action-icon">📤</span>
              <span className="action-label">Share Contact</span>
            </button>

            <button className="action-menu-item delete-btn" onClick={handleDelete}>
              <span className="action-icon">🗑️</span>
              <span className="action-label">Delete Contact</span>
            </button>
          </div>
        </div>
      )}

      {/* Contact Frequency Indicator */}
      {contact.contactCount && contact.contactCount > 0 && (
        <div className="contact-frequency">
          <div className="frequency-bar">
            <div 
              className="frequency-fill"
              style={{ 
                width: `${Math.min((contact.contactCount / 10) * 100, 100)}%` 
              }}
            />
          </div>
          <span className="frequency-label">
            {contact.contactCount} interaction{contact.contactCount !== 1 ? 's' : ''}
          </span>
        </div>
      )}
    </div>
  );
};

export default ContactCard;