import React, { useState, useEffect } from 'react';
import './NewChatModal.css';
import { contactService } from '../../services/contactService';

const NewChatModal = ({ isOpen, onClose, onCreateChat }) => {
  const [chatType, setChatType] = useState('direct');
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load contacts when modal opens
  useEffect(() => {
    if (isOpen) {
      loadContacts();
    }
  }, [isOpen]);

  const loadContacts = async () => {
    setLoading(true);
    try {
      const result = await contactService.getContacts({ search: searchTerm });
      setContacts(result);
    } catch (error) {
      console.error('Failed to load contacts:', error);
      setContacts([]);
    }
    setLoading(false);
  };

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

  // Handle chat creation
  const handleCreateChat = () => {
    if (selectedContacts.length === 0) {
      alert('Please select at least one contact');
      return;
    }

    if (chatType === 'group' && !groupName.trim()) {
      alert('Please enter a group name');
      return;
    }

    const chatData = {
      type: chatType,
      participants: selectedContacts,
      name: chatType === 'group' ? groupName : null,
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
      <div className="new-chat-modal">
        <div className="new-chat-header">
          <h3>Start New Chat</h3>
          <button className="close-btn" onClick={handleClose}>
            ×
          </button>
        </div>

        <div className="chat-type-selector">
          <div className="chat-type-tabs">
            <button
              className={`tab ${chatType === 'direct' ? 'active' : ''}`}
              onClick={() => setChatType('direct')}
            >
              Direct Message
            </button>
            <button
              className={`tab ${chatType === 'group' ? 'active' : ''}`}
              onClick={() => setChatType('group')}
            >
              Group Chat
            </button>
          </div>
        </div>

        {chatType === 'group' && (
          <div className="group-settings">
            <input
              type="text"
              placeholder="Enter group name..."
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="group-name-input"
            />
          </div>
        )}

        <div className="contact-search">
          <input
            type="text"
            placeholder="Search contacts..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              // Debounce search
              setTimeout(() => loadContacts(), 300);
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
              <span>Try adjusting your search or add some contacts first</span>
            </div>
          )}
        </div>

        <div className="new-chat-footer">
          <button className="cancel-btn" onClick={handleClose}>
            Cancel
          </button>
          <button
            className="create-btn"
            onClick={handleCreateChat}
            disabled={selectedContacts.length === 0}
          >
            {chatType === 'direct' ? 'Start Chat' : 'Create Group'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewChatModal;