import React, { useState, useEffect, useRef, useCallback } from 'react';
import enhancedVideoCallService from '../services/enhancedVideoCallService';
import videoFiltersService from '../services/videoFiltersService';
import './VideoCallPanel.css';

const VideoCallPanel = ({ onClose, callId, participants = [] }) => {
  const [callState, setCallState] = useState(null);
  const [devices, setDevices] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [layout, setLayout] = useState('grid');
  const [isMinimized, setIsMinimized] = useState(false);
  const [filters, setFilters] = useState(null);
  const [activePreset, setActivePreset] = useState('none');
  
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const screenShareRef = useRef(null);
  const hiddenVideoRef = useRef(null);

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
    try {
      await enhancedVideoCallService.initialize();
      
      const result = await enhancedVideoCallService.startCall({
        callId,
        participants,
        quality: 'auto'
      });

      if (result.success) {
        // Initialize filters service first
        setFilters(videoFiltersService.getFilters());
        
        // Initialize filters with hidden video element
        if (hiddenVideoRef.current) {
          hiddenVideoRef.current.srcObject = result.stream;
          await hiddenVideoRef.current.play();
          
          videoFiltersService.initialize(hiddenVideoRef.current);
          const filteredStream = videoFiltersService.startProcessing();
          
          if (localVideoRef.current && filteredStream) {
            localVideoRef.current.srcObject = filteredStream;
          }
        }
      } else {
        // Still initialize filters state even if call fails
        setFilters(videoFiltersService.getFilters());
      }
    } catch (error) {
      console.error('Failed to initialize call:', error);
      // Initialize filters state even on error
      setFilters(videoFiltersService.getFilters());
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

  // Filter handlers
  const handleFilterChange = useCallback((filterName, value) => {
    videoFiltersService.setFilter(filterName, value);
    setFilters(videoFiltersService.getFilters());
  }, []);

  const handlePresetChange = useCallback((presetName) => {
    videoFiltersService.applyPreset(presetName);
    setFilters(videoFiltersService.getFilters());
    setActivePreset(presetName);
  }, []);

  const handleAREffectChange = useCallback((effect) => {
    videoFiltersService.setFilter('arEffect', effect);
    setFilters(videoFiltersService.getFilters());
  }, []);

  const handleResetFilters = useCallback(() => {
    videoFiltersService.resetFilters();
    setFilters(videoFiltersService.getFilters());
    setActivePreset('none');
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
            onClick={() => {
              console.log('Filters button clicked. Current state:', showFilters, 'Filters:', filters);
              setShowFilters(!showFilters);
            }}
            title="Filters & Effects"
          >
            ✨
          </button>
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
          {/* Hidden video for filter processing */}
          <video ref={hiddenVideoRef} style={{ display: 'none' }} autoPlay playsInline muted />

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

      {/* Filters Panel */}
      {showFilters && !isMinimized && (
        <div className="filters-panel">
          {filters ? (
            <>
              <div className="filters-header">
                <h3>✨ Filters & Effects</h3>
                <button className="reset-btn" onClick={handleResetFilters}>Reset All</button>
              </div>

              {/* Filter Presets */}
              <div className="filter-section">
                <label className="section-label">Presets</label>
                <div className="preset-grid">
                  {videoFiltersService.getPresets().map(preset => (
                    <button
                      key={preset}
                      className={`preset-btn ${activePreset === preset ? 'active' : ''}`}
                      onClick={() => handlePresetChange(preset)}
                    >
                      <div className="preset-icon">
                    {preset === 'none' && '○'}
                    {preset === 'natural' && '🌿'}
                    {preset === 'vivid' && '🌈'}
                    {preset === 'dramatic' && '🎭'}
                    {preset === 'vintage' && '📽️'}
                    {preset === 'cool' && '❄️'}
                    {preset === 'warm' && '☀️'}
                  </div>
                  <div className="preset-name">{preset.charAt(0).toUpperCase() + preset.slice(1)}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Beauty Filters */}
          <div className="filter-section">
            <label className="section-label">💄 Beauty</label>
            
            <div className="slider-group">
              <label>Smooth Skin</label>
              <div className="slider-container">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={filters.smoothSkin}
                  onChange={(e) => handleFilterChange('smoothSkin', parseInt(e.target.value))}
                />
                <span className="slider-value">{filters.smoothSkin}</span>
              </div>
            </div>

            <div className="slider-group">
              <label>Brighten</label>
              <div className="slider-container">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={filters.brighten}
                  onChange={(e) => handleFilterChange('brighten', parseInt(e.target.value))}
                />
                <span className="slider-value">{filters.brighten}</span>
              </div>
            </div>
          </div>

          {/* Color Adjustments */}
          <div className="filter-section">
            <label className="section-label">🎨 Color</label>
            
            <div className="slider-group">
              <label>Brightness</label>
              <div className="slider-container">
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={filters.brightness}
                  onChange={(e) => handleFilterChange('brightness', parseInt(e.target.value))}
                />
                <span className="slider-value">{filters.brightness}</span>
              </div>
            </div>

            <div className="slider-group">
              <label>Contrast</label>
              <div className="slider-container">
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={filters.contrast}
                  onChange={(e) => handleFilterChange('contrast', parseInt(e.target.value))}
                />
                <span className="slider-value">{filters.contrast}</span>
              </div>
            </div>

            <div className="slider-group">
              <label>Saturation</label>
              <div className="slider-container">
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={filters.saturation}
                  onChange={(e) => handleFilterChange('saturation', parseInt(e.target.value))}
                />
                <span className="slider-value">{filters.saturation}</span>
              </div>
            </div>

            <div className="slider-group">
              <label>Temperature</label>
              <div className="slider-container">
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={filters.temperature}
                  onChange={(e) => handleFilterChange('temperature', parseInt(e.target.value))}
                />
                <span className="slider-value">{filters.temperature < 0 ? '❄️' : '🔥'} {Math.abs(filters.temperature)}</span>
              </div>
            </div>

            <div className="slider-group">
              <label>Vibrance</label>
              <div className="slider-container">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={filters.vibrance}
                  onChange={(e) => handleFilterChange('vibrance', parseInt(e.target.value))}
                />
                <span className="slider-value">{filters.vibrance}</span>
              </div>
            </div>
          </div>

          {/* Effects */}
          <div className="filter-section">
            <label className="section-label">✨ Effects</label>
            
            <div className="slider-group">
              <label>Sharpen</label>
              <div className="slider-container">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={filters.sharpen}
                  onChange={(e) => handleFilterChange('sharpen', parseInt(e.target.value))}
                />
                <span className="slider-value">{filters.sharpen}</span>
              </div>
            </div>

            <div className="slider-group">
              <label>Vignette</label>
              <div className="slider-container">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={filters.vignette}
                  onChange={(e) => handleFilterChange('vignette', parseInt(e.target.value))}
                />
                <span className="slider-value">{filters.vignette}</span>
              </div>
            </div>

            <div className="slider-group">
              <label>Film Grain</label>
              <div className="slider-container">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={filters.grain}
                  onChange={(e) => handleFilterChange('grain', parseInt(e.target.value))}
                />
                <span className="slider-value">{filters.grain}</span>
              </div>
            </div>
          </div>

          {/* AR Effects */}
          <div className="filter-section">
            <label className="section-label">🎭 AR Effects</label>
            <div className="ar-effects-grid">
              {videoFiltersService.getAREffects().map(effect => (
                <button
                  key={effect}
                  className={`ar-effect-btn ${filters.arEffect === effect ? 'active' : ''}`}
                  onClick={() => handleAREffectChange(effect)}
                >
                  {effect === 'none' && '○'}
                  {effect === 'glasses' && '👓'}
                  {effect === 'hat' && '🎩'}
                  {effect === 'mask' && '🎭'}
                  {effect === 'ears' && '🐰'}
                  {effect === 'mustache' && '👨'}
                  <div className="ar-effect-name">{effect.charAt(0).toUpperCase() + effect.slice(1)}</div>
                </button>
              ))}
            </div>

            {filters.arEffect !== 'none' && (
              <div className="slider-group">
                <label>Effect Color</label>
                <input
                  type="color"
                  value={filters.arColor}
                  onChange={(e) => handleFilterChange('arColor', e.target.value)}
                  className="color-picker"
                />
              </div>
            )}
          </div>
            </>
          ) : (
            <div className="filters-loading">
              <div className="loading-spinner"></div>
              <p>Initializing filters...</p>
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
