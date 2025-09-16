import React, { useState, useEffect } from 'react';
import './NativeContactPicker.css';

const NativeContactPicker = ({ isOpen, onClose, onContactsSelected, multiple = true }) => {
  const [contacts, setContacts] = useState([]);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasPermission, setHasPermission] = useState(null);
  const [supportInfo, setSupportInfo] = useState(null);

  // Check browser support and permissions
  useEffect(() => {
    if (isOpen) {
      checkContactsSupport();
    }
  }, [isOpen]);

  // Filter contacts based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredContacts(contacts);
    } else {
      const filtered = contacts.filter(contact => 
        contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (contact.email && contact.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (contact.phone && contact.phone.includes(searchTerm))
      );
      setFilteredContacts(filtered);
    }
  }, [contacts, searchTerm]);

  // Check if Contacts API is supported
  const checkContactsSupport = async () => {
    setIsLoading(true);
    setError(null);

    // Check for Contact Picker API support
    if ('contacts' in navigator && 'ContactsManager' in window) {
      try {
        const supported = await navigator.contacts.getProperties();
        setSupportInfo({
          supported: true,
          properties: supported,
          api: 'ContactsManager'
        });
        await requestContactsPermission();
      } catch (err) {
        console.error('ContactsManager error:', err);
        checkFallbackOptions();
      }
    } else if ('contacts' in navigator) {
      // Contact Picker API (older version)
      try {
        setSupportInfo({
          supported: true,
          properties: ['name', 'email', 'tel'],
          api: 'ContactPicker'
        });
        await requestContactsPermission();
      } catch (err) {
        console.error('ContactPicker error:', err);
        checkFallbackOptions();
      }
    } else {
      checkFallbackOptions();
    }
  };

  // Check for fallback options
  const checkFallbackOptions = () => {
    setSupportInfo({
      supported: false,
      reason: 'Contact access is not supported in this browser',
      api: 'none'
    });
    
    // Load fallback/demo contacts
    loadFallbackContacts();
    setIsLoading(false);
  };

  // Request permission to access contacts
  const requestContactsPermission = async () => {
    try {
      if (supportInfo?.api === 'ContactsManager') {
        // Use newer ContactsManager API
        const contacts = await navigator.contacts.select(
          ['name', 'email', 'tel'],
          { multiple: multiple }
        );
        
        const formattedContacts = contacts.map((contact, index) => ({
          id: `native_${index}`,
          name: contact.name?.[0] || 'Unknown',
          email: contact.email?.[0] || '',
          phone: contact.tel?.[0] || '',
          source: 'device'
        }));
        
        setContacts(formattedContacts);
        setHasPermission(true);
      } else {
        // Use older Contact Picker API
        const contacts = await navigator.contacts.select(
          ['name', 'email', 'tel'],
          { multiple: multiple }
        );
        
        const formattedContacts = contacts.map((contact, index) => ({
          id: `picker_${index}`,
          name: contact.name || 'Unknown',
          email: contact.email || '',
          phone: contact.tel || '',
          source: 'device'
        }));
        
        setContacts(formattedContacts);
        setHasPermission(true);
      }
    } catch (err) {
      console.error('Contact permission error:', err);
      
      if (err.name === 'NotAllowedError') {
        setError('Contact access permission denied. Please enable contact access.');
        setHasPermission(false);
      } else if (err.name === 'NotSupportedError') {
        setError('Contact access is not supported on this device.');
        setHasPermission(false);
      } else {
        setError('Failed to access contacts. Using manual entry mode.');
        setHasPermission(false);
      }
      
      // Load fallback contacts
      loadFallbackContacts();
    } finally {
      setIsLoading(false);
    }
  };

  // Load demo/fallback contacts
  const loadFallbackContacts = () => {
    const fallbackContacts = [
      {
        id: 'fallback_1',
        name: 'Manual Entry',
        email: '',
        phone: '',
        source: 'manual',
        isManualEntry: true
      }
    ];
    
    // Add any previously saved contacts from localStorage
    try {
      const savedContacts = JSON.parse(localStorage.getItem('app_contacts') || '[]');
      fallbackContacts.push(...savedContacts.map(contact => ({
        ...contact,
        source: 'saved'
      })));
    } catch (err) {
      console.error('Error loading saved contacts:', err);
    }
    
    setContacts(fallbackContacts);
    setHasPermission(false); // Not real permission, but allows UI to show
  };

  // Handle contact selection
  const handleContactSelect = (contact) => {
    if (contact.isManualEntry) {
      // Handle manual entry
      const name = prompt('Enter contact name:');
      const email = prompt('Enter email (optional):') || '';
      const phone = prompt('Enter phone number (optional):') || '';
      
      if (name) {
        const manualContact = {
          id: `manual_${Date.now()}`,
          name,
          email,
          phone,
          source: 'manual'
        };
        
        if (multiple) {
          setSelectedContacts(prev => [...prev, manualContact]);
        } else {
          setSelectedContacts([manualContact]);
          handleSubmit([manualContact]);
        }
      }
      return;
    }

    if (multiple) {
      setSelectedContacts(prev => {
        const isSelected = prev.find(c => c.id === contact.id);
        if (isSelected) {
          return prev.filter(c => c.id !== contact.id);
        } else {
          return [...prev, contact];
        }
      });
    } else {
      setSelectedContacts([contact]);
      handleSubmit([contact]);
    }
  };

  // Submit selected contacts
  const handleSubmit = (contactsToSubmit = selectedContacts) => {
    if (contactsToSubmit.length > 0 && onContactsSelected) {
      onContactsSelected(contactsToSubmit);
    }
    onClose();
  };

  // Handle overlay click
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Check if contact is selected
  const isContactSelected = (contact) => {
    return selectedContacts.find(c => c.id === contact.id);
  };

  if (!isOpen) return null;

  return (
    <div className="contact-picker-overlay" onClick={handleOverlayClick}>
      <div className="contact-picker-modal">
        <div className="contact-picker-header">
          <h3>
            {multiple ? '📞 Select Contacts' : '📞 Select Contact'}
          </h3>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        {isLoading && (
          <div className="contact-picker-loading">
            <div className="loading-spinner"></div>
            <p>Accessing contacts...</p>
          </div>
        )}

        {error && (
          <div className="contact-picker-error">
            <div className="error-icon">⚠️</div>
            <p>{error}</p>
            <button className="retry-btn" onClick={checkContactsSupport}>
              Try Again
            </button>
          </div>
        )}

        {!isLoading && !error && (
          <>
            <div className="contact-picker-search">
              <input
                type="text"
                placeholder="Search contacts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>

            <div className="contact-picker-content">
              {filteredContacts.length > 0 ? (
                <div className="contacts-list">
                  {filteredContacts.map((contact) => (
                    <div
                      key={contact.id}
                      className={`contact-item ${
                        isContactSelected(contact) ? 'selected' : ''
                      } ${contact.isManualEntry ? 'manual-entry' : ''}`}
                      onClick={() => handleContactSelect(contact)}
                    >
                      <div className="contact-avatar">
                        {contact.isManualEntry ? '➕' : contact.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="contact-info">
                        <div className="contact-name">
                          {contact.name}
                          {contact.source === 'device' && (
                            <span className="source-badge">Device</span>
                          )}
                          {contact.source === 'saved' && (
                            <span className="source-badge saved">Saved</span>
                          )}
                        </div>
                        {contact.email && (
                          <div className="contact-email">{contact.email}</div>
                        )}
                        {contact.phone && (
                          <div className="contact-phone">{contact.phone}</div>
                        )}
                      </div>
                      {multiple && !contact.isManualEntry && (
                        <div className="contact-checkbox">
                          {isContactSelected(contact) ? '✓' : ''}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-contacts">
                  <div className="no-contacts-icon">📞</div>
                  <h4>No contacts found</h4>
                  <p>
                    {searchTerm 
                      ? `No contacts match "${searchTerm}"`
                      : 'No contacts available'}
                  </p>
                </div>
              )}
            </div>

            {multiple && selectedContacts.length > 0 && (
              <div className="contact-picker-footer">
                <div className="selected-count">
                  {selectedContacts.length} contact{selectedContacts.length !== 1 ? 's' : ''} selected
                </div>
                <div className="footer-actions">
                  <button 
                    className="cancel-btn" 
                    onClick={() => setSelectedContacts([])}
                  >
                    Clear
                  </button>
                  <button className="submit-btn" onClick={() => handleSubmit()}>
                    Add Selected
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default NativeContactPicker;