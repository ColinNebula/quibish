import React, { useState, useEffect, useRef, useCallback } from 'react';
import enhancedVoiceRecorderService from '../services/enhancedVoiceRecorderService';
import './VoiceRecorder.css';

// Animated live waveform bars driven by volume
function LiveWaveform({ volume, isRecording, isPaused, barCount = 32 }) {
  const [bars, setBars] = useState(() => Array(barCount).fill(5));
  const animFrameRef = useRef(null);
  const heightsRef = useRef(Array(barCount).fill(5));

  useEffect(() => {
    if (!isRecording || isPaused) {
      // Decay all bars to rest
      const decay = () => {
        let changed = false;
        heightsRef.current = heightsRef.current.map(h => {
          if (h > 5) { changed = true; return Math.max(5, h - 3); }
          return h;
        });
        setBars([...heightsRef.current]);
        if (changed) animFrameRef.current = requestAnimationFrame(decay);
      };
      animFrameRef.current = requestAnimationFrame(decay);
      return () => cancelAnimationFrame(animFrameRef.current);
    }

    const animate = () => {
      // Shift bars left, push a new one based on current volume + noise
      const noise = (Math.random() * 0.4 + 0.8);
      const newH = Math.max(8, Math.min(95, (volume * noise) + (Math.random() * 15)));
      heightsRef.current = [...heightsRef.current.slice(1), newH];
      setBars([...heightsRef.current]);
    };

    const id = setInterval(animate, 60);
    return () => clearInterval(id);
  }, [isRecording, isPaused, volume, barCount]);

  return (
    <div className="live-waveform">
      {bars.map((h, i) => (
        <div
          key={i}
          className={`live-bar ${isPaused ? 'paused' : isRecording ? 'active' : ''}`}
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  );
}

const VoiceRecorder = ({ 
  onRecordingComplete,
  onRecordingCancel,
  onRecordingStart,
  onClose,
  maxDuration = 300000, // 5 minutes default
  minDuration = 1000, // 1 second minimum
  className = '',
  compact = false,
  autoStart = false
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0);
  const [hasPermission, setHasPermission] = useState(false);
  const [error, setError] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [audioPreview, setAudioPreview] = useState(null);
  const [quality, setQuality] = useState('standard'); // 'low', 'standard', 'high'
  
  const durationTimerRef = useRef(null);
  const waveformCanvasRef = useRef(null);
  const volumeBarRef = useRef(null);

  // Initialize the voice recorder service
  useEffect(() => {
    const initialize = async () => {
      try {
        console.log('🎤 Initializing voice recorder...');
        
        // Check browser support first
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Voice recording not supported. Please use Chrome, Firefox, Edge, or Safari.');
        }
        
        const initialized = await enhancedVoiceRecorderService.initialize();
        setIsInitialized(initialized);
        
        if (!initialized) {
          const errorMsg = 'Voice recording is not supported in your browser';
          console.error('❌ Voice recorder initialization failed:', errorMsg);
          setError(errorMsg);
        } else {
          console.log('✅ Voice recorder initialized successfully');
          setError(null);
        }
      } catch (error) {
        console.error('❌ Voice recorder initialization error:', error);
        setError(`Failed to initialize: ${error.message}`);
        setIsInitialized(false);
      }
    };

    initialize();

    // Set up event listeners
    const handleStart = (data) => {
      setIsRecording(true);
      setIsPaused(false);
      setError(null);
      setHasPermission(true);
      if (onRecordingStart) onRecordingStart(data);
    };

    const handleStop = (data) => {
      setIsRecording(false);
      setIsPaused(false);
      setDuration(0);
      setVolume(0);
      if (onRecordingComplete) onRecordingComplete(data);
    };

    const handlePause = () => {
      setIsPaused(true);
    };

    const handleResume = () => {
      setIsPaused(false);
    };

    const handleVolumeChange = ({ volume }) => {
      setVolume(volume);
      updateVolumeVisualization(volume);
    };

    const handleError = ({ error, type }) => {
      setError(`Recording error (${type}): ${error.message || error}`);
      setIsRecording(false);
      setIsPaused(false);
      
      if (type === 'start') {
        setHasPermission(false);
      }
    };

    // Register event listeners
    enhancedVoiceRecorderService.on('onStart', handleStart);
    enhancedVoiceRecorderService.on('onStop', handleStop);
    enhancedVoiceRecorderService.on('onPause', handlePause);
    enhancedVoiceRecorderService.on('onResume', handleResume);
    enhancedVoiceRecorderService.on('onVolumeChange', handleVolumeChange);
    enhancedVoiceRecorderService.on('onError', handleError);

    // Auto-start if requested
  if (autoStart && isInitialized) {
      handleStartRecording();
    }

    // Cleanup
    return () => {
      enhancedVoiceRecorderService.off('onStart', handleStart);
      enhancedVoiceRecorderService.off('onStop', handleStop);
      enhancedVoiceRecorderService.off('onPause', handlePause);
      enhancedVoiceRecorderService.off('onResume', handleResume);
      enhancedVoiceRecorderService.off('onVolumeChange', handleVolumeChange);
      enhancedVoiceRecorderService.off('onError', handleError);
      
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
      }
    };
  }, [autoStart, onRecordingStart, onRecordingComplete]);

  // Duration timer
  useEffect(() => {
    if (isRecording && !isPaused) {
      durationTimerRef.current = setInterval(() => {
        const currentDuration = enhancedVoiceRecorderService.getRecordingDuration();
        setDuration(currentDuration);
        
        // Auto-stop if max duration reached
        if (currentDuration >= maxDuration) {
          handleStopRecording();
        }
      }, 100);
    } else {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
        durationTimerRef.current = null;
      }
    }

    return () => {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
      }
    };
  }, [isRecording, isPaused, maxDuration]);

  // Check microphone permissions
  const checkMicrophonePermission = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('MediaDevices API not supported in this browser');
        return false;
      }

      // Try to get permission status
      if (navigator.permissions) {
        const permission = await navigator.permissions.query({ name: 'microphone' });
        
        if (permission.state === 'denied') {
          setError('Microphone permission denied. Please enable in browser settings.');
          return false;
        }
        
        if (permission.state === 'prompt') {
          setError('Click record to allow microphone access');
        }
      }
      
      return true;
    } catch (error) {
      console.warn('Permission check failed:', error);
      return true; // Fallback - let getUserMedia handle it
    }
  }, []);

  // Check permissions when initialized
  useEffect(() => {
    if (isInitialized) {
      checkMicrophonePermission();
    }
  }, [isInitialized, checkMicrophonePermission]);

  // Start recording
  const handleStartRecording = useCallback(async () => {
    if (!isInitialized) {
      console.log('🔄 Service not initialized, initializing now...');
      try {
        const initialized = await enhancedVoiceRecorderService.initialize();
        setIsInitialized(initialized);
        
        if (!initialized) {
          setError('Failed to initialize voice recorder');
          return;
        }
      } catch (error) {
        console.error('❌ Initialization failed:', error);
        setError(`Initialization failed: ${error.message}`);
        return;
      }
    }

    try {
      console.log('🎤 Testing microphone access first...');
      setError('Testing microphone access...');
      
      // Test microphone access first
      const testResult = await enhancedVoiceRecorderService.testMicrophoneAccess();
      
      if (!testResult.success) {
        console.error('❌ Microphone test failed:', testResult.message);
        setError(testResult.message);
        return;
      }
      
      console.log('✅ Microphone test passed, starting recording...');
      setError(null);
      setRetryCount(0);
      
      // Configure quality before starting
      const qualityConfig = {
        low: { bitrate: 64000, sampleRate: 22050 },
        standard: { bitrate: 128000, sampleRate: 44100 },
        high: { bitrate: 256000, sampleRate: 48000 }
      }[quality];
      
      const success = await enhancedVoiceRecorderService.startRecording(qualityConfig);
      
      if (!success) {
        throw new Error('Failed to start recording - unknown error');
      }
      
      console.log('✅ Recording started successfully');
    } catch (error) {
      console.error('❌ Recording start error:', error);
      setError(`Recording failed: ${error.message}`);
      setIsRecording(false);
    }
  }, [isInitialized, quality]);

  // Cancel recording - defined before handleStopRecording to avoid use-before-define
  const handleCancelRecording = useCallback(() => {
    enhancedVoiceRecorderService.cancelRecording();
    setDuration(0);
    setVolume(0);
    setAudioPreview(null);
    setError(null);
    if (onRecordingCancel) onRecordingCancel();
  }, [onRecordingCancel]);

  // Stop recording
  const handleStopRecording = useCallback(async () => {
    if (duration < minDuration) {
      setError(`Recording too short. Minimum duration is ${minDuration / 1000} seconds.`);
      setTimeout(() => setError(null), 3000);
      handleCancelRecording();
      return;
    }

    try {
      console.log('🛑 Stopping recording...');
      const recordingData = await enhancedVoiceRecorderService.stopRecording();
      
      if (recordingData && recordingData.url) {
        setAudioPreview(recordingData);
      }
      
      console.log('✅ Recording stopped successfully');
    } catch (error) {
      console.error('❌ Stop recording error:', error);
      setError(`Stop failed: ${error.message}`);
      setTimeout(() => setError(null), 5000);
    }
  }, [duration, minDuration, handleCancelRecording]);

  // Pause recording
  const handlePauseRecording = useCallback(() => {
    enhancedVoiceRecorderService.pauseRecording();
  }, []);

  // Resume recording
  const handleResumeRecording = useCallback(() => {
    enhancedVoiceRecorderService.resumeRecording();
  }, []);

  // Retry recording with backoff
  const handleRetryRecording = useCallback(async () => {
    const attempt = retryCount + 1;
    setRetryCount(attempt);
    
    if (attempt > 3) {
      setError('Too many failed attempts. Please check your microphone settings and refresh the page.');
      return;
    }
    
    setError('Retrying...');
    setTimeout(() => {
      handleStartRecording();
    }, attempt * 1000); // Exponential backoff: 1s, 2s, 3s
  }, [retryCount, handleStartRecording]);

  // Save preview recording
  const handleSavePreview = useCallback(() => {
    if (audioPreview && onRecordingComplete) {
      onRecordingComplete(audioPreview);
      setAudioPreview(null);
    }
  }, [audioPreview, onRecordingComplete]);

  // Discard preview and record again
  const handleDiscardPreview = useCallback(() => {
    if (audioPreview && audioPreview.url) {
      URL.revokeObjectURL(audioPreview.url);
    }
    setAudioPreview(null);
  }, [audioPreview]);

  // Draw waveform visualization
  const drawWaveform = useCallback((volumeLevel) => {
    const canvas = waveformCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Shift existing content left
    const imageData = ctx.getImageData(2, 0, width - 2, height);
    ctx.putImageData(imageData, 0, 0);

    // Clear the rightmost part
    ctx.clearRect(width - 2, 0, 2, height);

    // Draw new volume bar
    const barHeight = (volumeLevel / 100) * height;
    const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
    gradient.addColorStop(0, '#ef4444');
    gradient.addColorStop(0.5, '#f59e0b');
    gradient.addColorStop(1, '#22c55e');

    ctx.fillStyle = gradient;
    ctx.fillRect(width - 2, height - barHeight, 2, barHeight);
  }, []);

  // Update volume visualization
  const updateVolumeVisualization = useCallback((volumeLevel) => {
    if (volumeBarRef.current) {
      const percentage = Math.min(100, Math.max(0, volumeLevel));
      volumeBarRef.current.style.width = `${percentage}%`;
    }

    // Update waveform canvas if available
    if (waveformCanvasRef.current && isRecording) {
      drawWaveform(volumeLevel);
    }
  }, [isRecording, drawWaveform]);

  // Format duration for display
  const formatDuration = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Get progress percentage
  const getProgress = () => {
    return Math.min(100, (duration / maxDuration) * 100);
  };

  // Get volume color based on level
  const getVolumeColor = () => {
    if (volume < 20) return '#6b7280';
    if (volume < 50) return '#22c55e';
    if (volume < 80) return '#f59e0b';
    return '#ef4444';
  };

  if (!isInitialized) {
    return (
      <div className={`voice-recorder loading ${className}`}>
        <div className="recorder-message">
          <div className="loading-spinner"></div>
          <span>Initializing voice recorder...</span>
        </div>
      </div>
    );
  }

  if (error && !hasPermission && !isRecording) {
    return (
      <div className={`voice-recorder error ${className}`}>
        {onClose && (
          <button className="recorder-close-btn" onClick={onClose} title="Close">
            ✕
          </button>
        )}
        <div className="recorder-message">
          <span className="error-icon">🎤❌</span>
          <span className="error-message">{error}</span>
          <div className="error-help">
            <details>
              <summary>How to fix microphone issues</summary>
              <ul>
                <li>✅ Click the lock icon in your browser's address bar</li>
                <li>✅ Allow microphone permissions for this site</li>
                <li>✅ Check your system microphone settings</li>
                <li>✅ Make sure no other app is using the microphone</li>
                <li>✅ Try refreshing the page</li>
              </ul>
            </details>
          </div>
          <div className="error-actions">
            <button 
              className="retry-btn primary"
              onClick={handleRetryRecording}
              disabled={retryCount >= 3}
            >
              🔄 {retryCount > 0 ? `Retry (${3 - retryCount} left)` : 'Try Again'}
            </button>
            <button 
              className="test-btn secondary"
              onClick={async () => {
                const result = await enhancedVoiceRecorderService.testMicrophoneAccess();
                if (result.success) {
                  setError('✅ Microphone test passed! Click "Try Again" to record.');
                  setHasPermission(true);
                  setTimeout(() => setError(null), 3000);
                } else {
                  setError(result.message);
                }
              }}
            >
              🔍 Test Microphone
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`voice-recorder ${isRecording ? 'recording' : ''} ${isPaused ? 'paused' : ''} ${compact ? 'compact' : ''} ${className}`}>
      {onClose && (
        <button className="recorder-close-btn" onClick={onClose} title="Close">
          ✕
        </button>
      )}
      {/* Recording Status */}
      {isRecording && (
        <div className="recording-status">
          <div className="recording-indicator">
            <div className="recording-dot"></div>
            <span className="recording-text">
              {isPaused ? 'Paused' : 'Recording'}
            </span>
          </div>
          
          <div className="recording-duration">
            {formatDuration(duration)}
          </div>
        </div>
      )}

      {/* Volume Visualization */}
      {isRecording && !compact && (
        <LiveWaveform
          volume={volume}
          isRecording={isRecording}
          isPaused={isPaused}
        />
      )}

      {/* Progress Bar */}
      {isRecording && (
        <div className="recording-progress">
          <div 
            className="progress-bar"
            style={{ width: `${getProgress()}%` }}
          ></div>
          <div className="progress-time">
            {formatDuration(maxDuration - duration)} remaining
          </div>
        </div>
      )}

      {/* Audio Preview Player */}
      {audioPreview && !isRecording && (
        <div className="audio-preview">
          <div className="preview-header">
            <span className="preview-title">🎵 Recording Preview</span>
            <span className="preview-info">
              {formatDuration(audioPreview.duration)} • {(audioPreview.size / 1024).toFixed(0)}KB
            </span>
          </div>
          <VoiceMessagePlayer 
            audioUrl={audioPreview.url}
            duration={audioPreview.duration}
            compact={false}
          />
          <div className="preview-actions">
            <button 
              className="preview-btn save-btn"
              onClick={handleSavePreview}
              title="Save recording"
            >
              <span className="btn-icon">✅</span>
              <span className="btn-text">Save & Send</span>
            </button>
            <button 
              className="preview-btn discard-btn"
              onClick={handleDiscardPreview}
              title="Record again"
            >
              <span className="btn-icon">🔄</span>
              <span className="btn-text">Record Again</span>
            </button>
          </div>
        </div>
      )}

      {/* Recording Quality Selector */}
      {!isRecording && !audioPreview && !compact && (
        <div className="quality-selector">
          <label className="quality-label">Recording Quality:</label>
          <div className="quality-options">
            <button 
              className={`quality-btn ${quality === 'low' ? 'active' : ''}`}
              onClick={() => setQuality('low')}
              title="Low quality - Smaller file size"
            >
              📉 Low
            </button>
            <button 
              className={`quality-btn ${quality === 'standard' ? 'active' : ''}`}
              onClick={() => setQuality('standard')}
              title="Standard quality - Balanced"
            >
              📊 Standard
            </button>
            <button 
              className={`quality-btn ${quality === 'high' ? 'active' : ''}`}
              onClick={() => setQuality('high')}
              title="High quality - Larger file size"
            >
              📈 High
            </button>
          </div>
          <div className="quality-info">
            {quality === 'low' && '22kHz, 64kbps - Best for voice notes'}
            {quality === 'standard' && '44kHz, 128kbps - Recommended'}
            {quality === 'high' && '48kHz, 256kbps - Best quality'}
          </div>
        </div>
      )}

      {/* Recording Controls */}
      <div className="recording-controls">
        {!isRecording ? (
          <button 
            className="control-btn record-btn"
            onClick={handleStartRecording}
            title="Start recording"
          >
            <span className="btn-icon">🎤</span>
            <span className="btn-text">Record</span>
          </button>
        ) : (
          <>
            {/* Pause/Resume */}
            <button 
              className="control-btn pause-resume-btn"
              onClick={isPaused ? handleResumeRecording : handlePauseRecording}
              title={isPaused ? 'Resume recording' : 'Pause recording'}
            >
              <span className="btn-icon">{isPaused ? '▶️' : '⏸️'}</span>
              <span className="btn-text">{isPaused ? 'Resume' : 'Pause'}</span>
            </button>

            {/* Stop */}
            <button 
              className="control-btn stop-btn"
              onClick={handleStopRecording}
              title="Stop and save recording"
            >
              <span className="btn-icon">⏹️</span>
              <span className="btn-text">Stop</span>
            </button>

            {/* Cancel */}
            <button 
              className="control-btn cancel-btn"
              onClick={handleCancelRecording}
              title="Cancel recording"
            >
              <span className="btn-icon">❌</span>
              <span className="btn-text">Cancel</span>
            </button>
          </>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="recorder-error">
          <span className="error-icon">⚠️</span>
          <span className="error-text">{error}</span>
        </div>
      )}

      {/* Recording Info */}
      {!isRecording && !compact && (
        <div className="recorder-info">
          <div className="info-item">
            <span className="info-label">Max Duration:</span>
            <span className="info-value">{formatDuration(maxDuration)}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Format:</span>
            <span className="info-value">
              {enhancedVoiceRecorderService.config.mimeType.split(';')[0]}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

// Generate a deterministic-looking waveform from the audio URL string
function generateWaveformBars(seed = '', count = 30) {
  const bars = [];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  for (let i = 0; i < count; i++) {
    h = (Math.imul(1664525, h) + 1013904223) | 0;
    const raw = ((h >>> 0) % 80) + 15; // 15–95%
    bars.push(raw);
  }
  return bars;
}

// Audio Playback Component for recorded messages
export const VoiceMessagePlayer = ({ 
  audioUrl, 
  duration, 
  className = '',
  compact = false,
  isSent = false
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration || 0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const audioRef = useRef(null);
  const progressRef = useRef(null);
  const waveformBars = useState(() => generateWaveformBars(audioUrl || '', 36))[0];

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => { if (!isDragging) setCurrentTime(audio.currentTime * 1000); };
    const handleDurationChange = () => { setTotalDuration(audio.duration * 1000); };
    const handleEnded = () => { setIsPlaying(false); setCurrentTime(0); };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);
    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [isDragging]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = playbackRate;
  }, [playbackRate]);

  const togglePlayback = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) { audio.pause(); setIsPlaying(false); }
    else { audio.play(); setIsPlaying(true); }
  };

  const seekTo = useCallback((e) => {
    const audio = audioRef.current;
    const track = progressRef.current;
    if (!audio || !track) return;
    const rect = track.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const newTime = pos * (totalDuration / 1000);
    audio.currentTime = newTime;
    setCurrentTime(newTime * 1000);
  }, [totalDuration]);

  const formatTime = (ms) => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  };

  const progress = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;
  const playedBarCount = Math.round((progress / 100) * waveformBars.length);
  const speeds = [1, 1.5, 2, 0.5];

  const cycleSpeed = () => {
    const next = speeds[(speeds.indexOf(playbackRate) + 1) % speeds.length];
    setPlaybackRate(next);
  };

  return (
    <div className={`voice-message-player ${compact ? 'compact' : ''} ${isSent ? 'sent' : 'received'} ${className}`}>
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      {/* Play/Pause */}
      <button className="vmp-play-btn" onClick={togglePlayback} title={isPlaying ? 'Pause' : 'Play'}>
        {isPlaying
          ? <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
          : <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M8 5v14l11-7z"/></svg>
        }
      </button>

      {/* Waveform + time */}
      <div className="vmp-body">
        {/* Waveform scrubber */}
        <div
          ref={progressRef}
          className="vmp-waveform"
          onMouseDown={(e) => { setIsDragging(true); seekTo(e); }}
          onMouseMove={(e) => { if (isDragging) seekTo(e); }}
          onMouseUp={() => setIsDragging(false)}
          onMouseLeave={() => setIsDragging(false)}
          onTouchStart={(e) => { setIsDragging(true); seekTo(e); }}
          onTouchMove={(e) => { if (isDragging) seekTo(e); }}
          onTouchEnd={() => setIsDragging(false)}
        >
          {waveformBars.map((h, i) => (
            <div
              key={i}
              className={`vmp-bar ${i < playedBarCount ? 'played' : ''}`}
              style={{ height: `${h}%` }}
            />
          ))}
        </div>

        {/* Time row */}
        <div className="vmp-times">
          <span className="vmp-current">{formatTime(currentTime)}</span>
          <span className="vmp-total">{formatTime(totalDuration)}</span>
        </div>
      </div>

      {/* Speed button */}
      <button className="vmp-speed-btn" onClick={cycleSpeed} title="Change playback speed">
        {playbackRate}×
      </button>
    </div>
  );
};

export default VoiceRecorder;