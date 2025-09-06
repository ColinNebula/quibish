import React, { useState, useEffect } from 'react';
import userDataService from '../../services/userDataService';
import './SecurityDashboard.css';

const SecurityDashboard = ({ onEnable2FA, onClose }) => {
  const [securityScore, setSecurityScore] = useState(0);
  const [twoFactorStatus, setTwoFactorStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSecurityStatus();
  }, []);

  const loadSecurityStatus = async () => {
    try {
      const response = await userDataService.api.getTwoFactorStatus();
      setTwoFactorStatus(response);
      calculateSecurityScore(response);
    } catch (error) {
      console.error('Failed to load security status:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateSecurityScore = (twoFAStatus) => {
    let score = 30; // Base score for having an account
    
    // Password strength (assuming secure password exists)
    score += 20;
    
    // Email verification
    score += 20;
    
    // Two-factor authentication
    if (twoFAStatus?.enabled) {
      score += 30;
    }
    
    setSecurityScore(Math.min(score, 100));
  };

  const getScoreColor = (score) => {
    if (score >= 80) return '#10b981'; // Green
    if (score >= 60) return '#f59e0b'; // Yellow
    return '#ef4444'; // Red
  };

  const getScoreLabel = (score) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Poor';
  };

  const securityRecommendations = [
    {
      id: 'enable-2fa',
      title: 'Enable Two-Factor Authentication',
      description: 'Add an extra layer of security to your account',
      impact: 'High',
      completed: twoFactorStatus?.enabled,
      action: () => onEnable2FA && onEnable2FA(),
      icon: '🛡️',
      points: '+30 points'
    },
    {
      id: 'strong-password',
      title: 'Use a Strong Password',
      description: 'Use a unique, complex password for your account',
      impact: 'High',
      completed: true, // Assume completed for now
      icon: '🔐',
      points: '+20 points'
    },
    {
      id: 'backup-codes',
      title: 'Save Backup Codes',
      description: 'Download and securely store your backup codes',
      impact: 'Medium',
      completed: twoFactorStatus?.enabled && twoFactorStatus?.unusedBackupCodes > 0,
      icon: '🔑',
      points: '+10 points'
    },
    {
      id: 'regular-review',
      title: 'Review Account Activity',
      description: 'Regularly check your account for suspicious activity',
      impact: 'Medium',
      completed: false,
      icon: '👁️',
      points: '+10 points'
    }
  ];

  if (loading) {
    return (
      <div className="security-dashboard">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading security status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="security-dashboard">
      <div className="dashboard-header">
        <div className="header-content">
          <h2>Account Security</h2>
          <p>Keep your account safe and secure</p>
        </div>
        {onClose && (
          <button className="close-button" onClick={onClose}>×</button>
        )}
      </div>

      {/* Security Score */}
      <div className="security-score-card">
        <div className="score-visual">
          <div className="score-circle">
            <svg width="120" height="120" viewBox="0 0 120 120">
              <circle
                cx="60"
                cy="60"
                r="50"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="8"
              />
              <circle
                cx="60"
                cy="60"
                r="50"
                fill="none"
                stroke={getScoreColor(securityScore)}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${securityScore * 3.14} 314`}
                transform="rotate(-90 60 60)"
                className="score-progress"
              />
            </svg>
            <div className="score-content">
              <div className="score-number">{securityScore}</div>
              <div className="score-label">{getScoreLabel(securityScore)}</div>
            </div>
          </div>
        </div>
        
        <div className="score-details">
          <h3>Security Score</h3>
          <p className="score-description">
            {securityScore >= 80 
              ? "Your account has excellent security! Keep up the good work."
              : securityScore >= 60
              ? "Your account security is good, but can be improved."
              : "Your account needs better protection. Consider enabling additional security features."
            }
          </p>
          
          {!twoFactorStatus?.enabled && (
            <div className="security-alert">
              <span className="alert-icon">⚠️</span>
              <div className="alert-content">
                <strong>Two-Factor Authentication is disabled</strong>
                <p>Enable 2FA to significantly improve your account security.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Security Recommendations */}
      <div className="recommendations-section">
        <h3>Security Recommendations</h3>
        <div className="recommendations-list">
          {securityRecommendations.map((rec) => (
            <div key={rec.id} className={`recommendation-card ${rec.completed ? 'completed' : ''}`}>
              <div className="rec-icon">{rec.icon}</div>
              <div className="rec-content">
                <div className="rec-header">
                  <h4>{rec.title}</h4>
                  <div className="rec-badges">
                    <span className={`impact-badge ${rec.impact.toLowerCase()}`}>
                      {rec.impact} Impact
                    </span>
                    {!rec.completed && (
                      <span className="points-badge">{rec.points}</span>
                    )}
                  </div>
                </div>
                <p>{rec.description}</p>
                
                {rec.completed ? (
                  <div className="completed-indicator">
                    <span className="check-icon">✅</span>
                    Completed
                  </div>
                ) : rec.action ? (
                  <button className="action-button" onClick={rec.action}>
                    {rec.id === 'enable-2fa' ? 'Enable Now' : 'Learn More'}
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      {!twoFactorStatus?.enabled && (
        <div className="quick-actions">
          <div className="action-card primary">
            <div className="action-icon">🚀</div>
            <div className="action-content">
              <h4>Boost Your Security Score by 30 Points!</h4>
              <p>Enable two-factor authentication in just 2 minutes</p>
              <button className="primary-action-btn" onClick={() => onEnable2FA && onEnable2FA()}>
                Enable 2FA Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecurityDashboard;