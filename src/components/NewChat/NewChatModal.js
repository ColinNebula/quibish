import React, { useState, useEffect, useCallback, useRef } from 'react';
import './NewChatModal.css';
import { contactService } from '../../services/contactService';

const MAX_AVATAR_PX = 128;

// Downscale an image file to a small square JPEG data URL
const fileToAvatarDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onerror = () => reject(new Error('Could not read image'));
  reader.onload = () => {
    const img = new Image();
    img.onerror = () => reject(new Error('Invalid image'));
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = MAX_AVATAR_PX;
      canvas.height = MAX_AVATAR_PX;
      const side = Math.min(img.width, img.height);
      canvas.getContext('2d').drawImage(
        img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, MAX_AVATAR_PX, MAX_AVATAR_PX
      );
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
});

const NewChatModal = ({ isOpen, onClose, onCreateChat, recentContacts = [] }) => {
  const [chatType, setChatType] = useState('direct');
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const searchInputRef = useRef(null);
  const avatarInputRef = useRef(null);
  const [groupAvatar, setGroupAvatar] = useState('');
  const [avatarError, setAvatarError] = useState('');
  const [firstMessage, setFirstMessage] = useState('');
  const recentRef = useRef(recentContacts);
  recentRef.current = recentContacts;
  const loadContacts = useCallback(async () => {
    setLoading(true);
    try {
      const result = await contactService.getContacts({ search: searchTerm });
      // New accounts have no saved contacts; fall back to people already chatted with
      const q = searchTerm.trim().toLowerCase();
      const fallback = (result && result.length > 0) ? result : recentRef.current.filter(c =>
        !q || `${c.name || ''} ${c.email || ''}`.toLowerCase().includes(q));
      setContacts(fallback);
    } catch (error) {
      console.error('Failed to load contacts:', error);
      setContacts([]);
    }
    setLoading(false);
  }, [searchTerm]);

  // Always start from a clean slate and focus search when opened
  useEffect(() => {
    if (!isOpen) return undefined;
    setChatType('direct');
    setSelectedContacts([]);
    setGroupName('');
    setGroupAvatar('');
    setAvatarError('');
    setFirstMessage('');
    setSearchTerm('');
    const focusTimer = setTimeout(() => searchInputRef.current?.focus(), 50);
    return () => clearTimeout(focusTimer);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  // Debounced search while the modal is open
  useEffect(() => {
    if (!isOpen) return undefined;

    const timeoutId = setTimeout(() => {
      loadContacts();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [isOpen, searchTerm, loadContacts]);

  // Handle contact selection
  const handleContactSelect = (contact) => {
    if (chatType === 'direct') {
      setSelectedContacts([contact]);
    } else {
      setSelectedContacts(prev => {
        const isSelected = prev.find(c => c.id === contact.id);
        if (isSelected) {
          return prev.filter(c => c.id !== contact.id);
        } else {
          return [...prev, contact];
        }
      });
    }
  };

  const handleAvatarPick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setAvatarError('Please choose an image file');
      return;
    }
    try {
      setGroupAvatar(await fileToAvatarDataUrl(file));
      setAvatarError('');
    } catch (err) {
      setAvatarError(err.message);
    }
  };

  const handleTypeChange = (type) => {
    setChatType(type);
    if (type === 'direct') setSelectedContacts(prev => prev.slice(0, 1));
  };

  const canCreate = selectedContacts.length > 0 &&
    (chatType === 'direct' || (selectedContacts.length >= 2 && groupName.trim().length > 0));

  // Handle chat creation
  const handleCreateChat = () => {
    if (!canCreate) return;

    const chatData = {
      type: chatType,
      participants: selectedContacts,
      name: chatType === 'group' ? groupName : null,
      avatar: chatType === 'group' && groupAvatar ? groupAvatar : null,
      firstMessage: firstMessage.trim() || null,
      createdAt: new Date().toISOString()
    };

    onCreateChat(chatData);
    handleClose();
  };

  // Handle modal close
  const handleClose = () => {
    setChatType('direct');
    setSelectedContacts([]);
    setGroupName('');
    setGroupAvatar('');
    setAvatarError('');
    setFirstMessage('');
    setSearchTerm('');
    onClose();
  };

  // Handle overlay click
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="new-chat-overlay" onClick={handleOverlayClick}>
      <div className="new-chat-modal" role="dialog" aria-modal="true" aria-labelledby="new-chat-title">
        <div className="new-chat-header">
          <h3 id="new-chat-title">{chatType === 'group' ? 'New Group' : 'New Message'}</h3>
          <button className="close-btn" onClick={handleClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="chat-type-selector">
          <div className="chat-type-tabs">
            <button
              className={`tab ${chatType === 'direct' ? 'active' : ''}`}
              onClick={() => handleTypeChange('direct')}
            >
              Direct Message
            </button>
            <button
              className={`tab ${chatType === 'group' ? 'active' : ''}`}
              onClick={() => handleTypeChange('group')}
            >
              Group Chat
            </button>
          </div>
        </div>

        {chatType === 'group' && (
          <div className="group-settings">
            <button
              type="button"
              className="group-avatar-picker"
              onClick={() => avatarInputRef.current?.click()}
              aria-label={groupAvatar ? 'Change group photo' : 'Add group photo'}
              title={groupAvatar ? 'Change group photo' : 'Add group photo'}
            >
              {groupAvatar ? (
                <img src={groupAvatar} alt="Group avatar preview" />
              ) : (
                <span aria-hidden="true">📷</span>
              )}
            </button>
            {groupAvatar && (
              <button type="button" className="group-avatar-remove" onClick={() => setGroupAvatar('')}>
                Remove
              </button>
            )}
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarPick}
              style={{ display: 'none' }}
              data-testid="group-avatar-input"
            />
            <input
              type="text"
              placeholder="Group name (required)"
              maxLength={50}
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="group-name-input"
            />
            {avatarError && <p className="group-avatar-error" role="alert">{avatarError}</p>}
          </div>
        )}

        <div className="contact-search">
          <input
            type="text"
            ref={searchInputRef}
            placeholder="Search contacts..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
            }}
            className="contact-search-input"
          />
        </div>

        <div className="selected-contacts">
          {selectedContacts.length > 0 && (
            <div className="selected-list">
              <h4>Selected ({selectedContacts.length}):</h4>
              <div className="selected-items">
                {selectedContacts.map(contact => (
                  <div key={contact.id} className="selected-contact">
                    <span>{contact.name}</span>
                    <button
                      onClick={() => handleContactSelect(contact)}
                      className="remove-btn"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="contact-list">
          {!searchTerm && recentContacts.length > 0 && (
            <div className="recent-contacts" aria-label="Recent contacts">
              <h4 className="recent-title">Recent</h4>
              <div className="recent-row">
                {recentContacts.map(contact => {
                  const isSelected = selectedContacts.some(c => c.id === contact.id);
                  return (
                    <button
                      type="button"
                      key={contact.id}
                      className={`recent-chip ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleContactSelect(contact)}
                      aria-pressed={isSelected}
                    >
                      <span className="recent-avatar">
                        {contact.avatar ? (
                          <img src={contact.avatar} alt="" />
                        ) : (
                          <span className="avatar-placeholder">{(contact.name || '?').charAt(0).toUpperCase()}</span>
                        )}
                        {isSelected && <span className="recent-check">✓</span>}
                      </span>
                      <span className="recent-name">{contact.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Loading contacts...</p>
            </div>
          ) : contacts.length > 0 ? (
            <div className="contacts">
              {contacts.map(contact => {
                const isSelected = selectedContacts.find(c => c.id === contact.id);
                return (
                  <div
                    key={contact.id}
                    className={`contact-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleContactSelect(contact)}
                  >
                    <div className="contact-avatar">
                      {contact.avatar ? (
                        <img src={contact.avatar} alt={contact.name} />
                      ) : (
                        <div className="avatar-placeholder">
                          {contact.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="contact-info">
                      <h4>{contact.name}</h4>
                      {contact.email && (
                        <p className="contact-email">{contact.email}</p>
                      )}
                      {contact.phone && (
                        <p className="contact-phone">{contact.phone}</p>
                      )}
                    </div>
                    <div className="contact-actions">
                      {isSelected ? (
                        <div className="selected-indicator">✓</div>
                      ) : (
                        <div className="select-indicator">+</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="no-contacts">
              <p>No contacts found</p>
              <span>{searchTerm ? 'Try a different name, email, or phone number' : 'Add contacts first, then start a conversation'}</span>
            </div>
          )}
        </div>

        <div className="first-message">
          <textarea
            value={firstMessage}
            onChange={(e) => setFirstMessage(e.target.value)}
            placeholder="Write a first message (optional)"
            maxLength={1000}
            rows={2}
            className="first-message-input"
          />
        </div>

        <div className="new-chat-footer">
          <button className="cancel-btn" onClick={handleClose}>
            Cancel
          </button>
          <button
            className="create-btn"
            onClick={handleCreateChat}
            disabled={!canCreate}
            title={chatType === 'group' && !canCreate ? 'Name the group and pick at least 2 people' : undefined}
          >
            {chatType === 'direct' ? 'Start Chat' : 'Create Group'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewChatModal;