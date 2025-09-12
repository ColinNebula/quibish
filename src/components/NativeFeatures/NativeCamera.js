import React, { useState, useRef, useEffect } from 'react';
import { deviceUtils } from '../../services/nativeDeviceFeaturesService';
import { mobileUtils } from '../../services/mobileInteractionService';
import './NativeCamera.css';

const NativeCamera = ({ onCapture, onClose, mode = 'photo' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [facingMode, setFacingMode] = useState('user');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const recordingIntervalRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  useEffect(() => {
    setIsOpen(true);
  }, []);

  const startCamera = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1920, max: 1920 },
          height: { ideal: 1080, max: 1080 }
        },
        audio: mode === 'video'
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      
      console.log('✅ Camera started');
    } catch (err) {
      console.error('❌ Camera access failed:', err);
      setError('Camera access denied. Please check permissions.');
    } finally {
      setIsLoading(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    mobileUtils.haptic('medium');
    setIsLoading(true);

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      // Set canvas size to video size
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert to blob
      canvas.toBlob((blob) => {
        if (blob) {
          const photo = {
            blob,
            dataUrl: canvas.toDataURL('image/jpeg', 0.9),
            width: canvas.width,
            height: canvas.height,
            timestamp: Date.now(),
            type: 'photo'
          };

          onCapture(photo);
          handleClose();
        }
      }, 'image/jpeg', 0.9);
      
    } catch (err) {
      console.error('❌ Photo capture failed:', err);
      setError('Failed to capture photo');
    } finally {
      setIsLoading(false);
    }
  };

  const startVideoRecording = async () => {
    if (!stream) return;

    mobileUtils.haptic('medium');
    setIsRecording(true);
    setRecordingTime(0);

    try {
      const mediaRecorder = new MediaRecorder(stream);
      const chunks = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const video = {
          blob,
          url: URL.createObjectURL(blob),
          duration: recordingTime,
          timestamp: Date.now(),
          type: 'video'
        };

        onCapture(video);
        setIsRecording(false);
        handleClose();
      };

      mediaRecorder.start();

      // Start recording timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      // Auto-stop after 30 seconds
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          stopVideoRecording(mediaRecorder);
        }
      }, 30000);

      // Store reference for manual stop
      window.currentMediaRecorder = mediaRecorder;
      
    } catch (err) {
      console.error('❌ Video recording failed:', err);
      setError('Failed to start recording');
      setIsRecording(false);
    }
  };

  const stopVideoRecording = (mediaRecorder = window.currentMediaRecorder) => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      mobileUtils.haptic('light');
    }
    
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
  };

  const switchCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    mobileUtils.haptic('light');
  };

  const handleClose = () => {
    stopCamera();
    setIsOpen(false);
    onClose();
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="native-camera-overlay">
      <div className="native-camera-container">
        {/* Camera Header */}
        <div className="camera-header">
          <button 
            className="camera-btn close-btn touch-target touch-ripple"
            onClick={handleClose}
            aria-label="Close camera"
          >
            ✕
          </button>
          
          <div className="camera-mode">
            {mode === 'photo' ? '📷 Photo' : '🎥 Video'}
          </div>
          
          <button 
            className="camera-btn switch-btn touch-target touch-ripple"
            onClick={switchCamera}
            aria-label="Switch camera"
            disabled={isLoading}
          >
            🔄
          </button>
        </div>

        {/* Camera Preview */}
        <div className="camera-preview">
          {isLoading && (
            <div className="camera-loading">
              <div className="loading-spinner"></div>
              <p>Starting camera...</p>
            </div>
          )}
          
          {error && (
            <div className="camera-error">
              <p>{error}</p>
              <button 
                className="retry-btn touch-target"
                onClick={startCamera}
              >
                Retry
              </button>
            </div>
          )}
          
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="camera-video"
            style={{ display: error ? 'none' : 'block' }}
          />
          
          <canvas
            ref={canvasRef}
            style={{ display: 'none' }}
          />
          
          {/* Recording indicator */}
          {isRecording && (
            <div className="recording-indicator">
              <div className="recording-dot"></div>
              <span>{formatTime(recordingTime)}</span>
            </div>
          )}
          
          {/* Camera overlay guidelines */}
          <div className="camera-guidelines">
            <div className="guideline horizontal"></div>
            <div className="guideline vertical"></div>
          </div>
        </div>

        {/* Camera Controls */}
        <div className="camera-controls">
          {mode === 'photo' ? (
            <button
              className="capture-btn photo-btn touch-target touch-ripple haptic-medium"
              onClick={capturePhoto}
              disabled={isLoading || !stream}
              aria-label="Take photo"
            >
              <div className="capture-inner"></div>
            </button>
          ) : (
            <button
              className={`capture-btn video-btn touch-target touch-ripple haptic-medium ${isRecording ? 'recording' : ''}`}
              onClick={isRecording ? () => stopVideoRecording() : startVideoRecording}
              disabled={isLoading || !stream}
              aria-label={isRecording ? 'Stop recording' : 'Start recording'}
            >
              <div className="capture-inner"></div>
            </button>
          )}
        </div>

        {/* Camera Tips */}
        <div className="camera-tips">
          {mode === 'photo' ? (
            <p>Tap the circle to take a photo</p>
          ) : (
            <p>{isRecording ? 'Tap to stop recording' : 'Tap to start recording (max 30s)'}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default NativeCamera;