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
  const [connectionQuality, setConnectionQuality] = useState('good');
  const [swipeStartY, setSwipeStartY] = useState(0);
  const [swipeDistance, setSwipeDistance] = useState(0);
  const [isScreenRecording, setIsScreenRecording] = useState(false);
  const [screenRecordingTime, setScreenRecordingTime] = useState(0);
  const [showCaptions, setShowCaptions] = useState(false);
  const [captions, setCaptions] = useState('');
  const [showStats, setShowStats] = useState(false);
  const [callStats, setCallStats] = useState(null);
  const [noiseCancellation, setNoiseCancellation] = useState(true);
  const [gestures, setGestures] = useState([]);
  const [activeSpeaker, setActiveSpeaker] = useState(null);
  const [spotlightMode, setSpotlightMode] = useState(false);
  const [batterySaver, setBatterySaver] = useState(false);
  const [recordingPaused, setRecordingPaused] = useState(false);
  const [recordingQuality, setRecordingQuality] = useState('high');
  
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const screenShareRef = useRef(null);
  const hiddenVideoRef = useRef(null);
  const headerRef = useRef(null);
  const screenRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const screenRecordingTimerRef = useRef(null);
  const recognitionRef = useRef(null);
  const statsIntervalRef = useRef(null);

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

    // Simulate connection quality monitoring
    const qualityInterval = setInterval(() => {
      const qualities = ['excellent', 'good', 'poor'];
      const randomQuality = qualities[Math.floor(Math.random() * qualities.length)];
      setConnectionQuality(randomQuality);
    }, 10000); // Update every 10 seconds

    return () => {
      enhancedVideoCallService.off('onCallEnd', handleCallEnd);
      enhancedVideoCallService.off('onStreamUpdate', handleStreamUpdate);
      enhancedVideoCallService.off('onScreenShare', handleScreenShare);
      enhancedVideoCallService.off('onRecordingUpdate', handleRecordingUpdate);
      clearInterval(qualityInterval);
      if (screenRecordingTimerRef.current) {
        clearInterval(screenRecordingTimerRef.current);
      }
      if (screenRecorderRef.current && screenRecorderRef.current.state !== 'inactive') {
        screenRecorderRef.current.stop();
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Swipe gesture handling for mobile
  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    const handleTouchStart = (e) => {
      setSwipeStartY(e.touches[0].clientY);
    };

    const handleTouchMove = (e) => {
      const currentY = e.touches[0].clientY;
      const distance = currentY - swipeStartY;
      
      // Only allow downward swipe
      if (distance > 0) {
        setSwipeDistance(distance);
      }
    };

    const handleTouchEnd = () => {
      // If swiped down more than 100px, minimize
      if (swipeDistance > 100) {
        setIsMinimized(true);
      }
      setSwipeDistance(0);
    };

    header.addEventListener('touchstart', handleTouchStart);
    header.addEventListener('touchmove', handleTouchMove);
    header.addEventListener('touchend', handleTouchEnd);

    return () => {
      header.removeEventListener('touchstart', handleTouchStart);
      header.removeEventListener('touchmove', handleTouchMove);
      header.removeEventListener('touchend', handleTouchEnd);
    };
  }, [swipeStartY, swipeDistance]);

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

  // Screen recording handlers
  const handleToggleScreenRecording = useCallback(async () => {
    if (isScreenRecording) {
      // Stop recording
      if (screenRecorderRef.current && screenRecorderRef.current.state !== 'inactive') {
        screenRecorderRef.current.stop();
      }
      if (screenRecordingTimerRef.current) {
        clearInterval(screenRecordingTimerRef.current);
        screenRecordingTimerRef.current = null;
      }
      setIsScreenRecording(false);
      setScreenRecordingTime(0);
    } else {
      // Start recording
      try {
        // Request screen capture
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            displaySurface: 'monitor',
            cursor: 'always',
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            frameRate: { ideal: 30 }
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 44100
          }
        });

        // Check if browser supports MediaRecorder
        if (!window.MediaRecorder) {
          throw new Error('Screen recording not supported in this browser');
        }

        // Determine best codec
        let options = { mimeType: 'video/webm;codecs=vp9' };
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
          options = { mimeType: 'video/webm;codecs=vp8' };
          if (!MediaRecorder.isTypeSupported(options.mimeType)) {
            options = { mimeType: 'video/webm' };
          }
        }

        recordedChunksRef.current = [];
        screenRecorderRef.current = new MediaRecorder(screenStream, options);

        screenRecorderRef.current.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            recordedChunksRef.current.push(event.data);
          }
        };

        screenRecorderRef.current.onstop = () => {
          const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          
          // Create download link
          const a = document.createElement('a');
          a.style.display = 'none';
          a.href = url;
          a.download = `screen-recording-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.webm`;
          document.body.appendChild(a);
          a.click();
          
          // Cleanup
          setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }, 100);

          // Stop all tracks
          screenStream.getTracks().forEach(track => track.stop());
          recordedChunksRef.current = [];
        };

        // Handle user stopping the share
        screenStream.getVideoTracks()[0].onended = () => {
          if (isScreenRecording) {
            handleToggleScreenRecording();
          }
        };

        screenRecorderRef.current.start(1000); // Collect data every second
        setIsScreenRecording(true);
        setScreenRecordingTime(0);

        // Start timer
        screenRecordingTimerRef.current = setInterval(() => {
          setScreenRecordingTime(prev => prev + 1);
        }, 1000);

      } catch (error) {
        console.error('Failed to start screen recording:', error);
        alert(error.message || 'Failed to start screen recording. Please ensure you granted permission.');
      }
    }
  }, [isScreenRecording]);

  // Format recording time
  const formatRecordingTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Live Captions Toggle
  const handleToggleCaptions = useCallback(() => {
    if (!showCaptions) {
      // Start speech recognition
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onresult = (event) => {
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript + ' ';
            } else {
              interimTranscript += transcript;
            }
          }

          setCaptions(finalTranscript || interimTranscript);
        };

        recognitionRef.current.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
        };

        recognitionRef.current.start();
      } else {
        alert('Speech recognition not supported in this browser');
        return;
      }
    } else {
      // Stop speech recognition
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      setCaptions('');
    }
    setShowCaptions(!showCaptions);
  }, [showCaptions]);

  // Noise Cancellation Toggle
  const handleToggleNoiseCancellation = useCallback(() => {
    setNoiseCancellation(!noiseCancellation);
    // Apply noise cancellation to audio track
    if (callState?.localStream) {
      const audioTrack = callState.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.applyConstraints({
          noiseSuppression: !noiseCancellation,
          echoCancellation: true,
          autoGainControl: true
        });
      }
    }
  }, [noiseCancellation, callState]);

  // Toggle Stats Dashboard
  const handleToggleStats = useCallback(() => {
    if (!showStats) {
      // Start collecting stats
      statsIntervalRef.current = setInterval(() => {
        const stats = enhancedVideoCallService.getStats();
        setCallStats({
          bandwidth: `${(stats.bandwidth / 1000).toFixed(1)} kbps`,
          fps: '30',
          packetLoss: `${stats.packetsLost || 0}`,
          latency: `${stats.roundTripTime || 0} ms`,
          jitter: `${stats.jitter || 0} ms`,
          quality: connectionQuality
        });
      }, 1000);
    } else {
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
        statsIntervalRef.current = null;
      }
      setCallStats(null);
    }
    setShowStats(!showStats);
  }, [showStats, connectionQuality]);

  // Send Gesture/Reaction
  const handleSendGesture = useCallback((gesture) => {
    const newGesture = {
      id: Date.now(),
      emoji: gesture,
      timestamp: Date.now()
    };
    setGestures(prev => [...prev, newGesture]);
    
    // Remove gesture after 3 seconds
    setTimeout(() => {
      setGestures(prev => prev.filter(g => g.id !== newGesture.id));
    }, 3000);
  }, []);

  // Toggle Spotlight Mode
  const handleToggleSpotlight = useCallback(() => {
    setSpotlightMode(!spotlightMode);
    if (!spotlightMode) {
      setLayout('speaker');
    } else {
      setLayout('grid');
    }
  }, [spotlightMode]);

  // Toggle Battery Saver
  const handleToggleBatterySaver = useCallback(() => {
    setBatterySaver(!batterySaver);
    if (!batterySaver) {
      // Reduce quality for battery saving
      handleChangeQuality('low');
    } else {
      handleChangeQuality('auto');
    }
  }, [batterySaver]);

  // Pause/Resume Recording
  const handlePauseResumeRecording = useCallback(() => {
    if (!callState?.isRecording) return;
    
    if (recordingPaused) {
      enhancedVideoCallService.resumeRecording();
    } else {
      enhancedVideoCallService.pauseRecording();
    }
    setRecordingPaused(!recordingPaused);
  }, [recordingPaused, callState]);

  // Change Recording Quality
  const handleChangeRecordingQuality = useCallback((quality) => {
    setRecordingQuality(quality);
    enhancedVideoCallService.setRecordingQuality(quality);
  }, []);

  // Close on backdrop click
  const handleBackdropClick = useCallback(() => {
    if (!isMinimized) {
      const confirm = window.confirm('End video call?');
      if (confirm) {
        handleEndCall();
      }
    }
  }, [isMinimized, handleEndCall]);

  // Check if filters are active
  const hasActiveFilters = filters && (
    activePreset !== 'none' ||
    filters.smoothSkin > 0 ||
    filters.brighten > 0 ||
    filters.brightness !== 0 ||
    filters.contrast !== 0 ||
    filters.saturation !== 0 ||
    filters.temperature !== 0 ||
    filters.vibrance > 0 ||
    filters.sharpen > 0 ||
    filters.vignette > 0 ||
    filters.grain > 0 ||
    filters.arEffect !== 'none'
  );

  if (!callState) {
    return (
      <>
        <div className="video-call-backdrop" onClick={handleBackdropClick}></div>
        <div className="video-call-panel loading">
          <div className="loading-spinner"></div>
          <p>Starting video call...</p>
        </div>
      </>
    );
  }

  const participantCount = participants.length + 1; // Including yourself

  return (
    <>
      {/* Backdrop */}
      <div className="video-call-backdrop" onClick={handleBackdropClick}></div>
      
      <div className={`video-call-panel ${isMinimized ? 'minimized' : ''} layout-${layout}`}>
        {/* Header */}
        <div className="video-call-header" ref={headerRef}>
          <div className="call-info">
            <span className="call-status">🔴 {callState.isRecording ? 'Recording' : 'Live'}</span>
            <span className="participant-badge">
              <span className="badge-icon">👥</span>
              {participantCount}
            </span>
            <span className="call-duration">
              {enhancedVideoCallService.formatDuration(callState.duration)}
            </span>
          </div>

          {/* Connection Quality Indicator */}
          <div className="connection-quality">
            <span className={`quality-dot ${connectionQuality}`}></span>
            <span>{connectionQuality === 'excellent' ? 'Excellent' : connectionQuality === 'good' ? 'Good' : 'Poor'}</span>
          </div>
          
          <div className="header-actions">
            <button
              className={`header-btn ${hasActiveFilters ? 'has-filters' : ''}`}
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

          {/* Noise Cancellation */}
          <div className="setting-group">
            <label>🎯 Noise Cancellation</label>
            <button 
              className={`toggle-btn ${noiseCancellation ? 'active' : ''}`}
              onClick={handleToggleNoiseCancellation}
            >
              {noiseCancellation ? '✓ Enabled' : 'Enable'}
            </button>
          </div>

          {/* Spotlight Mode */}
          <div className="setting-group">
            <label>👤 Spotlight Mode</label>
            <button 
              className={`toggle-btn ${spotlightMode ? 'active' : ''}`}
              onClick={handleToggleSpotlight}
            >
              {spotlightMode ? '✓ Active' : 'Activate'}
            </button>
          </div>

          {/* Battery Saver (Mobile) */}
          <div className="setting-group mobile-only">
            <label>🔋 Battery Saver</label>
            <button 
              className={`toggle-btn ${batterySaver ? 'active' : ''}`}
              onClick={handleToggleBatterySaver}
            >
              {batterySaver ? '✓ Enabled' : 'Enable'}
            </button>
          </div>

          {/* Recording Quality */}
          {callState.isRecording && (
            <div className="setting-group">
              <label>Recording Quality</label>
              <div className="quality-buttons">
                {['low', 'medium', 'high'].map(q => (
                  <button
                    key={q}
                    className={`quality-btn ${recordingQuality === q ? 'active' : ''}`}
                    onClick={() => handleChangeRecordingQuality(q)}
                  >
                    {q.charAt(0).toUpperCase() + q.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Live Captions Display */}
      {showCaptions && captions && (
        <div className="captions-overlay">
          <div className="captions-text">{captions}</div>
        </div>
      )}

      {/* Statistics Dashboard */}
      {showStats && callStats && (
        <div className="stats-dashboard">
          <div className="stats-header">
            <h4>📊 Call Statistics</h4>
            <button className="close-stats" onClick={handleToggleStats}>×</button>
          </div>
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-label">Bandwidth</div>
              <div className="stat-value">{callStats.bandwidth}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">FPS</div>
              <div className="stat-value">{callStats.fps}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Packet Loss</div>
              <div className="stat-value">{callStats.packetLoss}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Latency</div>
              <div className="stat-value">{callStats.latency}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Jitter</div>
              <div className="stat-value">{callStats.jitter}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Quality</div>
              <div className={`stat-value quality-${callStats.quality}`}>
                {callStats.quality.toUpperCase()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Gesture/Reactions Display */}
      {gestures.length > 0 && (
        <div className="gestures-overlay">
          {gestures.map(gesture => (
            <div 
              key={gesture.id} 
              className="gesture-emoji"
              style={{ animationDelay: `${(Date.now() - gesture.timestamp) / 1000}s` }}
            >
              {gesture.emoji}
            </div>
          ))}
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

        {/* Pause/Resume Recording */}
        {callState.isRecording && (
          <button
            className={`control-btn ${recordingPaused ? 'active' : ''}`}
            onClick={handlePauseResumeRecording}
            title={recordingPaused ? 'Resume Recording' : 'Pause Recording'}
          >
            {recordingPaused ? '▶️' : '⏸️'}
          </button>
        )}

        <button
          className={`control-btn screen-record-btn ${isScreenRecording ? 'active recording' : ''}`}
          onClick={handleToggleScreenRecording}
          title={isScreenRecording ? `Stop Screen Recording (${formatRecordingTime(screenRecordingTime)})` : 'Record Screen'}
        >
          {isScreenRecording ? (
            <span className="recording-indicator">
              ⏺️
              <span className="recording-time">{formatRecordingTime(screenRecordingTime)}</span>
            </span>
          ) : '🎬'}
        </button>

        {/* Live Captions Toggle */}
        <button
          className={`control-btn ${showCaptions ? 'active' : ''}`}
          onClick={handleToggleCaptions}
          title={showCaptions ? 'Hide Captions' : 'Show Live Captions'}
        >
          💬
        </button>

        {/* Stats Toggle */}
        <button
          className={`control-btn ${showStats ? 'active' : ''}`}
          onClick={handleToggleStats}
          title={showStats ? 'Hide Statistics' : 'Show Statistics'}
        >
          📊
        </button>

        {/* Reactions Menu */}
        <div className="reactions-menu">
          <button
            className="control-btn reactions-btn"
            title="Send Reaction"
          >
            ✋
          </button>
          <div className="reactions-dropdown">
            <button onClick={() => handleSendGesture('👍')}>👍</button>
            <button onClick={() => handleSendGesture('❤️')}>❤️</button>
            <button onClick={() => handleSendGesture('😂')}>😂</button>
            <button onClick={() => handleSendGesture('👏')}>👏</button>
            <button onClick={() => handleSendGesture('🎉')}>🎉</button>
            <button onClick={() => handleSendGesture('✋')}>✋</button>
          </div>
        </div>

        <button
          className="control-btn end-call"
          onClick={handleEndCall}
          title="End Call"
        >
          📞❌
        </button>
      </div>
    </div>
    </>
  );
};

export default VideoCallPanel;
