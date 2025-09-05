import React, { useRef, useState, useEffect } from 'react';
import './ProMessages.css';
import './EmptyStateStyles.css';
import './EnhancedAnimations.css';

const EmptyState = ({ onNewChat }) => {
  const fileInputRef = useRef(null);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState('');
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Add a small delay to ensure smooth animation
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 100);
    
    const handleMouseMove = (e) => {
      setMousePosition({ 
        x: (e.clientX / window.innerWidth) * 100, 
        y: (e.clientY / window.innerHeight) * 100 
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  const triggerImport = () => fileInputRef.current?.click();

  const handleFileChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setImporting(true);
    setImportMessage('Importing...');

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      // Accept either an array of names or an array of conversation objects
      if (Array.isArray(parsed)) {
        parsed.forEach(item => {
          if (typeof item === 'string') {
            onNewChat && onNewChat(item);
          } else if (item && typeof item === 'object') {
            // Prefer name property if present
            const name = item.name || item.title || 'Imported Conversation';
            onNewChat && onNewChat(name);
          }
        });
        setImportMessage('Import complete');
      } else {
        setImportMessage('Invalid file format. Expected an array.');
      }
    } catch (err) {
      console.error('Import failed', err);
      setImportMessage('Import failed: invalid JSON');
    }

    setTimeout(() => {
      setImporting(false);
      setImportMessage('');
    }, 1400);
  };

  return (
    <div 
      className={`modern-empty-state ${isVisible ? 'visible' : ''}`} 
      role="region" 
      aria-label="Welcome"
      style={{
        '--mouse-x': `${mousePosition.x}%`,
        '--mouse-y': `${mousePosition.y}%`,
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        style={{ display: 'none' }}
        onChange={handleFileChange}
        aria-hidden="true"
      />
      
      {/* Background Pattern */}
      <div className="empty-state-bg-pattern">
        <div className="pattern-grid"></div>
        <div className="pattern-dots"></div>
        <div className="interactive-gradient"></div>
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
        <div className="gradient-orb orb-4"></div>
        <div className="gradient-orb orb-5"></div>
      </div>

      {/* Main Content */}
      <div className="empty-state-content">
        <div className="hero-section">
          {/* Modern Icon */}
          <div className="modern-icon-container">
            <div className="icon-bg-circle">
              <svg className="main-icon" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 16h24c2.2 0 4 1.8 4 4v16c0 2.2-1.8 4-4 4h-6l-6 8-6-8h-6c-2.2 0-4-1.8-4-4V20c0-2.2 1.8-4 4-4z" 
                      fill="url(#iconGradient)" stroke="url(#iconStroke)" strokeWidth="2"/>
                <circle cx="26" cy="28" r="2" fill="currentColor" className="message-dot"/>
                <circle cx="32" cy="28" r="2" fill="currentColor" className="message-dot"/>
                <circle cx="38" cy="28" r="2" fill="currentColor" className="message-dot"/>
                <defs>
                  <linearGradient id="iconGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#667eea"/>
                    <stop offset="50%" stopColor="#764ba2"/>
                    <stop offset="100%" stopColor="#f093fb"/>
                  </linearGradient>
                  <linearGradient id="iconStroke" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#4f46e5"/>
                    <stop offset="100%" stopColor="#06b6d4"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div className="icon-pulse-ring"></div>
            <div className="icon-secondary-ring"></div>
          </div>

          {/* Heading */}
          <div className="hero-text">
            <h1 className="modern-title">
              <span className="title-line">Welcome to</span>
              <span className="title-brand">
                <span className="letter">Q</span>
                <span className="letter">u</span>
                <span className="letter">i</span>
                <span className="letter">b</span>
                <span className="letter">i</span>
                <span className="letter">C</span>
                <span className="letter">h</span>
                <span className="letter">a</span>
                <span className="letter">t</span>
              </span>
            </h1>
            <p className="modern-subtitle">
              Connect, collaborate, and communicate with your team in real-time. 
              Start meaningful conversations that drive results.
            </p>
            
            {/* Statistics */}
            <div className="hero-stats">
              <div className="stat-item">
                <span className="stat-number">99.9%</span>
                <span className="stat-label">Uptime</span>
              </div>
              <div className="stat-divider"></div>
              <div className="stat-item">
                <span className="stat-number">&lt; 50ms</span>
                <span className="stat-label">Latency</span>
              </div>
              <div className="stat-divider"></div>
              <div className="stat-item">
                <span className="stat-number">256-bit</span>
                <span className="stat-label">Encryption</span>
              </div>
            </div>
          </div>

          {/* Primary Actions */}
          <div className="primary-actions">
            <button
              className="modern-btn modern-btn-primary"
              onClick={() => onNewChat && onNewChat()}
              onKeyDown={(e) => { if (e.key === 'Enter') onNewChat && onNewChat(); }}
              aria-label="Start a new chat"
            >
              <svg className="btn-icon" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"/>
              </svg>
              New Conversation
            </button>
            
            <button
              className="modern-btn modern-btn-secondary"
              onClick={() => onNewChat && onNewChat('Team Discussion')}
              aria-label="Join team discussion"
            >
              <svg className="btn-icon" viewBox="0 0 20 20" fill="currentColor">
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"/>
              </svg>
              Join Team
            </button>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="features-grid">
          <div className="feature-card" data-feature="speed">
            <div className="feature-icon-wrapper">
              <div className="feature-icon-bg"></div>
              <svg className="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="feature-title">Lightning Fast</h3>
            <p className="feature-description">Experience real-time messaging with zero lag and instant delivery</p>
            <div className="feature-stats">
              <span className="stat-badge">&lt; 10ms</span>
            </div>
          </div>

          <div className="feature-card" data-feature="security">
            <div className="feature-icon-wrapper">
              <div className="feature-icon-bg"></div>
              <svg className="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="feature-title">Secure & Private</h3>
            <p className="feature-description">End-to-end encryption protects every conversation</p>
            <div className="feature-stats">
              <span className="stat-badge">AES-256</span>
            </div>
          </div>

          <div className="feature-card" data-feature="collaboration">
            <div className="feature-icon-wrapper">
              <div className="feature-icon-bg"></div>
              <svg className="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="feature-title">Team Focused</h3>
            <p className="feature-description">Built for modern teams with advanced collaboration tools</p>
            <div className="feature-stats">
              <span className="stat-badge">∞ Teams</span>
            </div>
          </div>

          <div className="feature-card" data-feature="analytics">
            <div className="feature-icon-wrapper">
              <div className="feature-icon-bg"></div>
              <svg className="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="feature-title">Smart Analytics</h3>
            <p className="feature-description">Track engagement and optimize team communication</p>
            <div className="feature-stats">
              <span className="stat-badge">Real-time</span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="quick-actions">
          <div className="quick-actions-header">
            <h3>Quick Start</h3>
            <p>Get started in seconds with these common actions</p>
          </div>
          
          <div className="quick-actions-grid">
            <button 
              className="quick-action-item"
              onClick={() => onNewChat && onNewChat('Example Team Chat')}
            >
              <div className="quick-action-icon">📝</div>
              <span>Create Example</span>
            </button>
            
            <button 
              className="quick-action-item"
              onClick={triggerImport}
              disabled={importing}
            >
              <div className="quick-action-icon">📁</div>
              <span>{importing ? 'Importing...' : 'Import Demo'}</span>
            </button>
            
            <button 
              className="quick-action-item"
              onClick={() => onNewChat && onNewChat('Project Alpha')}
            >
              <div className="quick-action-icon">🚀</div>
              <span>Project Chat</span>
            </button>
            
            <button 
              className="quick-action-item"
              onClick={() => onNewChat && onNewChat('Daily Standup')}
            >
              <div className="quick-action-icon">⚡</div>
              <span>Daily Standup</span>
            </button>
          </div>
        </div>

        {/* Status Message */}
        {importMessage && (
          <div className="import-status-modern" role="status" aria-live="polite">
            <div className="status-icon">
              {importMessage.includes('complete') ? '✅' : 
               importMessage.includes('failed') ? '❌' : '⏳'}
            </div>
            <span>{importMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmptyState;
