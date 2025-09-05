import React, { useState, useEffect } from 'react';
import './TwoFactorSettings.css';
import TwoFactorSetup from './TwoFactorSetup';
import userDataService from '../../services/userDataService';

const TwoFactorSettings = () => {
  const [twoFactorStatus, setTwoFactorStatus] = useState({
    enabled: false,
    method: 'totp',
    setupAt: null,
    lastUsed: null,
    unusedBackupCodes: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showSetup, setShowSetup] = useState(false);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [disableTwoFactorCode, setDisableTwoFactorCode] = useState('');
  const [disableLoading, setDisableLoading] = useState(false);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [backupCodes, setBackupCodes] = useState([]);
  const [backupCodesLoading, setBackupCodesLoading] = useState(false);

  useEffect(() => {
    loadTwoFactorStatus();
  }, []);

  const loadTwoFactorStatus = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await userDataService.api.getTwoFactorStatus();
      
      if (response.success) {
        setTwoFactorStatus(response);
      } else {
        throw new Error(response.error || 'Failed to load 2FA status');
      }
    } catch (err) {
      console.error('Load 2FA status error:', err);
      setError(err.message || 'Failed to load 2FA status');
    } finally {
      setLoading(false);
    }
  };

  const handleSetupComplete = async () => {
    setShowSetup(false);
    await loadTwoFactorStatus(); // Refresh status
  };

  const handleDisable = async (e) => {
    e.preventDefault();
    
    if (!disablePassword.trim()) {
      setError('Password is required to disable 2FA');
      return;
    }
    
    if (!disableTwoFactorCode.trim()) {
      setError('2FA code is required to disable 2FA');
      return;
    }

    try {
      setDisableLoading(true);
      setError('');
      
      const response = await userDataService.api.disableTwoFactor(
        disablePassword,
        disableTwoFactorCode
      );
      
      if (response.success) {
        setShowDisableConfirm(false);
        setDisablePassword('');
        setDisableTwoFactorCode('');
        await loadTwoFactorStatus(); // Refresh status
      } else {
        throw new Error(response.error || 'Failed to disable 2FA');
      }
    } catch (err) {
      console.error('Disable 2FA error:', err);
      setError(err.message || 'Failed to disable 2FA');
    } finally {
      setDisableLoading(false);
    }
  };

  const handleGenerateBackupCodes = async () => {
    try {
      setBackupCodesLoading(true);
      setError('');
      
      const response = await userDataService.api.generateBackupCodes();
      
      if (response.success) {
        setBackupCodes(response.backupCodes);
        setShowBackupCodes(true);
        await loadTwoFactorStatus(); // Refresh backup codes count
      } else {
        throw new Error(response.error || 'Failed to generate backup codes');
      }
    } catch (err) {
      console.error('Generate backup codes error:', err);
      setError(err.message || 'Failed to generate backup codes');
    } finally {
      setBackupCodesLoading(false);
    }
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

  const copyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n')).then(() => {
      // You could add a toast notification here
    });
  };

  if (loading) {
    return (
      <div className="two-factor-settings">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading 2FA settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="two-factor-settings">
      <div className="settings-header">
        <h3>Two-Factor Authentication</h3>
        <p>Add an extra layer of security to your account</p>
      </div>

      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}

      <div className="settings-content">
        {!twoFactorStatus.enabled ? (
          <div className="two-factor-disabled">
            <div className="status-card">
              <div className="status-icon">🔓</div>
              <div className="status-content">
                <h4>Two-Factor Authentication is Off</h4>
                <p>Protect your account by requiring a second form of authentication.</p>
              </div>
              <button 
                onClick={() => setShowSetup(true)}
                className="enable-button"
              >
                Enable 2FA
              </button>
            </div>

            <div className="benefits-section">
              <h4>Benefits of 2FA:</h4>
              <ul>
                <li>🛡️ Enhanced account security</li>
                <li>🔐 Protection against password breaches</li>
                <li>📱 Works with popular authenticator apps</li>
                <li>🔑 Backup codes for recovery</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="two-factor-enabled">
            <div className="status-card enabled">
              <div className="status-icon">🛡️</div>
              <div className="status-content">
                <h4>Two-Factor Authentication is On</h4>
                <p>Your account is protected with {twoFactorStatus.method.toUpperCase()}.</p>
                <div className="status-details">
                  {twoFactorStatus.setupAt && (
                    <p className="detail">
                      <strong>Enabled:</strong> {new Date(twoFactorStatus.setupAt).toLocaleDateString()}
                    </p>
                  )}
                  {twoFactorStatus.lastUsed && (
                    <p className="detail">
                      <strong>Last Used:</strong> {new Date(twoFactorStatus.lastUsed).toLocaleDateString()}
                    </p>
                  )}
                  <p className="detail">
                    <strong>Backup Codes:</strong> {twoFactorStatus.unusedBackupCodes} remaining
                  </p>
                </div>
              </div>
            </div>

            <div className="management-actions">
              <div className="action-group">
                <h4>Backup Codes</h4>
                <p>Generate new backup codes if you've lost your existing ones.</p>
                <button 
                  onClick={handleGenerateBackupCodes}
                  className="secondary-button"
                  disabled={backupCodesLoading}
                >
                  {backupCodesLoading ? (
                    <>
                      <span className="loading-spinner small"></span>
                      Generating...
                    </>
                  ) : (
                    'Generate New Backup Codes'
                  )}
                </button>
              </div>

              <div className="action-group">
                <h4>Disable 2FA</h4>
                <p>Remove two-factor authentication from your account.</p>
                <button 
                  onClick={() => setShowDisableConfirm(true)}
                  className="danger-button"
                >
                  Disable 2FA
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Setup Modal */}
      {showSetup && (
        <TwoFactorSetup
          onClose={() => setShowSetup(false)}
          onSetupComplete={handleSetupComplete}
        />
      )}

      {/* Disable Confirmation Modal */}
      {showDisableConfirm && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>Disable Two-Factor Authentication</h3>
              <button 
                onClick={() => setShowDisableConfirm(false)}
                className="close-button"
                disabled={disableLoading}
              >
                ×
              </button>
            </div>

            <div className="modal-content">
              <div className="warning-message">
                <span className="warning-icon">⚠️</span>
                <p>
                  <strong>Warning:</strong> Disabling 2FA will make your account less secure. 
                  You'll only need your password to log in.
                </p>
              </div>

              <form onSubmit={handleDisable} className="disable-form">
                <div className="form-group">
                  <label htmlFor="disable-password">Current Password</label>
                  <input
                    id="disable-password"
                    type="password"
                    value={disablePassword}
                    onChange={(e) => {
                      setDisablePassword(e.target.value);
                      setError('');
                    }}
                    placeholder="Enter your password"
                    disabled={disableLoading}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="disable-code">2FA Code</label>
                  <input
                    id="disable-code"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength="6"
                    value={disableTwoFactorCode}
                    onChange={(e) => {
                      setDisableTwoFactorCode(e.target.value);
                      setError('');
                    }}
                    placeholder="000000"
                    disabled={disableLoading}
                    required
                  />
                </div>

                <div className="form-actions">
                  <button 
                    type="button"
                    onClick={() => setShowDisableConfirm(false)}
                    className="cancel-button"
                    disabled={disableLoading}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="danger-button"
                    disabled={disableLoading || !disablePassword.trim() || !disableTwoFactorCode.trim()}
                  >
                    {disableLoading ? (
                      <>
                        <span className="loading-spinner small"></span>
                        Disabling...
                      </>
                    ) : (
                      'Disable 2FA'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Backup Codes Modal */}
      {showBackupCodes && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>New Backup Codes Generated</h3>
              <button 
                onClick={() => setShowBackupCodes(false)}
                className="close-button"
              >
                ×
              </button>
            </div>

            <div className="modal-content">
              <p>Save these backup codes in a secure location. Each code can only be used once.</p>
              
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
                    📥 Download
                  </button>
                  <button 
                    onClick={copyBackupCodes}
                    className="copy-button"
                  >
                    📋 Copy All
                  </button>
                </div>
              </div>

              <div className="warning-message">
                <span className="warning-icon">⚠️</span>
                <p><strong>Important:</strong> Your old backup codes are no longer valid.</p>
              </div>

              <button 
                onClick={() => setShowBackupCodes(false)}
                className="primary-button"
              >
                I've Saved These Codes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TwoFactorSettings;