import React, { useState, useEffect, useRef } from 'react';
import './ModernCallUI.css';

/**
 * Modern Call UI Component - WhatsApp/Telegram style
 * Supports both voice and video calls
 */
const ModernCallUI = ({
  callType = 'voice', // 'voice' or 'video'
  callState = 'connecting', // 'connecting', 'ringing', 'active', 'ended'
  caller = {},
  onEndCall,
  onToggleMute,
  onToggleVideo,
  onToggleSpeaker,
  isMuted = false,
  isVideoEnabled = true,
  isSpeakerOn = false,
  localStream = null,
  remoteStream = null,
  callDuration = 0,
  onMinimize
}) => {
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const controlsTimeoutRef = useRef(null);

  // Format call duration
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Set up video streams
  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Auto-hide controls in video calls
  useEffect(() => {
    if (callType === 'video' && callState === 'active') {
      const hideControls = () => {
        clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = setTimeout(() => {
          setShowControls(false);
        }, 3000);
      };

      hideControls();
      return () => clearTimeout(controlsTimeoutRef.current);
    }
  }, [callType, callState]);

  const handleMouseMove = () => {
    if (callType === 'video') {
      setShowControls(true);
      clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const getCallStateText = () => {
    switch (callState) {
      case 'connecting':
        return 'Connecting...';
      case 'ringing':
        return 'Ringing...';
      case 'active':
        return formatDuration(callDuration);
      case 'ended':
        return 'Call ended';
      default:
        return '';
    }
  };

  return (
    <div 
      className={`modern-call-ui ${callType} ${callState}`}
      onMouseMove={handleMouseMove}
      onTouchStart={() => setShowControls(true)}
    >
      {/* Video Container */}
      {callType === 'video' && (
        <div className="video-container">
          {/* Remote Video (full screen) */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="remote-video"
          />

          {/* Local Video (picture-in-picture) */}
          <div className="local-video-container">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="local-video"
            />
          </div>

          {/* No video placeholder */}
          {!remoteStream && (
            <div className="no-video-placeholder">
              <div className="caller-avatar-large">
                {caller.avatar ? (
                  <img src={caller.avatar} alt={caller.name} />
                ) : (
                  <div className="avatar-placeholder">
                    {caller.name?.charAt(0).toUpperCase() || '?'}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Voice Call UI */}
      {callType === 'voice' && (
        <div className="voice-call-container">
          <div className="caller-info-voice">
            <div className="caller-avatar-large">
              {caller.avatar ? (
                <img src={caller.avatar} alt={caller.name} />
              ) : (
                <div className="avatar-placeholder">
                  {caller.name?.charAt(0).toUpperCase() || '?'}
                </div>
              )}
            </div>
            
            {/* Animated rings for calling state */}
            {(callState === 'connecting' || callState === 'ringing') && (
              <div className="call-rings">
                <div className="ring ring-1"></div>
                <div className="ring ring-2"></div>
                <div className="ring ring-3"></div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Header - Always visible */}
      <div className={`call-header ${showControls ? 'visible' : 'hidden'}`}>
        <div className="call-info">
          <div className="caller-name">{caller.name || 'Unknown'}</div>
          <div className="call-status">{getCallStateText()}</div>
        </div>
        
        <div className="header-actions">
          {callType === 'video' && (
            <button
              className="header-btn fullscreen-btn"
              onClick={toggleFullscreen}
              title="Fullscreen"
            >
              {isFullscreen ? '⊡' : '⛶'}
            </button>
          )}
          
          <button
            className="header-btn minimize-btn"
            onClick={onMinimize}
            title="Minimize"
          >
            ➖
          </button>
        </div>
      </div>

      {/* Call Controls */}
      <div className={`call-controls ${showControls ? 'visible' : 'hidden'}`}>
        <div className="controls-row">
          {/* Mute Button */}
          <button
            className={`control-btn ${isMuted ? 'active' : ''}`}
            onClick={onToggleMute}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            <span className="btn-icon">{isMuted ? '🔇' : '🎤'}</span>
            <span className="btn-label">{isMuted ? 'Unmute' : 'Mute'}</span>
          </button>

          {/* Video Toggle (video calls only) */}
          {callType === 'video' && (
            <button
              className={`control-btn ${!isVideoEnabled ? 'active' : ''}`}
              onClick={onToggleVideo}
              title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
            >
              <span className="btn-icon">{isVideoEnabled ? '📹' : '📷'}</span>
              <span className="btn-label">{isVideoEnabled ? 'Camera On' : 'Camera Off'}</span>
            </button>
          )}

          {/* Speaker Button (voice calls only) */}
          {callType === 'voice' && (
            <button
              className={`control-btn ${isSpeakerOn ? 'active' : ''}`}
              onClick={onToggleSpeaker}
              title={isSpeakerOn ? 'Turn off speaker' : 'Turn on speaker'}
            >
              <span className="btn-icon">{isSpeakerOn ? '🔊' : '🔉'}</span>
              <span className="btn-label">{isSpeakerOn ? 'Speaker' : 'Earpiece'}</span>
            </button>
          )}

          {/* End Call Button */}
          <button
            className="control-btn end-call-btn"
            onClick={onEndCall}
            title="End call"
          >
            <span className="btn-icon">📞</span>
            <span className="btn-label">End Call</span>
          </button>
        </div>
      </div>

      {/* Connection Quality Indicator */}
      {callState === 'active' && (
        <div className="connection-quality">
          <div className="quality-indicator good">
            <span className="quality-dot"></span>
            <span className="quality-text">Good connection</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModernCallUI;
