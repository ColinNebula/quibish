import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import './TwoFactorSetup.css';
import userDataService from '../../services/userDataService';

const TwoFactorSetup = ({ onClose, onSetupComplete }) => {
  const [step, setStep] = useState(1); // 1: Setup, 2: Verify, 3: Backup Codes
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [manualEntryKey, setManualEntryKey] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    initializeSetup();
  }, []);

  const initializeSetup = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await userDataService.api.setupTwoFactor();
      
      if (response.success) {
        setQrCodeUrl(response.qrCode);
        setSecret(response.secret);
        setManualEntryKey(response.manualEntryKey);
      } else {
        throw new Error(response.error || 'Failed to initialize 2FA setup');
      }
    } catch (err) {
      console.error('2FA setup initialization error:', err);
      setError(err.message || 'Failed to initialize 2FA setup');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySetup = async (e) => {
    e.preventDefault();
    
    if (!verificationCode.trim()) {
      setError('Please enter the verification code');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const response = await userDataService.api.verifyTwoFactorSetup(verificationCode.trim());
      
      if (response.success) {
        setBackupCodes(response.backupCodes);
        setStep(3);
      } else {
        throw new Error(response.error || 'Verification failed');
      }
    } catch (err) {
      console.error('2FA verification error:', err);
      setError(err.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = () => {
    onSetupComplete();
    onClose();
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      // You could add a toast notification here
    });
  };

  const downloadBackupCodes = () => {
    const content = `Quibish 2FA Backup Codes\n\nGenerated: ${new Date().toLocaleDateString()}\n\nBackup Codes:\n${backupCodes.join('\n')}\n\nImportant:\n- Each code can only be used once\n- Keep these codes in a safe place\n- Generate new codes if you lose these`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'quibish-2fa-backup-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading && step === 1) {
    return (
      <div className="two-factor-setup-overlay">
        <div className="two-factor-setup-container">
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Setting up Two-Factor Authentication...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="two-factor-setup-overlay">
      <div className="two-factor-setup-container">
        <div className="setup-header">
          <h2>Enable Two-Factor Authentication</h2>
          <button onClick={onClose} className="close-button" disabled={loading}>×</button>
        </div>

        {step === 1 && (
          <div className="setup-step">
            <div className="step-indicator">
              <span className="step active">1</span>
              <span className="step">2</span>
              <span className="step">3</span>
            </div>

            <h3>Step 1: Install Authenticator App</h3>
            <p>Download and install an authenticator app on your phone:</p>
            
            <div className="app-recommendations">
              <div className="app-option">
                <span className="app-icon">📱</span>
                <div>
                  <strong>Google Authenticator</strong>
                  <p>Free, simple, and reliable</p>
                </div>
              </div>
              <div className="app-option">
                <span className="app-icon">🔐</span>
                <div>
                  <strong>Authy</strong>
                  <p>Cross-device sync and backup</p>
                </div>
              </div>
              <div className="app-option">
                <span className="app-icon">🛡️</span>
                <div>
                  <strong>Microsoft Authenticator</strong>
                  <p>Integration with Microsoft services</p>
                </div>
              </div>
            </div>

            <button 
              onClick={() => setStep(2)} 
              className="next-button"
              disabled={loading}
            >
              I have an authenticator app
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="setup-step">
            <div className="step-indicator">
              <span className="step completed">✓</span>
              <span className="step active">2</span>
              <span className="step">3</span>
            </div>

            <h3>Step 2: Scan QR Code</h3>
            <p>Scan this QR code with your authenticator app:</p>

            <div className="qr-code-section">
              {qrCodeUrl && (
                <div className="qr-code-container">
                  <QRCodeSVG value={qrCodeUrl} size={200} />
                </div>
              )}
              
              <div className="manual-entry">
                <p>Can't scan? Enter this code manually:</p>
                <div className="manual-key">
                  <code>{manualEntryKey}</code>
                  <button 
                    onClick={() => copyToClipboard(manualEntryKey)}
                    className="copy-button"
                    title="Copy to clipboard"
                  >
                    📋
                  </button>
                </div>
              </div>
            </div>

            <form onSubmit={handleVerifySetup} className="verification-form">
              <h4>Enter the 6-digit code from your app:</h4>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength="6"
                value={verificationCode}
                onChange={(e) => {
                  setVerificationCode(e.target.value);
                  setError('');
                }}
                placeholder="000000"
                className="verification-input"
                disabled={loading}
              />

              {error && (
                <div className="error-message">
                  <span className="error-icon">⚠️</span>
                  {error}
                </div>
              )}

              <div className="form-actions">
                <button 
                  type="button" 
                  onClick={() => setStep(1)}
                  className="back-button"
                  disabled={loading}
                >
                  Back
                </button>
                <button 
                  type="submit" 
                  className="verify-button"
                  disabled={loading || verificationCode.length !== 6}
                >
                  {loading ? (
                    <>
                      <span className="loading-spinner small"></span>
                      Verifying...
                    </>
                  ) : (
                    'Verify & Enable'
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {step === 3 && (
          <div className="setup-step">
            <div className="step-indicator">
              <span className="step completed">✓</span>
              <span className="step completed">✓</span>
              <span className="step active">3</span>
            </div>

            <div className="success-message">
              <span className="success-icon">🎉</span>
              <h3>2FA Successfully Enabled!</h3>
              <p>Your account is now protected with two-factor authentication.</p>
            </div>

            <div className="backup-codes-section">
              <h4>Save Your Backup Codes</h4>
              <p>These codes can be used to access your account if you lose your phone:</p>
              
              <div className="backup-codes-container">
                <div className="backup-codes-grid">
                  {backupCodes.map((code, index) => (
                    <div key={index} className="backup-code">
                      <code>{code}</code>
                    </div>
                  ))}
                </div>
                
                <div className="backup-codes-actions">
                  <button 
                    onClick={downloadBackupCodes}
                    className="download-button"
                  >
                    📥 Download Codes
                  </button>
                  <button 
                    onClick={() => copyToClipboard(backupCodes.join('\n'))}
                    className="copy-button"
                  >
                    📋 Copy All
                  </button>
                </div>
              </div>

              <div className="warning-message">
                <span className="warning-icon">⚠️</span>
                <p><strong>Important:</strong> Save these backup codes in a secure location. Each code can only be used once.</p>
              </div>
            </div>

            <button 
              onClick={handleComplete}
              className="complete-button"
            >
              Complete Setup
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TwoFactorSetup;