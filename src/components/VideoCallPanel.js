import React, { useState, useEffect, useRef, useCallback } from 'react';
import enhancedVideoCallService from '../services/enhancedVideoCallService';
import './VideoCallPanel.css';

const VideoCallPanel = ({ onClose, callId, participants = [] }) => {
  const [callState, setCallState] = useState(null);
  const [devices, setDevices] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [layout, setLayout] = useState('grid');
  const [isMinimized, setIsMinimized] = useState(false);
  
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const screenShareRef = useRef(null);

  // Initialize and start call
  useEffect(() => {
    initializeCall();

    // Subscribe to events
    const handleCallEnd = () => {
      onClose();
    };

    const handleStreamUpdate = (data) => {
      updateCallState();
    };

    const handleScreenShare = (data) => {
      if (data.started && screenShareRef.current) {
        screenShareRef.current.srcObject = data.stream;
      }
    };

    const handleRecordingUpdate = (data) => {
      if (!data.recording && data.blob) {
        // Recording completed - offer download
        const download = window.confirm('Recording complete! Download now?');
        if (download) {
          enhancedVideoCallService.downloadRecording(data.blob);
        }
      }
    };

    enhancedVideoCallService.on('onCallEnd', handleCallEnd);
    enhancedVideoCallService.on('onStreamUpdate', handleStreamUpdate);
    enhancedVideoCallService.on('onScreenShare', handleScreenShare);
    enhancedVideoCallService.on('onRecordingUpdate', handleRecordingUpdate);

    return () => {
      enhancedVideoCallService.off('onCallEnd', handleCallEnd);
      enhancedVideoCallService.off('onStreamUpdate', handleStreamUpdate);
      enhancedVideoCallService.off('onScreenShare', handleScreenShare);
      enhancedVideoCallService.off('onRecordingUpdate', handleRecordingUpdate);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const initializeCall = async () => {
    await enhancedVideoCallService.initialize();
    
    const result = await enhancedVideoCallService.startCall({
      callId,
      participants,
      quality: 'auto'
    });

    if (result.success && localVideoRef.current) {
      localVideoRef.current.srcObject = result.stream;
    }

    updateCallState();
    updateDevices();
  };

  const updateCallState = () => {
    setCallState(enhancedVideoCallService.getCallState());
  };

  const updateDevices = () => {
    setDevices(enhancedVideoCallService.getDevices());
  };

  const handleEndCall = useCallback(() => {
    enhancedVideoCallService.endCall();
  }, []);

  const handleToggleMute = useCallback(() => {
    enhancedVideoCallService.toggleMute();
    updateCallState();
  }, []);

  const handleToggleVideo = useCallback(() => {
    enhancedVideoCallService.toggleVideo();
    updateCallState();
  }, []);

  const handleScreenShare = useCallback(async () => {
    if (callState?.isScreenSharing) {
      enhancedVideoCallService.stopScreenShare();
    } else {
      await enhancedVideoCallService.startScreenShare();
    }
    updateCallState();
  }, [callState]);

  const handleToggleRecording = useCallback(async () => {
    if (callState?.isRecording) {
      await enhancedVideoCallService.stopRecording();
    } else {
      await enhancedVideoCallService.startRecording();
    }
    updateCallState();
  }, [callState]);

  const handleChangeLayout = useCallback((newLayout) => {
    enhancedVideoCallService.changeLayout(newLayout);
    setLayout(newLayout);
    updateCallState();
  }, []);

  const handleChangeQuality = useCallback(async (quality) => {
    await enhancedVideoCallService.changeQuality(quality);
    updateCallState();
  }, []);

  const handleSwitchCamera = useCallback(async (deviceId) => {
    await enhancedVideoCallService.switchCamera(deviceId);
    updateDevices();
  }, []);

  const handleSwitchMicrophone = useCallback(async (deviceId) => {
    await enhancedVideoCallService.switchMicrophone(deviceId);
    updateDevices();
  }, []);

  const handleToggleBlur = useCallback(async () => {
    // Toggle blur on/off
    await enhancedVideoCallService.enableBackgroundBlur(15);
    updateCallState();
  }, []);

  if (!callState) {
    return (
      <div className="video-call-panel loading">
        <div className="loading-spinner"></div>
        <p>Starting video call...</p>
      </div>
    );
  }

  return (
    <div className={`video-call-panel ${isMinimized ? 'minimized' : ''} layout-${layout}`}>
      {/* Header */}
      <div className="video-call-header">
        <div className="call-info">
          <span className="call-status">🔴 {callState.isRecording ? 'Recording' : 'Live'}</span>
          <span className="call-duration">
            {enhancedVideoCallService.formatDuration(callState.duration)}
          </span>
        </div>
        
        <div className="header-actions">
          <button
            className="header-btn"
            onClick={() => setIsMinimized(!isMinimized)}
            title={isMinimized ? 'Maximize' : 'Minimize'}
          >
            {isMinimized ? '🔼' : '🔽'}
          </button>
          <button
            className="header-btn"
            onClick={() => setShowSettings(!showSettings)}
            title="Settings"
          >
            ⚙️
          </button>
        </div>
      </div>

      {/* Video Grid */}
      {!isMinimized && (
        <div className="video-grid">
          {/* Screen Share (if active) */}
          {callState.isScreenSharing && (
            <div className="video-container screen-share">
              <video ref={screenShareRef} autoPlay playsInline />
              <div className="video-label">📺 Screen Share</div>
            </div>
          )}

          {/* Local Video */}
          <div className={`video-container local ${callState.isVideoOff ? 'video-off' : ''}`}>
            <video ref={localVideoRef} autoPlay playsInline muted />
            {callState.isVideoOff && (
              <div className="video-placeholder">
                <div className="avatar-placeholder">👤</div>
                <div className="video-off-label">Camera Off</div>
              </div>
            )}
            <div className="video-label">You {callState.isMuted && '🔇'}</div>
            
            {/* Quality Indicator */}
            <div className="quality-badge">{callState.quality.toUpperCase()}</div>
          </div>

          {/* Remote Videos (placeholder) */}
          {participants.map((participant, index) => (
            <div key={participant.id || index} className="video-container remote">
              <video ref={remoteVideoRef} autoPlay playsInline />
              <div className="video-label">{participant.name}</div>
            </div>
          ))}

          {/* Placeholder if no remote participants */}
          {participants.length === 0 && (
            <div className="video-container waiting">
              <div className="waiting-content">
                <div className="waiting-icon">⏳</div>
                <p>Waiting for others to join...</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && !isMinimized && (
        <div className="settings-panel">
          <h3>Call Settings</h3>
          
          {/* Camera Selection */}
          <div className="setting-group">
            <label>Camera</label>
            <select
              value={devices?.selectedCamera || ''}
              onChange={(e) => handleSwitchCamera(e.target.value)}
            >
              {devices?.cameras.map(cam => (
                <option key={cam.deviceId} value={cam.deviceId}>
                  {cam.label || `Camera ${cam.deviceId.slice(0, 8)}`}
                </option>
              ))}
            </select>
          </div>

          {/* Microphone Selection */}
          <div className="setting-group">
            <label>Microphone</label>
            <select
              value={devices?.selectedMicrophone || ''}
              onChange={(e) => handleSwitchMicrophone(e.target.value)}
            >
              {devices?.microphones.map(mic => (
                <option key={mic.deviceId} value={mic.deviceId}>
                  {mic.label || `Microphone ${mic.deviceId.slice(0, 8)}`}
                </option>
              ))}
            </select>
          </div>

          {/* Quality Selection */}
          <div className="setting-group">
            <label>Video Quality</label>
            <div className="quality-buttons">
              {['low', 'medium', 'high', 'auto'].map(q => (
                <button
                  key={q}
                  className={`quality-btn ${callState.quality === q ? 'active' : ''}`}
                  onClick={() => handleChangeQuality(q)}
                >
                  {q.charAt(0).toUpperCase() + q.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Layout Selection */}
          <div className="setting-group">
            <label>Layout</label>
            <div className="layout-buttons">
              <button
                className={`layout-btn ${layout === 'grid' ? 'active' : ''}`}
                onClick={() => handleChangeLayout('grid')}
                title="Grid View"
              >
                ⊞
              </button>
              <button
                className={`layout-btn ${layout === 'speaker' ? 'active' : ''}`}
                onClick={() => handleChangeLayout('speaker')}
                title="Speaker View"
              >
                ▭
              </button>
              <button
                className={`layout-btn ${layout === 'pip' ? 'active' : ''}`}
                onClick={() => handleChangeLayout('pip')}
                title="Picture in Picture"
              >
                ⊡
              </button>
            </div>
          </div>

          {/* Background Blur */}
          <div className="setting-group">
            <label>Background Blur</label>
            <button className="toggle-btn" onClick={handleToggleBlur}>
              Enable Blur
            </button>
          </div>
        </div>
      )}

      {/* Control Bar */}
      <div className="video-controls">
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
          title={callState.isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
        >
          🖥️
        </button>

        <button
          className={`control-btn ${callState.isRecording ? 'active recording' : ''}`}
          onClick={handleToggleRecording}
          title={callState.isRecording ? 'Stop Recording' : 'Start Recording'}
        >
          {callState.isRecording ? '⏹️' : '⏺️'}
        </button>

        <button
          className="control-btn end-call"
          onClick={handleEndCall}
          title="End Call"
        >
          📞❌
        </button>
      </div>
    </div>
  );
};

export default VideoCallPanel;
