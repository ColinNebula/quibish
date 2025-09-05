import React, { useState, useRef, useEffect } from 'react';
import './TwoFactorVerify.css';

const TwoFactorVerify = ({ 
  onVerify, 
  onCancel, 
  userId, 
  username,
  loading = false 
}) => {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [isBackupCode, setIsBackupCode] = useState(false);
  const [backupCode, setBackupCode] = useState('');
  const inputRefs = useRef([]);

  useEffect(() => {
    // Focus first input on mount
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const handleCodeChange = (index, value) => {
    if (value.length > 1) return; // Only allow single digit
    
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setError('');

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    let verificationCode;
    let isBackup = isBackupCode;

    if (isBackupCode) {
      if (!backupCode.trim()) {
        setError('Please enter a backup code');
        return;
      }
      verificationCode = backupCode.trim();
    } else {
      const fullCode = code.join('');
      if (fullCode.length !== 6) {
        setError('Please enter a complete 6-digit code');
        return;
      }
      verificationCode = fullCode;
    }

    try {
      await onVerify(verificationCode, isBackup);
    } catch (err) {
      setError(err.message || 'Verification failed. Please try again.');
    }
  };

  const toggleBackupCode = () => {
    setIsBackupCode(!isBackupCode);
    setError('');
    setCode(['', '', '', '', '', '']);
    setBackupCode('');
    
    // Focus appropriate input
    setTimeout(() => {
      if (isBackupCode) {
        inputRefs.current[0]?.focus();
      } else {
        document.getElementById('backup-code-input')?.focus();
      }
    }, 100);
  };

  return (
    <div className="two-factor-verify">
      <div className="two-factor-container">
        <div className="two-factor-header">
          <div className="two-factor-icon">🛡️</div>
          <h2>Two-Factor Authentication</h2>
          <p>Enter the verification code for <strong>{username}</strong></p>
        </div>

        <form onSubmit={handleSubmit} className="two-factor-form">
          {!isBackupCode ? (
            <div className="code-input-section">
              <p className="instruction">
                Enter the 6-digit code from your authenticator app
              </p>
              <div className="code-inputs">
                {code.map((digit, index) => (
                  <input
                    key={index}
                    ref={el => inputRefs.current[index] = el}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength="1"
                    value={digit}
                    onChange={(e) => handleCodeChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="code-input"
                    disabled={loading}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="backup-code-section">
              <p className="instruction">
                Enter one of your backup codes
              </p>
              <input
                id="backup-code-input"
                type="text"
                value={backupCode}
                onChange={(e) => setBackupCode(e.target.value.toUpperCase())}
                placeholder="XXXXXXXX"
                className="backup-code-input"
                disabled={loading}
                maxLength="8"
              />
            </div>
          )}

          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}

          <div className="form-actions">
            <button
              type="submit"
              className="verify-button"
              disabled={loading || (!isBackupCode && code.join('').length !== 6) || (isBackupCode && !backupCode.trim())}
            >
              {loading ? (
                <>
                  <span className="loading-spinner"></span>
                  Verifying...
                </>
              ) : (
                'Verify Code'
              )}
            </button>

            <button
              type="button"
              onClick={onCancel}
              className="cancel-button"
              disabled={loading}
            >
              Cancel
            </button>
          </div>

          <div className="alternative-options">
            <button
              type="button"
              onClick={toggleBackupCode}
              className="link-button"
              disabled={loading}
            >
              {isBackupCode ? (
                <>
                  <span className="icon">📱</span>
                  Use authenticator app instead
                </>
              ) : (
                <>
                  <span className="icon">🔑</span>
                  Use backup code instead
                </>
              )}
            </button>
          </div>
        </form>

        <div className="help-section">
          <details className="help-details">
            <summary>Need help?</summary>
            <div className="help-content">
              <ul>
                <li><strong>Authenticator App:</strong> Open your authenticator app (Google Authenticator, Authy, etc.) and enter the 6-digit code.</li>
                <li><strong>Backup Codes:</strong> Use one of the 8-character backup codes you saved when setting up 2FA.</li>
                <li><strong>Can't access codes?</strong> Contact support for account recovery.</li>
              </ul>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
};

export default TwoFactorVerify;