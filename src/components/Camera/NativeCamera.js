import React, { useState, useRef, useEffect } from 'react';
import './NativeCamera.css';

const NativeCamera = ({ isOpen, onClose, onCapture, mode = 'photo' }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasPermission, setHasPermission] = useState(null);
  const [stream, setStream] = useState(null);
  const [facingMode, setFacingMode] = useState('user'); // 'user' for front, 'environment' for back
  const [isRecording, setIsRecording] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [flashMode, setFlashMode] = useState('off');
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);

  // Initialize camera when component opens
  useEffect(() => {
    if (isOpen) {
      initializeCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  // Initialize camera access
  const initializeCamera = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Check if mediaDevices is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported in this browser');
      }

      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: mode === 'video'
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      setStream(mediaStream);
      streamRef.current = mediaStream;
      setHasPermission(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }
    } catch (err) {
      console.error('Camera initialization error:', err);
      setError(getErrorMessage(err));
      setHasPermission(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Stop camera and cleanup
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      setStream(null);
    }
    
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Get user-friendly error message
  const getErrorMessage = (err) => {
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      return 'Camera permission denied. Please enable camera access and try again.';
    }
    if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
      return 'No camera found on this device.';
    }
    if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
      return 'Camera is already in use by another application.';
    }
    if (err.name === 'OverconstrainedError') {
      return 'Camera does not support the requested settings.';
    }
    return err.message || 'Failed to access camera. Please try again.';
  };

  // Capture photo
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to blob
    canvas.toBlob((blob) => {
      if (blob && onCapture) {
        const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
        onCapture(file, 'photo');
        onClose();
      }
    }, 'image/jpeg', 0.9);
  };

  // Start video recording
  const startRecording = () => {
    if (!stream) return;

    try {
      const options = {
        mimeType: 'video/webm;codecs=vp9,opus'
      };
      
      // Fallback to supported format
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = 'video/webm';
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
          options.mimeType = 'video/mp4';
        }
      }

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      
      const chunks = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: mediaRecorder.mimeType });
        const file = new File([blob], `video_${Date.now()}.webm`, { type: blob.type });
        
        if (onCapture) {
          onCapture(file, 'video');
        }
        
        setRecordedChunks([]);
        onClose();
      };
      
      mediaRecorder.start(1000); // Record in 1-second chunks
      setIsRecording(true);
      setRecordedChunks(chunks);
    } catch (err) {
      console.error('Recording start error:', err);
      setError('Failed to start recording. Please try again.');
    }
  };

  // Stop video recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Switch between front/back camera
  const switchCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  // Toggle flash (if supported)
  const toggleFlash = async () => {
    if (!stream) return;
    
    try {
      const videoTrack = stream.getVideoTracks()[0];
      const capabilities = videoTrack.getCapabilities();
      
      if (capabilities.torch) {
        const newFlashMode = flashMode === 'off' ? 'on' : 'off';
        await videoTrack.applyConstraints({
          advanced: [{ torch: newFlashMode === 'on' }]
        });
        setFlashMode(newFlashMode);
      }
    } catch (err) {
      console.error('Flash toggle error:', err);
    }
  };

  // Handle overlay click
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="camera-overlay" onClick={handleOverlayClick}>
      <div className="camera-modal">
        <div className="camera-header">
          <button className="camera-close" onClick={onClose}>
            ×
          </button>
          <div className="camera-title">
            {mode === 'photo' ? '📷 Camera' : '🎥 Video'}
          </div>
          <div className="camera-actions">
            <button 
              className={`flash-btn ${flashMode === 'on' ? 'active' : ''}`}
              onClick={toggleFlash}
              title="Toggle Flash"
            >
              ⚡
            </button>
            <button 
              className="switch-camera-btn"
              onClick={switchCamera}
              title="Switch Camera"
            >
              🔄
            </button>
          </div>
        </div>

        <div className="camera-content">
          {isLoading && (
            <div className="camera-loading">
              <div className="loading-spinner"></div>
              <p>Initializing camera...</p>
            </div>
          )}

          {error && (
            <div className="camera-error">
              <div className="error-icon">🚨</div>
              <h4>Camera Error</h4>
              <p>{error}</p>
              <button className="retry-btn" onClick={initializeCamera}>
                Try Again
              </button>
            </div>
          )}

          {hasPermission && !error && (
            <div className="camera-view">
              <video
                ref={videoRef}
                className="camera-video"
                autoPlay
                playsInline
                muted
              />
              <canvas
                ref={canvasRef}
                className="camera-canvas"
                style={{ display: 'none' }}
              />
              
              {isRecording && (
                <div className="recording-indicator">
                  <div className="recording-dot"></div>
                  <span>Recording...</span>
                </div>
              )}
            </div>
          )}
        </div>

        {hasPermission && !error && (
          <div className="camera-controls">
            {mode === 'photo' ? (
              <button className="capture-btn" onClick={capturePhoto}>
                📷 Capture Photo
              </button>
            ) : (
              <div className="video-controls">
                {!isRecording ? (
                  <button className="record-btn" onClick={startRecording}>
                    ● Start Recording
                  </button>
                ) : (
                  <button className="stop-btn" onClick={stopRecording}>
                    ⏹️ Stop Recording
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default NativeCamera;