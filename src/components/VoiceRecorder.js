import React, { useState, useEffect, useRef, useCallback } from 'react';
import enhancedVoiceRecorderService from '../services/enhancedVoiceRecorderService';
import './VoiceRecorder.css';

const VoiceRecorder = ({ 
  onRecordingComplete,
  onRecordingCancel,
  onRecordingStart,
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
  
  const durationTimerRef = useRef(null);
  const waveformCanvasRef = useRef(null);
  const volumeBarRef = useRef(null);

  // Initialize the voice recorder service
  useEffect(() => {
    const initialize = async () => {
      const initialized = await enhancedVoiceRecorderService.initialize();
      setIsInitialized(initialized);
      
      if (!initialized) {
        setError('Voice recording is not supported in your browser');
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

  // Start recording
  const handleStartRecording = useCallback(async () => {
    if (!isInitialized) {
      setError('Voice recorder not initialized');
      return;
    }

    setError(null);
    const success = await enhancedVoiceRecorderService.startRecording();
    
    if (!success) {
      setError('Failed to start recording. Please check microphone permissions.');
    }
  }, [isInitialized]);

  // Stop recording
  const handleStopRecording = useCallback(async () => {
    if (duration < minDuration) {
      setError(`Recording too short. Minimum duration is ${minDuration / 1000} seconds.`);
      handleCancelRecording();
      return;
    }

    await enhancedVoiceRecorderService.stopRecording();
  }, [duration, minDuration]);

  // Pause recording
  const handlePauseRecording = useCallback(() => {
    enhancedVoiceRecorderService.pauseRecording();
  }, []);

  // Resume recording
  const handleResumeRecording = useCallback(() => {
    enhancedVoiceRecorderService.resumeRecording();
  }, []);

  // Cancel recording
  const handleCancelRecording = useCallback(() => {
    enhancedVoiceRecorderService.cancelRecording();
    setDuration(0);
    setVolume(0);
    if (onRecordingCancel) onRecordingCancel();
  }, [onRecordingCancel]);

  // Update volume visualization
  const updateVolumeVisualization = (volumeLevel) => {
    if (volumeBarRef.current) {
      const percentage = Math.min(100, Math.max(0, volumeLevel));
      volumeBarRef.current.style.width = `${percentage}%`;
    }

    // Update waveform canvas if available
    if (waveformCanvasRef.current && isRecording) {
      drawWaveform(volumeLevel);
    }
  };

  // Draw waveform visualization
  const drawWaveform = (volumeLevel) => {
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
  };

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

  if (error && !hasPermission) {
    return (
      <div className={`voice-recorder error ${className}`}>
        <div className="recorder-message">
          <span className="error-icon">🎤❌</span>
          <span>{error}</span>
          <button 
            className="retry-btn"
            onClick={handleStartRecording}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`voice-recorder ${isRecording ? 'recording' : ''} ${isPaused ? 'paused' : ''} ${compact ? 'compact' : ''} ${className}`}>
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
        <div className="volume-visualization">
          <div className="volume-meter">
            <div className="volume-label">Volume</div>
            <div className="volume-bar-container">
              <div 
                ref={volumeBarRef}
                className="volume-bar"
                style={{ backgroundColor: getVolumeColor() }}
              ></div>
            </div>
            <div className="volume-value">{volume}%</div>
          </div>

          <div className="waveform-container">
            <canvas 
              ref={waveformCanvasRef}
              className="waveform-canvas"
              width="200"
              height="60"
            ></canvas>
          </div>
        </div>
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

// Audio Playback Component for recorded messages
export const VoiceMessagePlayer = ({ 
  audioUrl, 
  duration, 
  className = '',
  compact = false 
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration || 0);
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime * 1000);
    };

    const handleDurationChange = () => {
      setTotalDuration(audio.duration * 1000);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlayback = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play();
      setIsPlaying(true);
    }
  };

  const handleSeek = (e) => {
    const audio = audioRef.current;
    if (!audio) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const newTime = pos * (totalDuration / 1000);
    
    audio.currentTime = newTime;
    setCurrentTime(newTime * 1000);
  };

  const formatTime = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getProgress = () => {
    return totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;
  };

  return (
    <div className={`voice-message-player ${compact ? 'compact' : ''} ${className}`}>
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      
      <button 
        className="play-pause-btn"
        onClick={togglePlayback}
        title={isPlaying ? 'Pause' : 'Play'}
      >
        <span className="btn-icon">{isPlaying ? '⏸️' : '▶️'}</span>
      </button>

      <div className="playback-info">
        <div 
          className="progress-container"
          onClick={handleSeek}
        >
          <div className="progress-track">
            <div 
              className="progress-fill"
              style={{ width: `${getProgress()}%` }}
            ></div>
          </div>
        </div>

        <div className="time-display">
          <span className="current-time">{formatTime(currentTime)}</span>
          <span className="duration">{formatTime(totalDuration)}</span>
        </div>
      </div>
    </div>
  );
};

export default VoiceRecorder;