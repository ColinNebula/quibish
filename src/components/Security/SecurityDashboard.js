import React, { useState, useEffect } from 'react';
import { securityService } from '../../services/securityService';
import './SecurityDashboard.css';

const SecurityDashboard = ({ isOpen, onClose, user }) => {
  const [securityStatus, setSecurityStatus] = useState({});
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [activeSessions, setActiveSessions] = useState([]);
  const [securityLogs, setSecurityLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadSecurityData();
    }
  }, [isOpen]);

  const loadSecurityData = async () => {
    setLoading(true);
    try {
      // Get security status
      const status = securityService.getSecurityStatus();
      setSecurityStatus(status);

      // Load user security settings
      await loadUserSecuritySettings();
      await loadActiveSessions();
      await loadSecurityLogs();
    } catch (error) {
      console.error('Error loading security data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserSecuritySettings = async () => {
    try {
      const response = await fetch('/api/users/security', {
        headers: {
          'Authorization': `Bearer ${securityService.getSecureToken()}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTwoFactorEnabled(data.twoFactorAuth?.enabled || false);
      }
    } catch (error) {
      console.error('Error loading security settings:', error);
    }
  };

  const loadActiveSessions = async () => {
    try {
      const response = await fetch('/api/users/sessions', {
        headers: {
          'Authorization': `Bearer ${securityService.getSecureToken()}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setActiveSessions(data.sessions || []);
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
      // Mock data for development
      setActiveSessions([
        {
          id: '1',
          device: 'Chrome on Windows',
          location: 'New York, US',
          lastActive: new Date(Date.now() - 300000).toISOString(),
          current: true
        }
      ]);
    }
  };

  const loadSecurityLogs = async () => {
    try {
      const response = await fetch('/api/users/security-logs', {
        headers: {
          'Authorization': `Bearer ${securityService.getSecureToken()}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSecurityLogs(data.logs || []);
      }
    } catch (error) {
      console.error('Error loading security logs:', error);
      // Show recent logs from security service
      setSecurityLogs(securityService.auditLog.slice(-10));
    }
  };

  const handleToggle2FA = async () => {
    try {
      const response = await fetch('/api/auth/2fa/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${securityService.getSecureToken()}`
        },
        body: JSON.stringify({ enabled: !twoFactorEnabled })
      });

      if (response.ok) {
        setTwoFactorEnabled(!twoFactorEnabled);
        securityService.logSecurityEvent('2fa_toggled', { 
          enabled: !twoFactorEnabled 
        });
      } else {
        alert('Failed to update two-factor authentication');
      }
    } catch (error) {
      console.error('Error toggling 2FA:', error);
      alert('An error occurred while updating security settings');
    }
  };

  const handleTerminateSession = async (sessionId) => {
    try {
      const response = await fetch(`/api/users/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${securityService.getSecureToken()}`
        }
      });

      if (response.ok) {
        setActiveSessions(prev => prev.filter(s => s.id !== sessionId));
        securityService.logSecurityEvent('session_terminated', { sessionId });
      } else {
        alert('Failed to terminate session');
      }
    } catch (error) {
      console.error('Error terminating session:', error);
      alert('An error occurred while terminating the session');
    }
  };

  const getSecurityScore = () => {
    let score = 0;
    if (twoFactorEnabled) score += 30;
    if (securityStatus.encryptionEnabled) score += 25;
    if (securityStatus.tokenSecured) score += 20;
    if (securityStatus.threatsDetected === 0) score += 25;
    return Math.min(score, 100);
  };

  const getSecurityLevel = (score) => {
    if (score >= 90) return { level: 'Excellent', color: '#10b981', icon: '🛡️' };
    if (score >= 70) return { level: 'Good', color: '#3b82f6', icon: '🔒' };
    if (score >= 50) return { level: 'Fair', color: '#f59e0b', icon: '⚠️' };
    return { level: 'Poor', color: '#ef4444', icon: '🚨' };
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const securityScore = getSecurityScore();
  const securityLevel = getSecurityLevel(securityScore);

  return (
    <div className="security-dashboard-overlay" onClick={handleOverlayClick}>
      <div className="security-dashboard-modal">
        <div className="security-dashboard-header">
          <h3>🛡️ Security Dashboard</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="security-dashboard-content">
          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Loading security information...</p>
            </div>
          ) : (
            <>
              {/* Security Score */}
              <div className="security-score-section">
                <div className="security-score-card">
                  <div className="score-visual">
                    <div 
                      className="score-circle"
                      style={{ '--score': `${securityScore}%`, '--color': securityLevel.color }}
                    >
                      <span className="score-number">{securityScore}</span>
                      <span className="score-icon">{securityLevel.icon}</span>
                    </div>
                  </div>
                  <div className="score-details">
                    <h4>Security Score</h4>
                    <p className="security-level" style={{ color: securityLevel.color }}>
                      {securityLevel.level}
                    </p>
                    <p className="score-description">
                      Your account security is {securityLevel.level.toLowerCase()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Security Features */}
              <div className="security-features-section">
                <h4>Security Features</h4>
                <div className="security-features-grid">
                  <div className="security-feature">
                    <div className="feature-icon">🔐</div>
                    <div className="feature-details">
                      <h5>Two-Factor Authentication</h5>
                      <p>{twoFactorEnabled ? 'Enabled' : 'Disabled'}</p>
                      <button 
                        className={`toggle-btn ${twoFactorEnabled ? 'enabled' : 'disabled'}`}
                        onClick={handleToggle2FA}
                      >
                        {twoFactorEnabled ? 'Disable' : 'Enable'}
                      </button>
                    </div>
                  </div>

                  <div className="security-feature">
                    <div className="feature-icon">🔒</div>
                    <div className="feature-details">
                      <h5>End-to-End Encryption</h5>
                      <p>{securityStatus.encryptionEnabled ? 'Active' : 'Inactive'}</p>
                      <span className="status-badge enabled">Always On</span>
                    </div>
                  </div>

                  <div className="security-feature">
                    <div className="feature-icon">🛡️</div>
                    <div className="feature-details">
                      <h5>Secure Sessions</h5>
                      <p>{securityStatus.tokenSecured ? 'Protected' : 'Basic'}</p>
                      <span className="status-badge enabled">Active</span>
                    </div>
                  </div>

                  <div className="security-feature">
                    <div className="feature-icon">🚨</div>
                    <div className="feature-details">
                      <h5>Threat Detection</h5>
                      <p>{securityStatus.threatsDetected} threats detected</p>
                      <span className={`status-badge ${securityStatus.threatsDetected === 0 ? 'enabled' : 'warning'}`}>
                        {securityStatus.threatsDetected === 0 ? 'All Clear' : 'Alert'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Active Sessions */}
              <div className="active-sessions-section">
                <h4>Active Sessions</h4>
                <div className="sessions-list">
                  {activeSessions.map((session) => (
                    <div key={session.id} className="session-item">
                      <div className="session-info">
                        <div className="session-device">
                          <span className="device-icon">💻</span>
                          <span className="device-name">{session.device}</span>
                          {session.current && <span className="current-badge">Current</span>}
                        </div>
                        <div className="session-details">
                          <span className="session-location">📍 {session.location}</span>
                          <span className="session-time">
                            Last active: {formatDate(session.lastActive)}
                          </span>
                        </div>
                      </div>
                      {!session.current && (
                        <button 
                          className="terminate-btn"
                          onClick={() => handleTerminateSession(session.id)}
                        >
                          Terminate
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Security Logs */}
              <div className="security-logs-section">
                <h4>Recent Security Activity</h4>
                <div className="logs-list">
                  {securityLogs.slice(-5).map((log, index) => (
                    <div key={index} className="log-item">
                      <div className="log-time">{formatDate(log.timestamp)}</div>
                      <div className="log-event">{log.event}</div>
                      <div className="log-details">
                        {log.details && typeof log.details === 'object' 
                          ? Object.keys(log.details).slice(0, 2).join(', ')
                          : 'Security event logged'
                        }
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Security Recommendations */}
              <div className="security-recommendations-section">
                <h4>Security Recommendations</h4>
                <div className="recommendations-list">
                  {!twoFactorEnabled && (
                    <div className="recommendation-item">
                      <span className="rec-icon">⚠️</span>
                      <span className="rec-text">Enable two-factor authentication for better security</span>
                    </div>
                  )}
                  {securityStatus.threatsDetected > 0 && (
                    <div className="recommendation-item">
                      <span className="rec-icon">🚨</span>
                      <span className="rec-text">Review and address detected security threats</span>
                    </div>
                  )}
                  <div className="recommendation-item">
                    <span className="rec-icon">🔄</span>
                    <span className="rec-text">Regularly update your password</span>
                  </div>
                  <div className="recommendation-item">
                    <span className="rec-icon">📱</span>
                    <span className="rec-text">Keep your devices and browsers updated</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SecurityDashboard;