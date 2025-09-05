import React, { useState, useEffect, useRef, memo } from 'react';
import './VideoCall.css';

/**
 * VideoCall component
 * Displays a video or audio call interface with remote and local streams
 * 
 * @param {Object} props
 * @param {Object} props.callState - The state of the call
 * @param {boolean} props.callState.active - Whether the call is active
 * @param {Object} props.callState.withUser - The user being called
 * @param {boolean} props.callState.minimized - Whether the call UI is minimized
 * @param {boolean} props.callState.audioOnly - Whether the call is audio-only (voice call)
 * @param {Function} props.onEndCall - Function to handle ending the call
 * @param {Function} props.onToggleMinimize - Function to toggle minimized state
 */
// Memoize the component to prevent re-renders when parent components update
const VideoCall = memo(({ callState, onEndCall, onToggleMinimize }) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState('connecting'); // connecting, connected, failed
  
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const callTimerRef = useRef(null);
  
  // Extract values from callState
  const { active, withUser, minimized, audioOnly } = callState || {};
  
  // Mock user data for demonstration
  const userAvatar = withUser?.avatar || 'https://via.placeholder.com/100';
  const userName = withUser?.name || 'Unknown User';
  
  // Start timer when connection is established
  useEffect(() => {
    if (connectionStatus === 'connected') {
      callTimerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    
    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
    };
  }, [connectionStatus]);
  
  // For demonstration purposes - simulate connection after 3 seconds
  useEffect(() => {
    if (active && connectionStatus === 'connecting') {
      const timer = setTimeout(() => {
        setConnectionStatus('connected');
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [active, connectionStatus]);
  
  // Reset state when call ends and set initial state based on call type
  useEffect(() => {
    if (!active) {
      setIsMuted(false);
      setIsVideoOff(false);
      setCallDuration(0);
      setConnectionStatus('connecting');
    } else {
      // Always set video off for audio-only calls and prevent it from being turned on
      if (audioOnly) {
        setIsVideoOff(true);
      }
    }
  }, [active, audioOnly]);
  
  // Only run component rendering if call is active
  if (!callState.active) return null;
  
  // Format call duration as MM:SS
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };
  
  // Toggle mute state
  const toggleMute = () => {
    setIsMuted(!isMuted);
    // In real implementation: toggle audio tracks
  };
  
  // Toggle video state (disabled in audio-only mode)
  const toggleVideo = () => {
    if (audioOnly) return; // Don't allow toggling video in audio-only mode
    setIsVideoOff(!isVideoOff);
    // In real implementation: toggle video tracks
  };
  
  return (
    <div className={`video-call-container ${minimized ? 'minimized' : 'full'} ${audioOnly ? 'audio-only' : ''}`}>
      <div className="video-call-header">
        <div className="video-call-title">
          {audioOnly ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" 
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 10L19.5528 7.72361C20.2177 7.39116 21 7.87465 21 8.61803V15.382C21 16.1253 20.2177 16.6088 19.5528 16.2764L15 14M5 20H13C14.1046 20 15 19.1046 15 18V6C15 4.89543 14.1046 4 13 4H5C3.89543 4 3 4.89543 3 6V18C3 19.1046 3.89543 20 5 20Z" 
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
          {userName}
        </div>
        {connectionStatus === 'connected' && (
          <div className="video-call-timer">{formatDuration(callDuration)}</div>
        )}
        <div className="video-call-actions">
          <button 
            className="video-call-action" 
            onClick={onToggleMinimize}
            title={minimized ? "Expand" : "Minimize"}
          >
            {minimized ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 14H10V20M20 10H14V4M14 10L21 3M3 21L10 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 3H5C3.89543 3 3 3.89543 3 5V8M21 8V5C21 3.89543 20.1046 3 19 3H16M16 21H19C20.1046 21 21 20.1046 21 19V16M3 16V19C3 20.1046 3.89543 21 5 21H8" 
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        </div>
      </div>
      
      <div className="video-call-streams">
        {/* Always show placeholder for audio-only calls, or when video is off or still connecting */}
        {(audioOnly || isVideoOff || connectionStatus === 'connecting') ? (
          <div className="video-call-placeholder">
            <img className="video-call-avatar" src={userAvatar} alt={userName} />
            <div className="video-call-status">{userName}</div>
            {connectionStatus === 'connecting' ? (
              <div className="video-call-connecting">
                Connecting
                <span className="connecting-dots">
                  <span className="connecting-dot"></span>
                  <span className="connecting-dot"></span>
                  <span className="connecting-dot"></span>
                </span>
              </div>
            ) : audioOnly ? (
              <>
                <div className="audio-visualization">
                  <div className="audio-bar"></div>
                  <div className="audio-bar"></div>
                  <div className="audio-bar"></div>
                  <div className="audio-bar"></div>
                  <div className="audio-bar"></div>
                </div>
                <div className="video-call-connecting">Voice call in progress</div>
              </>
            ) : (
              <div className="video-call-connecting">Video turned off</div>
            )}
          </div>
        ) : (
          /* Remote video stream would be displayed here in a real implementation */
          <div className="video-call-remote-stream" ref={remoteVideoRef}></div>
        )}
        
        {/* Don't show local stream preview for audio-only calls */}
        {!audioOnly && (
          <div 
            className="video-call-local-stream" 
            ref={localVideoRef}
            style={{ 
              background: '#1e293b', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: 'white',
              fontSize: minimized ? '8px' : '12px'
            }}
          >
            {isVideoOff ? (
              <div style={{ textAlign: 'center', padding: '5px' }}>
                <div style={{ 
                  width: minimized ? '30px' : '50px', 
                  height: minimized ? '30px' : '50px',
                  borderRadius: '50%',
                  background: '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 5px'
                }}>
                  <svg width={minimized ? "16" : "24"} height={minimized ? "16" : "24"} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" 
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                {!minimized && <div>You</div>}
              </div>
            ) : (
              // In a real implementation, this would be your video stream
              <div>Your camera</div>
            )}
          </div>
        )}
      </div>
      
      {/* Call controls */}
      <div className="video-call-controls">
        <button 
          className={`video-call-control-btn mute ${isMuted ? 'active' : ''}`}
          onClick={toggleMute}
          title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5.58579 15.0001L3.87868 16.7072C2.70711 15.5356 2 13.8787 2 12.0001C2 10.1215 2.70711 8.46459 3.87868 7.29302L5.58579 9.00013M18.4142 9.00013L20.1213 7.29302C21.2929 8.46459 22 10.1215 22 12.0001C22 13.8787 21.2929 15.5356 20.1213 16.7072L18.4142 15.0001M16 6.5L8 17.5" 
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M9.5 6.5V11L14.5 12V17.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 7C8 4.79086 9.79086 3 12 3V3C14.2091 3 16 4.79086 16 7V15C16 17.2091 14.2091 19 12 19V19C9.79086 19 8 17.2091 8 15V7Z" 
                stroke="currentColor" strokeWidth="2" />
              <path d="M5 12C5 15.866 8.13401 19 12 19M12 19C15.866 19 19 15.866 19 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M12 19V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          )}
        </button>
        
        {/* Only show video toggle button in video calls */}
        {!audioOnly && (
          <button 
            className={`video-call-control-btn video-off ${isVideoOff ? 'active' : ''}`}
            onClick={toggleVideo}
            title={isVideoOff ? "Turn on camera" : "Turn off camera"}
          >
            {isVideoOff ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 8.68861V15.3114C3 16.7943 4.20557 17.9999 5.68851 17.9999H14.3115C15.7944 17.9999 17 16.7943 17 15.3114V8.68861C17 7.20567 15.7944 6.0001 14.3115 6.0001H5.68851C4.20557 6.0001 3 7.20567 3 8.68861Z" 
                  stroke="currentColor" strokeWidth="2" />
                <path d="M17 10.0001L20.6343 7.36791C20.8732 7.20746 21.2 7.37558 21.2 7.66818V16.3321C21.2 16.6247 20.8732 16.7928 20.6343 16.6324L17 14.0001" 
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M3 3L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 8.68861V15.3114C3 16.7943 4.20557 17.9999 5.68851 17.9999H14.3115C15.7944 17.9999 17 16.7943 17 15.3114V8.68861C17 7.20567 15.7944 6.0001 14.3115 6.0001H5.68851C4.20557 6.0001 3 7.20567 3 8.68861Z" 
                  stroke="currentColor" strokeWidth="2" />
                <path d="M17 10.0001L20.6343 7.36791C20.8732 7.20746 21.2 7.37558 21.2 7.66818V16.3321C21.2 16.6247 20.8732 16.7928 20.6343 16.6324L17 14.0001" 
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            )}
          </button>
        )}
        
        <button 
          className="video-call-control-btn end-call"
          onClick={onEndCall}
          title="End call"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22 12C22 10.6868 21.7413 9.38647 21.2388 8.1731C20.7362 6.95996 19.9997 5.85742 19.0711 4.92896C18.1425 4.00024 17.0401 3.26367 15.8268 2.76123C14.6136 2.25854 13.3132 2 12 2C10.6868 2 9.38647 2.25854 8.1731 2.76123C6.95996 3.26367 5.85742 4.00024 4.92896 4.92896C3.26367 6.59424 2 9.0218 2 12M3.29289 18.7071L7.5 14.5M7.5 14.5V18M7.5 14.5H4M20.7071 18.7071L16.5 14.5M16.5 14.5V18M16.5 14.5H20" 
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
});

export default VideoCall;