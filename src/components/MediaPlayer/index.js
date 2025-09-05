import React, { useState, useRef, useEffect } from 'react';
import './MediaPlayer.css';

/**
 * MediaPlayer component for displaying photos and videos
 * in a consistent way with various controls
 */
const MediaPlayer = ({ 
  type, 
  url, 
  thumbnail = null,
  title = '',
  autoPlay = false,
  onLike = () => {},
  onShare = () => {},
  onDownload = () => {},
  isLiked = false,
  likeCount = 0
}) => {
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  // Used in toggleFullscreen function
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [aspectRatio, setAspectRatio] = useState('standard'); // standard or wide
  const mediaRef = useRef(null);

  // Handle media loading
  const handleMediaLoad = (e) => {
    setIsLoaded(true);
    setHasError(false);
    
    // Determine aspect ratio for photos and videos
    if (type === 'photo') {
      const img = e.target;
      if (img.naturalWidth / img.naturalHeight > 1.2) {
        setAspectRatio('wide');
      }
    } else if (type === 'video') {
      const video = e.target;
      if (video.videoWidth / video.videoHeight > 1.2) {
        setAspectRatio('wide');
      }
    }
  };

  // Handle errors
  const handleMediaError = () => {
    setIsLoaded(false);
    setHasError(true);
  };

  // Toggle play state for videos
  const togglePlay = () => {
    if (!mediaRef.current) return;
    
    if (mediaRef.current.paused) {
      mediaRef.current.play();
      setIsPlaying(true);
    } else {
      mediaRef.current.pause();
      setIsPlaying(false);
    }
  };

  // Toggle fullscreen view
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Clean up when unmounting
  useEffect(() => {
    return () => {
      if (type === 'video' && mediaRef.current) {
        mediaRef.current.pause();
      }
    };
  }, [type]);

  // Handle fullscreen view for photos and videos
  const renderFullscreen = () => {
    if (!isFullscreen) return null;

    return (
      <div className="fullscreen-media" onClick={toggleFullscreen}>
        <div className="fullscreen-close">×</div>
        {type === 'photo' && <img src={url} alt={title} onClick={(e) => e.stopPropagation()} />}
        {type === 'video' && (
          <video
            src={url}
            controls
            autoPlay
            onClick={(e) => e.stopPropagation()}
          />
        )}
      </div>
    );
  };

  return (
    <div className="media-player">
      <div className={`media-container ${aspectRatio === 'wide' ? 'wide' : ''}`}>
        {type === 'photo' && (
          <img 
            src={url} 
            alt={title || 'Photo'}
            onClick={toggleFullscreen}
            onLoad={handleMediaLoad}
            onError={handleMediaError}
          />
        )}
        
        {type === 'video' && (
          <>
            <video
              ref={mediaRef}
              src={url}
              poster={thumbnail}
              preload="metadata"
              onClick={togglePlay}
              onLoadedMetadata={handleMediaLoad}
              onError={handleMediaError}
            />
            
            {!isPlaying && (
              <div className="media-play-overlay" onClick={togglePlay}>
                <div className="media-play-button">
                  <span>▶</span>
                </div>
              </div>
            )}
          </>
        )}
        
        {!isLoaded && !hasError && (
          <div className="media-loading">
            <div className="media-loading-spinner"></div>
          </div>
        )}
        
        {hasError && (
          <div className="media-error">
            Failed to load media
          </div>
        )}
      </div>
      
      <div className="media-controls">
        <div className="media-info">
          <div className="media-title">{title || (type === 'photo' ? 'Photo' : 'Video')}</div>
          <div className="media-metadata">
            {type === 'photo' ? 'Photo' : 'Video'}
          </div>
        </div>
        
        <div className="media-actions">
          <button 
            className={`media-action-button ${isLiked ? 'liked' : ''}`} 
            onClick={onLike}
            title={isLiked ? "Unlike" : "Like"}
          >
            {isLiked ? "❤️" : "🤍"}
            {likeCount > 0 && <span className="like-count">{likeCount}</span>}
          </button>
          
          <button 
            className="media-action-button" 
            onClick={toggleFullscreen}
            title="View fullscreen"
          >
            🔍
          </button>
          
          <button 
            className="media-action-button" 
            onClick={onShare}
            title="Share"
          >
            📤
          </button>
          
          <button 
            className="media-action-button" 
            onClick={onDownload}
            title="Download"
          >
            ⬇️
          </button>
        </div>
      </div>
      
      {renderFullscreen()}
    </div>
  );
};

export default MediaPlayer;
