import React, { useState } from 'react';
import { deviceUtils } from '../../services/nativeDeviceFeaturesService';
import { mobileUtils } from '../../services/mobileInteractionService';
import './NativeContactPicker.css';

const NativeContactPicker = ({ onContactSelect, onClose, multiple = false }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [isSupported, setIsSupported] = useState(deviceUtils.isSupported('contacts'));

  const handlePickContacts = async () => {
    setIsLoading(true);
    setError(null);
    mobileUtils.haptic('light');

    try {
      const contacts = await deviceUtils.pickContacts({
        multiple: multiple,
        properties: ['name', 'email', 'tel']
      });

      console.log('✅ Contacts selected:', contacts);
      
      if (contacts && contacts.length > 0) {
        setSelectedContacts(contacts);
        onContactSelect(multiple ? contacts : contacts[0]);
        
        if (!multiple) {
          onClose();
        }
      }
    } catch (err) {
      console.error('❌ Contact selection failed:', err);
      
      if (err.name === 'AbortError') {
        setError('Contact selection was cancelled');
      } else {
        setError('Failed to access contacts. Please check permissions.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleFallbackContactInput = () => {
    // Fallback for browsers that don't support Contact Picker API
    const name = prompt('Enter contact name:');
    const phone = prompt('Enter phone number:');
    const email = prompt('Enter email (optional):');

    if (name && phone) {
      const contact = {
        name: [name],
        tel: [phone],
        email: email ? [email] : []
      };

      onContactSelect(contact);
      onClose();
    }
  };

  const formatContact = (contact) => {
    const name = contact.name?.[0] || 'Unknown';
    const phone = contact.tel?.[0] || '';
    const email = contact.email?.[0] || '';
    
    return { name, phone, email };
  };

  const handleConfirmSelection = () => {
    if (selectedContacts.length > 0) {
      onContactSelect(selectedContacts);
      onClose();
    }
  };

  const removeContact = (index) => {
    setSelectedContacts(prev => prev.filter((_, i) => i !== index));
    mobileUtils.haptic('light');
  };

  return (
    <div className="native-contact-picker-overlay">
      <div className="native-contact-picker">
        {/* Header */}
        <div className="contact-picker-header">
          <h3>{multiple ? 'Select Contacts' : 'Select Contact'}</h3>
          <button 
            className="close-btn touch-target touch-ripple"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="contact-picker-content">
          {isSupported ? (
            <>
              <div className="contact-picker-info">
                <div className="info-icon">📞</div>
                <p>
                  {multiple 
                    ? 'Select multiple contacts from your device contacts'
                    : 'Select a contact from your device contacts'
                  }
                </p>
              </div>

              {error && (
                <div className="contact-picker-error">
                  <p>{error}</p>
                  <button 
                    className="retry-btn touch-target"
                    onClick={handlePickContacts}
                  >
                    Try Again
                  </button>
                </div>
              )}

              {/* Selected Contacts */}
              {selectedContacts.length > 0 && (
                <div className="selected-contacts">
                  <h4>Selected Contacts ({selectedContacts.length})</h4>
                  <div className="contact-list">
                    {selectedContacts.map((contact, index) => {
                      const { name, phone, email } = formatContact(contact);
                      return (
                        <div key={index} className="contact-item">
                          <div className="contact-avatar">
                            {name.charAt(0).toUpperCase()}
                          </div>
                          <div className="contact-info">
                            <div className="contact-name">{name}</div>
                            {phone && <div className="contact-phone">{phone}</div>}
                            {email && <div className="contact-email">{email}</div>}
                          </div>
                          <button 
                            className="remove-contact-btn touch-target"
                            onClick={() => removeContact(index)}
                            aria-label="Remove contact"
                          >
                            ✕
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="contact-picker-actions">
                <button 
                  className="pick-contacts-btn touch-target touch-ripple haptic-medium"
                  onClick={handlePickContacts}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <div className="loading-spinner small"></div>
                      Loading...
                    </>
                  ) : (
                    <>
                      📱 {multiple ? 'Add Contacts' : 'Pick Contact'}
                    </>
                  )}
                </button>

                {multiple && selectedContacts.length > 0 && (
                  <button 
                    className="confirm-btn touch-target touch-ripple"
                    onClick={handleConfirmSelection}
                  >
                    Confirm Selection ({selectedContacts.length})
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="contact-picker-info">
                <div className="info-icon">⚠️</div>
                <p>
                  Contact Picker is not supported on this device.
                  You can manually enter contact information.
                </p>
              </div>

              <div className="contact-picker-actions">
                <button 
                  className="manual-input-btn touch-target touch-ripple"
                  onClick={handleFallbackContactInput}
                >
                  ✏️ Enter Contact Manually
                </button>
              </div>
            </>
          )}
        </div>

        {/* Features Info */}
        <div className="contact-picker-footer">
          <small>
            {isSupported 
              ? 'Contacts are accessed securely through your device\'s native contact picker'
              : 'Manual entry allows you to share contact information'
            }
          </small>
        </div>
      </div>
    </div>
  );
};

export default NativeContactPicker;