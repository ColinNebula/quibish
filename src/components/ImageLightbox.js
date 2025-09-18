import React, { useState, useEffect, useCallback, useRef } from 'react';
import './ImageLightbox.css';

const ImageLightbox = ({ 
  images = [], 
  initialIndex = 0, 
  isOpen = false, 
  onClose,
  showThumbnails = true,
  showZoom = true,
  showDownload = true,
  allowFullscreen = true,
  className = ""
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  
  const imageRef = useRef(null);
  const containerRef = useRef(null);

  const currentImage = images[currentIndex];

  // Reset state when opening/closing or changing images
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setIsZoomed(false);
      setZoomLevel(1);
      setImagePosition({ x: 0, y: 0 });
      setIsLoading(true);
      setLoadError(false);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, initialIndex]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      switch (e.key) {
        case 'Escape':
          onClose?.();
          break;
        case 'ArrowLeft':
          goToPrevious();
          break;
        case 'ArrowRight':
          goToNext();
          break;
        case ' ':
          e.preventDefault();
          toggleZoom();
          break;
        case 'f':
        case 'F':
          if (allowFullscreen) {
            toggleFullscreen();
          }
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, allowFullscreen]);

  // Navigation functions
  const goToNext = useCallback(() => {
    if (images.length > 1) {
      setCurrentIndex((prev) => (prev + 1) % images.length);
      resetImageState();
    }
  }, [images.length]);

  const goToPrevious = useCallback(() => {
    if (images.length > 1) {
      setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
      resetImageState();
    }
  }, [images.length]);

  const goToImage = useCallback((index) => {
    setCurrentIndex(index);
    resetImageState();
  }, []);

  const resetImageState = useCallback(() => {
    setIsZoomed(false);
    setZoomLevel(1);
    setImagePosition({ x: 0, y: 0 });
    setIsLoading(true);
    setLoadError(false);
  }, []);

  // Zoom functions
  const toggleZoom = useCallback(() => {
    if (isZoomed) {
      setIsZoomed(false);
      setZoomLevel(1);
      setImagePosition({ x: 0, y: 0 });
    } else {
      setIsZoomed(true);
      setZoomLevel(2);
    }
  }, [isZoomed]);

  const handleZoom = useCallback((delta, centerX, centerY) => {
    const newZoomLevel = Math.max(1, Math.min(4, zoomLevel + delta));
    
    if (newZoomLevel === 1) {
      setIsZoomed(false);
      setZoomLevel(1);
      setImagePosition({ x: 0, y: 0 });
    } else {
      setIsZoomed(true);
      setZoomLevel(newZoomLevel);
      
      // Calculate new position to zoom towards center point
      const rect = imageRef.current?.getBoundingClientRect();
      if (rect) {
        const x = (centerX - rect.left - rect.width / 2) * 0.2;
        const y = (centerY - rect.top - rect.height / 2) * 0.2;
        setImagePosition({ x: -x, y: -y });
      }
    }
  }, [zoomLevel]);

  // Mouse wheel zoom
  const handleWheel = useCallback((e) => {
    if (isOpen && currentImage) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.3 : 0.3;
      handleZoom(delta, e.clientX, e.clientY);
    }
  }, [isOpen, currentImage, handleZoom]);

  // Mouse drag for panning
  const handleMouseDown = useCallback((e) => {
    if (isZoomed) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - imagePosition.x, y: e.clientY - imagePosition.y });
    }
  }, [isZoomed, imagePosition]);

  const handleMouseMove = useCallback((e) => {
    if (isDragging && isZoomed) {
      setImagePosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  }, [isDragging, isZoomed, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Touch gestures for mobile
  const [touchStart, setTouchStart] = useState(null);
  const [touchDistance, setTouchDistance] = useState(0);

  const handleTouchStart = useCallback((e) => {
    if (e.touches.length === 1) {
      setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    } else if (e.touches.length === 2) {
      const distance = Math.sqrt(
        Math.pow(e.touches[0].clientX - e.touches[1].clientX, 2) +
        Math.pow(e.touches[0].clientY - e.touches[1].clientY, 2)
      );
      setTouchDistance(distance);
    }
  }, []);

  const handleTouchMove = useCallback((e) => {
    e.preventDefault();
    
    if (e.touches.length === 2 && touchDistance > 0) {
      const newDistance = Math.sqrt(
        Math.pow(e.touches[0].clientX - e.touches[1].clientX, 2) +
        Math.pow(e.touches[0].clientY - e.touches[1].clientY, 2)
      );
      const delta = (newDistance - touchDistance) * 0.01;
      const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      handleZoom(delta, centerX, centerY);
      setTouchDistance(newDistance);
    }
  }, [touchDistance, handleZoom]);

  const handleTouchEnd = useCallback((e) => {
    if (e.touches.length === 0) {
      setTouchStart(null);
      setTouchDistance(0);
    }
  }, []);

  // Fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }, []);

  // Download image
  const downloadImage = useCallback(() => {
    if (currentImage) {
      const link = document.createElement('a');
      link.href = currentImage.src;
      link.download = currentImage.name || `image-${currentIndex + 1}`;
      link.click();
    }
  }, [currentImage, currentIndex]);

  // Image load handlers
  const handleImageLoad = useCallback(() => {
    setIsLoading(false);
    setLoadError(false);
  }, []);

  const handleImageError = useCallback(() => {
    setIsLoading(false);
    setLoadError(true);
  }, []);

  if (!isOpen || !currentImage) return null;

  return (
    <div 
      ref={containerRef}
      className={`image-lightbox ${className}`}
      onWheel={handleWheel}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Overlay */}
      <div 
        className="lightbox-overlay"
        onClick={onClose}
      />

      {/* Main Content */}
      <div className="lightbox-content">
        {/* Header */}
        <div className="lightbox-header">
          <div className="image-info">
            <h3 className="image-title">{currentImage.title || currentImage.name}</h3>
            <span className="image-counter">
              {currentIndex + 1} of {images.length}
            </span>
          </div>
          
          <div className="lightbox-controls">
            {showZoom && (
              <>
                <button
                  className="control-btn zoom-out"
                  onClick={() => handleZoom(-0.5, window.innerWidth / 2, window.innerHeight / 2)}
                  title="Zoom out"
                  disabled={zoomLevel <= 1}
                >
                  🔍−
                </button>
                <span className="zoom-level">{Math.round(zoomLevel * 100)}%</span>
                <button
                  className="control-btn zoom-in"
                  onClick={() => handleZoom(0.5, window.innerWidth / 2, window.innerHeight / 2)}
                  title="Zoom in"
                  disabled={zoomLevel >= 4}
                >
                  🔍+
                </button>
              </>
            )}
            
            {showDownload && (
              <button
                className="control-btn download"
                onClick={downloadImage}
                title="Download image"
              >
                📥
              </button>
            )}
            
            {allowFullscreen && (
              <button
                className="control-btn fullscreen"
                onClick={toggleFullscreen}
                title="Toggle fullscreen (F)"
              >
                ⛶
              </button>
            )}
            
            <button
              className="control-btn close"
              onClick={onClose}
              title="Close (Esc)"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Image Container */}
        <div className="image-container">
          {/* Navigation Arrows */}
          {images.length > 1 && (
            <>
              <button
                className="nav-arrow nav-arrow-left"
                onClick={goToPrevious}
                title="Previous image (←)"
              >
                ❮
              </button>
              <button
                className="nav-arrow nav-arrow-right"
                onClick={goToNext}
                title="Next image (→)"
              >
                ❯
              </button>
            </>
          )}

          {/* Main Image */}
          <div 
            className={`main-image-wrapper ${isZoomed ? 'zoomed' : ''} ${isDragging ? 'dragging' : ''}`}
            onClick={isZoomed ? undefined : toggleZoom}
            onMouseDown={handleMouseDown}
            style={{
              cursor: isZoomed ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in'
            }}
          >
            {isLoading && (
              <div className="image-loading">
                <div className="loading-spinner"></div>
                <span>Loading...</span>
              </div>
            )}
            
            {loadError && (
              <div className="image-error">
                <span>⚠️</span>
                <p>Failed to load image</p>
                <button onClick={() => setIsLoading(true)}>Retry</button>
              </div>
            )}
            
            <img
              ref={imageRef}
              src={currentImage.src}
              alt={currentImage.alt || currentImage.title || `Image ${currentIndex + 1}`}
              className="main-image"
              style={{
                transform: `scale(${zoomLevel}) translate(${imagePosition.x}px, ${imagePosition.y}px)`,
                opacity: isLoading ? 0 : 1
              }}
              onLoad={handleImageLoad}
              onError={handleImageError}
              draggable={false}
            />
          </div>
        </div>

        {/* Thumbnails */}
        {showThumbnails && images.length > 1 && (
          <div className="lightbox-thumbnails">
            <div className="thumbnails-container">
              {images.map((image, index) => (
                <button
                  key={index}
                  className={`thumbnail ${index === currentIndex ? 'active' : ''}`}
                  onClick={() => goToImage(index)}
                  title={image.title || `Image ${index + 1}`}
                >
                  <img
                    src={image.thumbnail || image.src}
                    alt={`Thumbnail ${index + 1}`}
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Help Text */}
      <div className="lightbox-help">
        <p>
          Use arrow keys to navigate • Space to zoom • F for fullscreen • Esc to close
        </p>
      </div>
    </div>
  );
};

export default ImageLightbox;