import React, { useState, useEffect } from 'react';
import encryptionService from '../../services/encryptionService';
import './EncryptionSettings.css';

const EncryptionSettings = ({ isOpen, onClose, currentUser }) => {
  const [encryptionStatus, setEncryptionStatus] = useState(null);
  const [keyFingerprint, setKeyFingerprint] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [isInitializing, setIsInitializing] = useState(false);
  const [showPublicKey, setShowPublicKey] = useState(false);

  useEffect(() => {
    if (isOpen && currentUser) {
      loadEncryptionStatus();
    }
  }, [isOpen, currentUser]);

  const loadEncryptionStatus = async () => {
    try {
      const status = encryptionService.getStatus();
      setEncryptionStatus(status);

      if (status.isInitialized) {
        // Get fingerprint
        const fingerprint = await encryptionService.generateKeyFingerprint();
        setKeyFingerprint(fingerprint);

        // Get public key for sharing
        const pubKey = await encryptionService.getPublicKeyForSharing();
        setPublicKey(pubKey);
      }
    } catch (error) {
      console.error('Failed to load encryption status:', error);
    }
  };

  const initializeEncryption = async () => {
    setIsInitializing(true);
    try {
      const success = await encryptionService.initialize(currentUser.id);
      if (success) {
        await loadEncryptionStatus();
        alert('✅ End-to-end encryption has been enabled for your account!');
      } else {
        alert('❌ Failed to initialize encryption. Please try again.');
      }
    } catch (error) {
      console.error('Failed to initialize encryption:', error);
      alert('❌ Failed to initialize encryption. Please try again.');
    } finally {
      setIsInitializing(false);
    }
  };

  const copyPublicKey = () => {
    navigator.clipboard.writeText(publicKey);
    alert('📋 Public key copied to clipboard! Share this with contacts to enable encrypted messaging.');
  };

  const copyFingerprint = () => {
    navigator.clipboard.writeText(keyFingerprint);
    alert('📋 Key fingerprint copied to clipboard!');
  };

  const regenerateKeys = async () => {
    if (window.confirm('⚠️ Are you sure? Regenerating keys will prevent you from reading old encrypted messages.')) {
      setIsInitializing(true);
      try {
        // Clear existing keys
        encryptionService.clearEncryptionData();
        
        // Generate new keys
        const success = await encryptionService.initialize(currentUser.id);
        if (success) {
          await loadEncryptionStatus();
          alert('✅ New encryption keys generated successfully!');
        }
      } catch (error) {
        console.error('Failed to regenerate keys:', error);
        alert('❌ Failed to regenerate keys. Please try again.');
      } finally {
        setIsInitializing(false);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="encryption-settings-overlay">
      <div className="encryption-settings-modal">
        <div className="encryption-settings-header">
          <h2>🔒 End-to-End Encryption</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="encryption-settings-content">
          {!encryptionStatus?.isInitialized ? (
            <div className="encryption-setup">
              <div className="encryption-info">
                <h3>🛡️ Secure Your Messages</h3>
                <p>Enable end-to-end encryption to ensure only you and your contacts can read your messages.</p>
                
                <div className="encryption-benefits">
                  <div className="benefit-item">
                    <span className="benefit-icon">🔐</span>
                    <span>Messages encrypted on your device</span>
                  </div>
                  <div className="benefit-item">
                    <span className="benefit-icon">🚫</span>
                    <span>Server cannot read your messages</span>
                  </div>
                  <div className="benefit-item">
                    <span className="benefit-icon">✅</span>
                    <span>Only recipients can decrypt</span>
                  </div>
                </div>
              </div>

              <button 
                className="enable-encryption-btn"
                onClick={initializeEncryption}
                disabled={isInitializing}
              >
                {isInitializing ? '🔄 Generating Keys...' : '🔒 Enable Encryption'}
              </button>
            </div>
          ) : (
            <div className="encryption-active">
              <div className="encryption-status">
                <div className="status-indicator">
                  <span className="status-icon">✅</span>
                  <span className="status-text">End-to-end encryption is enabled</span>
                </div>
              </div>

              <div className="encryption-details">
                <div className="detail-section">
                  <h4>🔑 Your Key Fingerprint</h4>
                  <p className="detail-description">
                    Share this with contacts to verify your identity:
                  </p>
                  <div className="fingerprint-display">
                    <code className="fingerprint">{keyFingerprint}</code>
                    <button className="copy-btn" onClick={copyFingerprint}>📋</button>
                  </div>
                </div>

                <div className="detail-section">
                  <h4>📤 Your Public Key</h4>
                  <p className="detail-description">
                    Share this with contacts to enable encrypted messaging:
                  </p>
                  <div className="public-key-section">
                    <button 
                      className="toggle-key-btn"
                      onClick={() => setShowPublicKey(!showPublicKey)}
                    >
                      {showPublicKey ? '🙈 Hide' : '👁️ Show'} Public Key
                    </button>
                    {showPublicKey && (
                      <div className="public-key-display">
                        <textarea 
                          className="public-key-text"
                          value={publicKey}
                          readOnly
                          rows={6}
                        />
                        <button className="copy-btn" onClick={copyPublicKey}>
                          📋 Copy Public Key
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="detail-section">
                  <h4>⚙️ Key Management</h4>
                  <div className="key-actions">
                    <button 
                      className="regenerate-btn"
                      onClick={regenerateKeys}
                      disabled={isInitializing}
                    >
                      {isInitializing ? '🔄 Generating...' : '🔄 Regenerate Keys'}
                    </button>
                  </div>
                  <p className="warning-text">
                    ⚠️ Regenerating keys will prevent you from reading old encrypted messages.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="encryption-settings-footer">
          <div className="security-notice">
            <p>🔒 Your private keys never leave your device and are stored securely in your browser.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EncryptionSettings;