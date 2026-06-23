/**
 * Enhanced Video Call Panel - Modern UI with Liquid Glass Effects
 * Clean, intuitive interface for video calling
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import enhancedVideoCallService from '../services/enhancedVideoCallService';
import videoFiltersService from '../services/videoFiltersService';
import liquidGlassEffects from '../utils/liquidGlassEffects';
import './VideoCallPanel-Enhanced.css';

const EnhancedVideoCallPanel = ({ 
  onClose, 
  callId, 
  participants = [],
  remoteUser = null 
}) => {
  // State management
  const [callState, setCallState] = useState({
    active: true,
    isMuted: false,
    isVideoOff: false,
    isScreenSharing: false,
    isRecording: false,
    quality: 'high',
    layout: 'grid'
  });

  const [callDuration, setCallDuration] = useState('00:00');
  const [showSettings, setShowSettings] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState('excellent');
  const [reactions, setReactions] = useState([]);
  const [initError, setInitError] = useState(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [useDemoMode, setUseDemoMode] = useState(false);

  // Refs
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const callTimerRef = useRef(null);

  // Initialize call
  useEffect(() => {
    const initializeCall = async () => {
      try {
        await enhancedVideoCallService.initialize();
        startCallTimer();
        hapticFeedback('success');
      } catch (error) {
        console.error('Failed to initialize video call:', error);
        setInitError(error.message);
      }
    };
    
    initializeCall();

    return () => {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
    };
  }, []);

  // Call timer
  const startCallTimer = useCallback(() => {
    let seconds = 0;
    callTimerRef.current = setInterval(() => {
      seconds++;
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      setCallDuration(
        `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
      );
    }, 1000);
  }, []);

  // Haptic feedback helper
  const hapticFeedback = useCallback((type = 'light') => {
    if (liquidGlassEffects?.haptic?.[type]) {
      liquidGlassEffects.haptic[type]();
    }
  }, []);

  // Show notification
  const showNotification = useCallback((message, type = 'info') => {
    window.showDynamicIslandNotification?.(message, {
      type,
      duration: 2000,
      icon: type === 'success' ? '✓' : type === 'error' ? '❌' : 'ℹ️'
    });
  }, []);

  // Control handlers
  const handleToggleMute = useCallback(() => {
    hapticFeedback('light');
    try {
      enhancedVideoCallService.toggleMute();
      setCallState(prev => ({ ...prev, isMuted: !prev.isMuted }));
      showNotification(callState.isMuted ? 'Microphone on' : 'Microphone off');
    } catch (error) {
      showNotification('Could not toggle microphone', 'error');
    }
  }, [callState.isMuted, hapticFeedback, showNotification]);

  const handleToggleVideo = useCallback(() => {
    hapticFeedback('light');
    enhancedVideoCallService.toggleVideo();
    setCallState(prev => ({ ...prev, isVideoOff: !prev.isVideoOff }));
    showNotification(callState.isVideoOff ? 'Camera on' : 'Camera off');
  }, [callState.isVideoOff, hapticFeedback, showNotification]);

  const handleScreenShare = useCallback(async () => {
    hapticFeedback('medium');
    try {
      if (callState.isScreenSharing) {
        await enhancedVideoCallService.stopScreenShare();
        showNotification('Screen sharing stopped');
      } else {
        await enhancedVideoCallService.startScreenShare();
        showNotification('Screen sharing started', 'success');
      }
      setCallState(prev => ({ ...prev, isScreenSharing: !prev.isScreenSharing }));
    } catch (error) {
      showNotification('Screen share failed', 'error');
    }
  }, [callState.isScreenSharing, hapticFeedback, showNotification]);

  const handleToggleRecording = useCallback(async () => {
    hapticFeedback('medium');
    try {
      if (callState.isRecording) {
        await enhancedVideoCallService.stopRecording();
        showNotification('Recording stopped');
      } else {
        await enhancedVideoCallService.startRecording();
        showNotification('Recording started', 'success');
      }
      setCallState(prev => ({ ...prev, isRecording: !prev.isRecording }));
    } catch (error) {
      showNotification('Recording failed', 'error');
    }
  }, [callState.isRecording, hapticFeedback, showNotification]);

  const handleEndCall = useCallback(() => {
    hapticFeedback('warning');
    if (window.confirm('End the call?')) {
      hapticFeedback('success');
      enhancedVideoCallService.endCall();
      if (callTimerRef.current) clearInterval(callTimerRef.current);
      onClose();
    }
  }, [hapticFeedback, onClose]);

  const handleUseDemoMode = useCallback(async () => {
    hapticFeedback('medium');
    try {
      enhancedVideoCallService.setDevelopmentMode(true);
      setUseDemoMode(true);
      setInitError(null);
      setShowErrorModal(false);
      showNotification('Demo mode enabled - using mock stream', 'success');
      startCallTimer();
    } catch (error) {
      showNotification('Failed to enable demo mode', 'error');
    }
  }, [hapticFeedback, showNotification]);

  const handleSendReaction = useCallback((emoji) => {
    hapticFeedback('light');
    const reaction = {
      id: Date.now(),
      emoji,
      timestamp: Date.now()
    };
    setReactions(prev => [...prev, reaction]);
    setTimeout(() => {
      setReactions(prev => prev.filter(r => r.id !== reaction.id));
    }, 2000);
  }, [hapticFeedback]);

  const handleQualityChange = useCallback((quality) => {
    hapticFeedback('light');
    enhancedVideoCallService.changeQuality(quality);
    setCallState(prev => ({ ...prev, quality }));
    showNotification(`Quality set to ${quality}`);
  }, [hapticFeedback, showNotification]);

  const handleToggleSettings = useCallback(() => {
    hapticFeedback('light');
    setShowSettings(prev => !prev);
  }, [hapticFeedback]);

  const handleToggleFilters = useCallback(() => {
    hapticFeedback('light');
    setShowFilters(prev => !prev);
  }, [hapticFeedback]);

  // Render
  if (initError && !useDemoMode) {
    return (
      <div className="video-call-wrapper">
        <div className="video-call-backdrop" onClick={onClose} />
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(20px)',
          padding: '40px',
          borderRadius: '20px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          zIndex: 9999,
          maxWidth: '500px',
          textAlign: 'center',
          color: 'white'
        }}>
          <h2 style={{ margin: '0 0 16px 0', fontSize: '24px' }}>⚠️ Device Not Found</h2>
          <p style={{ margin: '0 0 24px 0', color: 'rgba(255, 255, 255, 0.7)' }}>
            {initError}
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              onClick={handleUseDemoMode}
              style={{
                padding: '12px 24px',
                background: 'rgba(59, 130, 246, 0.3)',
                color: '#3b82f6',
                border: '1px solid #3b82f6',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.background = 'rgba(59, 130, 246, 0.5)'}
              onMouseLeave={(e) => e.target.style.background = 'rgba(59, 130, 246, 0.3)'}
            >
              📽️ Use Demo Mode
            </button>
            <button
              onClick={onClose}
              style={{
                padding: '12px 24px',
                background: 'rgba(239, 68, 68, 0.3)',
                color: '#ef4444',
                border: '1px solid #ef4444',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.background = 'rgba(239, 68, 68, 0.5)'}
              onMouseLeave={(e) => e.target.style.background = 'rgba(239, 68, 68, 0.3)'}
            >
              ✕ Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render
  return (
    <div className="video-call-wrapper">
      <div className="video-call-backdrop" onClick={() => {}} />
      
      <div className="video-call-container">
        {/* Header */}
        <div className="video-call-header">
          <div className="call-info">
            <div className="call-info-avatar">
              {remoteUser?.name?.[0] || '👤'}
            </div>
            <div className="call-info-text">
              <h3>{remoteUser?.name || 'User'}</h3>
              <p>{connectionQuality} connection</p>
            </div>
          </div>

          <div className="call-duration">
            <span className="call-duration-dot" />
            {callDuration}
          </div>

          <div className="header-actions">
            <button
              className={`header-btn ${showSettings ? 'active' : ''}`}
              onClick={handleToggleSettings}
              title="Settings"
            >
              ⚙️
            </button>
            <button
              className={`header-btn ${showFilters ? 'active' : ''}`}
              onClick={handleToggleFilters}
              title="Filters"
            >
              ✨
            </button>
          </div>
        </div>

        {/* Video Grid */}
        <div className={`video-grid ${callState.layout === 'single' ? 'single' : ''}`}>
          {/* Remote Video */}
          {!callState.isVideoOff && (
            <div className="video-tile">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
              />
              <div className="video-tile-label">
                <span className={`status-indicator ${callState.isMuted ? 'muted' : ''}`} />
                {remoteUser?.name || 'Remote User'}
              </div>
            </div>
          )}

          {/* Local Video */}
          <div className="video-tile">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
            />
            <div className="video-tile-label">
              <span className={`status-indicator ${callState.isMuted ? 'muted' : ''}`} />
              You
            </div>
          </div>
        </div>

        {/* Reactions */}
        {reactions.length > 0 && (
          <div className="reaction-container">
            {reactions.map(reaction => (
              <div key={reaction.id} className="reaction-emoji">
                {reaction.emoji}
              </div>
            ))}
          </div>
        )}

        {/* Control Bar */}
        <div className="video-controls-bar">
          {/* Secondary Controls */}
          <div className="control-group secondary">
            <button
              className={`control-btn ${callState.quality === 'high' ? 'active' : ''}`}
              onClick={() => handleQualityChange('high')}
              title="Video Quality"
            >
              📊
            </button>
          </div>

          {/* Primary Controls */}
          <div className="control-group primary">
            <button
              className={`control-btn ${callState.isMuted ? 'active' : ''}`}
              onClick={handleToggleMute}
              title={callState.isMuted ? 'Unmute' : 'Mute'}
            >
              {callState.isMuted ? '🔇' : '🎤'}
            </button>

            <button
              className={`control-btn ${callState.isVideoOff ? 'active' : ''}`}
              onClick={handleToggleVideo}
              title={callState.isVideoOff ? 'Turn On Camera' : 'Turn Off Camera'}
            >
              {callState.isVideoOff ? '📷❌' : '📹'}
            </button>

            <button
              className={`control-btn ${callState.isScreenSharing ? 'active' : ''}`}
              onClick={handleScreenShare}
              title="Share Screen"
            >
              🖥️
            </button>

            <button
              className={`control-btn ${callState.isRecording ? 'active' : ''}`}
              onClick={handleToggleRecording}
              title="Record"
            >
              {callState.isRecording ? '⏹️' : '⏺️'}
            </button>

            {/* Reactions Menu */}
            <div className="reactions-menu" style={{ position: 'relative' }}>
              <button
                className="control-btn"
                title="Send Reaction"
                onClick={(e) => {
                  const buttons = e.currentTarget.parentElement.querySelectorAll('.reaction-option');
                  buttons.forEach(b => b.style.display = 
                    b.style.display === 'flex' ? 'none' : 'flex'
                  );
                }}
              >
                ✋
              </button>
              <div style={{
                position: 'absolute',
                bottom: '100%',
                right: 0,
                display: 'flex',
                gap: '4px',
                marginBottom: '8px',
                flexWrap: 'wrap',
                justifyContent: 'flex-end',
                width: '200px'
              }}>
                {['👍', '❤️', '😂', '👏', '🎉', '✨'].map(emoji => (
                  <button
                    key={emoji}
                    className="reaction-option"
                    style={{
                      display: 'none',
                      width: '36px',
                      height: '36px',
                      fontSize: '20px',
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    onClick={() => handleSendReaction(emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Danger Controls */}
          <div className="control-group danger">
            <button
              className="control-btn danger"
              onClick={handleEndCall}
              title="End Call"
            >
              📞
            </button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="side-panel">
            <div className="panel-header">
              <h3>Settings</h3>
              <button
                className="panel-close-btn"
                onClick={() => setShowSettings(false)}
              >
                ✕
              </button>
            </div>
            <div className="panel-content">
              {/* Video Quality */}
              <div className="panel-section">
                <div className="panel-section-title">Video Quality</div>
                <div className="settings-dropdown">
                  {['low', 'medium', 'high', 'ultra'].map(quality => (
                    <button
                      key={quality}
                      className={`settings-item ${callState.quality === quality ? 'active' : ''}`}
                      onClick={() => handleQualityChange(quality)}
                    >
                      {quality.charAt(0).toUpperCase() + quality.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Audio Settings */}
              <div className="panel-section">
                <div className="panel-section-title">Audio</div>
                <div className="panel-option">
                  <label>Noise Cancellation</label>
                  <div className="toggle-switch active">
                    <div className="toggle-switch-knob" />
                  </div>
                </div>
                <div className="panel-option">
                  <label>Auto Gain</label>
                  <div className="toggle-switch active">
                    <div className="toggle-switch-knob" />
                  </div>
                </div>
              </div>

              {/* Video Settings */}
              <div className="panel-section">
                <div className="panel-section-title">Video</div>
                <div className="panel-option">
                  <label>Background Blur</label>
                  <div className="toggle-switch">
                    <div className="toggle-switch-knob" />
                  </div>
                </div>
                <div className="panel-option">
                  <label>Lighting Adjustment</label>
                  <div className="toggle-switch active">
                    <div className="toggle-switch-knob" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters Panel */}
        {showFilters && (
          <div className="side-panel">
            <div className="panel-header">
              <h3>Filters</h3>
              <button
                className="panel-close-btn"
                onClick={() => setShowFilters(false)}
              >
                ✕
              </button>
            </div>
            <div className="panel-content">
              <div className="panel-section">
                <div className="panel-section-title">Presets</div>
                <div className="settings-dropdown">
                  {['None', 'Portrait', 'Studio', 'Dim', 'Cool'].map(preset => (
                    <button
                      key={preset}
                      className="settings-item"
                      onClick={() => showNotification(`${preset} filter applied`)}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="panel-section">
                <div className="panel-section-title">Effects</div>
                <div className="settings-dropdown">
                  {['None', 'Blur', 'Bokeh', 'Virtual Background', 'Green Screen'].map(effect => (
                    <button
                      key={effect}
                      className="settings-item"
                      onClick={() => showNotification(`${effect} applied`)}
                    >
                      {effect}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedVideoCallPanel;
