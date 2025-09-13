/**
 * Enhanced Media Viewer with Gesture Support
 * Supports pinch-to-zoom, rotation, swipe navigation, and accessibility
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import advancedGestureService from '../../services/advancedGestureService';

const EnhancedMediaViewer = ({
  media = [],
  currentIndex = 0,
  isOpen = false,
  onClose = () => {},
  onNavigate = () => {},
  showControls = true,
  autoPlay = false,
  enableGestures = true
}) => {
  const [viewerState, setViewerState] = useState({
    scale: 1,
    rotation: 0,
    translateX: 0,
    translateY: 0,
    isDragging: false,
    isZoomed: false
  });
  
  const [currentMediaIndex, setCurrentMediaIndex] = useState(currentIndex);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const mediaRef = useRef(null);
  const containerRef = useRef(null);
  const gestureStartRef = useRef({});
  const animationRef = useRef(null);
  
  const currentMedia = media[currentMediaIndex];
  const isVideo = currentMedia?.type?.startsWith('video/');
  const isImage = currentMedia?.type?.startsWith('image/');

  /**
   * Initialize gesture handling
   */
  useEffect(() => {
    if (!enableGestures || !containerRef.current) return;

    const container = containerRef.current;
    
    // Setup gesture event listeners
    const handlePinchStart = (e) => {
      if (!isImage) return;
      
      gestureStartRef.current = {
        scale: viewerState.scale,
        rotation: viewerState.rotation,
        translateX: viewerState.translateX,
        translateY: viewerState.translateY
      };
      
      setViewerState(prev => ({
        ...prev,
        isDragging: true
      }));
    };

    const handlePinchMove = (e) => {
      if (!isImage || !gestureStartRef.current) return;
      
      const { scale, center } = e.detail;
      const newScale = Math.max(0.5, Math.min(5, gestureStartRef.current.scale * scale));
      
      setViewerState(prev => ({
        ...prev,
        scale: newScale,
        isZoomed: newScale > 1
      }));
    };

    const handlePinchEnd = (e) => {
      if (!isImage) return;
      
      setViewerState(prev => ({
        ...prev,
        isDragging: false
      }));
      
      // Snap to reasonable scale values
      const { scale } = viewerState;
      let snapScale = scale;
      
      if (scale < 0.8) {
        snapScale = 1;
      } else if (scale > 4) {
        snapScale = 4;
      }
      
      if (snapScale !== scale) {
        animateToScale(snapScale);
      }
    };

    const handleRotateMove = (e) => {
      if (!isImage) return;
      
      const { rotation } = e.detail;
      setViewerState(prev => ({
        ...prev,
        rotation: gestureStartRef.current.rotation + rotation
      }));
    };

    const handleDoubleTap = (e) => {
      if (!isImage) return;
      
      const { scale, isZoomed } = viewerState;
      const targetScale = isZoomed ? 1 : 2.5;
      
      animateToScale(targetScale);
    };

    const handleSwipeEnd = (e) => {
      const { direction, distance, velocity } = e.detail;
      
      // Navigation swipes (only when not zoomed)
      if (!viewerState.isZoomed && distance > 100) {
        if (direction === 'left' && currentMediaIndex < media.length - 1) {
          navigateMedia(1);
        } else if (direction === 'right' && currentMediaIndex > 0) {
          navigateMedia(-1);
        }
      }
      
      // Close on swipe down
      if (direction === 'down' && distance > 150) {
        onClose();
      }
    };

    const handleLongPress = (e) => {
      // Show media info or context menu
      showMediaInfo();
    };

    // Add event listeners
    container.addEventListener('gesturepinchstart', handlePinchStart);
    container.addEventListener('gesturepinchmove', handlePinchMove);
    container.addEventListener('gesturepinchend', handlePinchEnd);
    container.addEventListener('gesturerotatemove', handleRotateMove);
    container.addEventListener('gesturedoubletap', handleDoubleTap);
    container.addEventListener('gestureswipeend', handleSwipeEnd);
    container.addEventListener('gesturelongpress', handleLongPress);

    return () => {
      container.removeEventListener('gesturepinchstart', handlePinchStart);
      container.removeEventListener('gesturepinchmove', handlePinchMove);
      container.removeEventListener('gesturepinchend', handlePinchEnd);
      container.removeEventListener('gesturerotatemove', handleRotateMove);
      container.removeEventListener('gesturedoubletap', handleDoubleTap);
      container.removeEventListener('gestureswipeend', handleSwipeEnd);
      container.removeEventListener('gesturelongpress', handleLongPress);
    };
  }, [enableGestures, viewerState, currentMediaIndex, media.length, isImage]);

  /**
   * Reset viewer state when media changes
   */
  useEffect(() => {
    setViewerState({
      scale: 1,
      rotation: 0,
      translateX: 0,
      translateY: 0,
      isDragging: false,
      isZoomed: false
    });
    setError(null);
  }, [currentMediaIndex]);

  /**
   * Update current index when prop changes
   */
  useEffect(() => {
    setCurrentMediaIndex(currentIndex);
  }, [currentIndex]);

  /**
   * Animate to target scale
   */
  const animateToScale = useCallback((targetScale, duration = 300) => {
    const startScale = viewerState.scale;
    const startTime = performance.now();
    
    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      
      const currentScale = startScale + (targetScale - startScale) * easeProgress;
      
      setViewerState(prev => ({
        ...prev,
        scale: currentScale,
        isZoomed: currentScale > 1
      }));
      
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    animationRef.current = requestAnimationFrame(animate);
  }, [viewerState.scale]);

  /**
   * Navigate between media items
   */
  const navigateMedia = useCallback((direction) => {
    const newIndex = currentMediaIndex + direction;
    
    if (newIndex >= 0 && newIndex < media.length) {
      setCurrentMediaIndex(newIndex);
      onNavigate(newIndex);
    }
  }, [currentMediaIndex, media.length, onNavigate]);

  /**
   * Handle keyboard navigation
   */
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          navigateMedia(-1);
          break;
        case 'ArrowRight':
          navigateMedia(1);
          break;
        case '+':
        case '=':
          animateToScale(Math.min(viewerState.scale * 1.2, 5));
          break;
        case '-':
          animateToScale(Math.max(viewerState.scale * 0.8, 0.5));
          break;
        case '0':
          animateToScale(1);
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, navigateMedia, viewerState.scale, animateToScale]);

  /**
   * Show media information
   */
  const showMediaInfo = useCallback(() => {
    // Implementation for showing media metadata
    console.log('Media info:', currentMedia);
  }, [currentMedia]);

  /**
   * Handle media load error
   */
  const handleMediaError = useCallback(() => {
    setError('Failed to load media');
    setIsLoading(false);
  }, []);

  /**
   * Handle media load success
   */
  const handleMediaLoad = useCallback(() => {
    setIsLoading(false);
    setError(null);
  }, []);

  /**
   * Get transform style for media
   */
  const getMediaTransform = useCallback(() => {
    const { scale, rotation, translateX, translateY } = viewerState;
    
    return {
      transform: `scale(${scale}) rotate(${rotation}deg) translate(${translateX}px, ${translateY}px)`,
      transformOrigin: 'center center',
      transition: viewerState.isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
    };
  }, [viewerState]);

  if (!isOpen || !currentMedia) {
    return null;
  }

  return (
    <div 
      className="enhanced-media-viewer"
      ref={containerRef}
      data-media-viewer="true"
      aria-label="Media viewer"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div 
        className="media-viewer-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Media Container */}
      <div className="media-viewer-content">
        {/* Loading State */}
        {isLoading && (
          <div className="media-viewer-loading">
            <div className="loading-spinner" />
            <p>Loading media...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="media-viewer-error">
            <div className="error-icon">⚠️</div>
            <p>{error}</p>
            <button onClick={() => setError(null)}>Retry</button>
          </div>
        )}

        {/* Media Display */}
        {!error && (
          <div className="media-display-container">
            {isImage && (
              <img
                ref={mediaRef}
                src={currentMedia.url}
                alt={currentMedia.alt || 'Media'}
                className={`media-image ${viewerState.isZoomed ? 'zoomed' : ''}`}
                style={getMediaTransform()}
                onLoad={handleMediaLoad}
                onError={handleMediaError}
                draggable={false}
              />
            )}

            {isVideo && (
              <video
                ref={mediaRef}
                src={currentMedia.url}
                className="media-video"
                controls
                autoPlay={autoPlay}
                onLoadedData={handleMediaLoad}
                onError={handleMediaError}
              />
            )}
          </div>
        )}

        {/* Controls */}
        {showControls && (
          <div className="media-viewer-controls">
            {/* Close Button */}
            <button
              className="control-button close-button"
              onClick={onClose}
              aria-label="Close viewer"
            >
              ✕
            </button>

            {/* Navigation */}
            {media.length > 1 && (
              <>
                <button
                  className="control-button nav-button prev-button"
                  onClick={() => navigateMedia(-1)}
                  disabled={currentMediaIndex === 0}
                  aria-label="Previous media"
                >
                  ←
                </button>
                <button
                  className="control-button nav-button next-button"
                  onClick={() => navigateMedia(1)}
                  disabled={currentMediaIndex === media.length - 1}
                  aria-label="Next media"
                >
                  →
                </button>
              </>
            )}

            {/* Zoom Controls for Images */}
            {isImage && (
              <div className="zoom-controls">
                <button
                  className="control-button zoom-button"
                  onClick={() => animateToScale(Math.max(viewerState.scale * 0.8, 0.5))}
                  aria-label="Zoom out"
                >
                  −
                </button>
                <span className="zoom-level">
                  {Math.round(viewerState.scale * 100)}%
                </span>
                <button
                  className="control-button zoom-button"
                  onClick={() => animateToScale(Math.min(viewerState.scale * 1.2, 5))}
                  aria-label="Zoom in"
                >
                  +
                </button>
                <button
                  className="control-button reset-button"
                  onClick={() => animateToScale(1)}
                  aria-label="Reset zoom"
                >
                  Reset
                </button>
              </div>
            )}
          </div>
        )}

        {/* Media Info */}
        <div className="media-viewer-info">
          <span className="media-counter">
            {currentMediaIndex + 1} of {media.length}
          </span>
          {currentMedia.name && (
            <span className="media-name">{currentMedia.name}</span>
          )}
        </div>

        {/* Gesture Hints */}
        {enableGestures && isImage && (
          <div className="gesture-hints">
            <p>💡 Double tap to zoom • Pinch to zoom • Swipe to navigate</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedMediaViewer;