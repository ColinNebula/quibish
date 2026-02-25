import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../context/AuthContext';
import './Stories.css';

// Stories Carousel Component - Shows at top of feed
export const StoriesCarousel = ({ onStoryClick, onCreateStory }) => {
  const { user: currentUser } = useAuth();
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const carouselRef = useRef(null);

  useEffect(() => {
    fetchStories();
  }, []);

  const fetchStories = async () => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const response = await fetch('/api/stories/feed', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        setStories(data.stories);
      }
    } catch (error) {
      console.error('Error fetching stories:', error);
    } finally {
      setLoading(false);
    }
  };

  const scrollCarousel = (direction) => {
    if (carouselRef.current) {
      const scrollAmount = direction === 'left' ? -200 : 200;
      carouselRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <div className="stories-carousel loading">
        <div className="loading-skeleton story-ring-skeleton" />
        <div className="loading-skeleton story-ring-skeleton" />
        <div className="loading-skeleton story-ring-skeleton" />
      </div>
    );
  }

  return (
    <div className="stories-carousel-container">
      <button 
        className="carousel-nav-btn left"
        onClick={() => scrollCarousel('left')}
      >
        ‹
      </button>
      
      <div className="stories-carousel" ref={carouselRef}>
        {/* Your Story / Create Story */}
        <div className="story-ring create-story" onClick={onCreateStory}>
          <div className="story-ring-inner">
            <div 
              className="story-avatar"
              style={{
                backgroundImage: `url(${currentUser?.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(currentUser?.name || 'User')})`
              }}
            />
            <button className="create-story-plus">+</button>
          </div>
          <span className="story-username">Your Story</span>
        </div>

        {/* Friends' Stories */}
        {stories.map(storyGroup => (
          <StoryRing
            key={storyGroup.user_id}
            storyGroup={storyGroup}
            onClick={() => onStoryClick(storyGroup)}
          />
        ))}
      </div>

      <button 
        className="carousel-nav-btn right"
        onClick={() => scrollCarousel('right')}
      >
        ›
      </button>
    </div>
  );
};

// Individual Story Ring Component
const StoryRing = ({ storyGroup, onClick }) => {
  const hasUnseen = storyGroup.stories.some(s => !s.viewed);
  
  return (
    <div 
      className={`story-ring ${hasUnseen ? 'unseen' : 'seen'}`}
      onClick={onClick}
    >
      <div className="story-ring-inner">
        <div 
          className="story-avatar"
          style={{
            backgroundImage: `url(${storyGroup.user_avatar})`
          }}
        />
      </div>
      <span className="story-username">{storyGroup.user_name}</span>
    </div>
  );
};

// Story Viewer Component - Full screen story viewer
export const StoryViewer = ({ initialStoryGroup, allStoryGroups, onClose }) => {
  const { user: currentUser } = useAuth();
  const [currentGroupIndex, setCurrentGroupIndex] = useState(
    allStoryGroups.findIndex(g => g.user_id === initialStoryGroup.user_id)
  );
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showViewers, setShowViewers] = useState(false);
  const [replyText, setReplyText] = useState('');
  const progressInterval = useRef(null);
  const longPressTimer = useRef(null);

  const currentGroup = allStoryGroups[currentGroupIndex];
  const currentStory = currentGroup?.stories[currentStoryIndex];
  const duration = currentStory?.media_type === 'video' ? 
    currentStory?.duration : 5; // 5 seconds for images

  useEffect(() => {
    if (!isPaused && currentStory) {
      startProgress();
    } else {
      stopProgress();
    }

    return () => stopProgress();
  }, [currentStoryIndex, currentGroupIndex, isPaused]);

  useEffect(() => {
    if (currentStory && !currentStory.viewed) {
      markAsViewed();
    }
  }, [currentStory]);

  const startProgress = () => {
    stopProgress();
    setProgress(0);

    progressInterval.current = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          nextStory();
          return 0;
        }
        return prev + (100 / (duration * 10));
      });
    }, 100);
  };

  const stopProgress = () => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
  };

  const markAsViewed = async () => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      await fetch(`/api/stories/${currentStory.id}/view`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (error) {
      console.error('Error marking story as viewed:', error);
    }
  };

  const nextStory = () => {
    if (currentStoryIndex < currentGroup.stories.length - 1) {
      setCurrentStoryIndex(prev => prev + 1);
      setProgress(0);
    } else {
      nextGroup();
    }
  };

  const previousStory = () => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(prev => prev - 1);
      setProgress(0);
    } else {
      previousGroup();
    }
  };

  const nextGroup = () => {
    if (currentGroupIndex < allStoryGroups.length - 1) {
      setCurrentGroupIndex(prev => prev + 1);
      setCurrentStoryIndex(0);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const previousGroup = () => {
    if (currentGroupIndex > 0) {
      setCurrentGroupIndex(prev => prev - 1);
      setCurrentStoryIndex(0);
      setProgress(0);
    }
  };

  const handleMouseDown = () => {
    longPressTimer.current = setTimeout(() => {
      setIsPaused(true);
    }, 200);
  };

  const handleMouseUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
    setIsPaused(false);
  };

  const handleReply = async () => {
    if (!replyText.trim()) return;

    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      await fetch(`/api/stories/${currentStory.id}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message: replyText })
      });

      setReplyText('');
      // Show success message
    } catch (error) {
      console.error('Error sending reply:', error);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this story?')) return;

    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      await fetch(`/api/stories/${currentStory.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      // Remove from list and move to next
      const updatedStories = currentGroup.stories.filter(s => s.id !== currentStory.id);
      if (updatedStories.length === 0) {
        onClose();
      } else {
        nextStory();
      }
    } catch (error) {
      console.error('Error deleting story:', error);
    }
  };

  const isOwnStory = currentGroup?.user_id === currentUser?.id;

  return (
    <div className="story-viewer-overlay">
      <div className="story-viewer">
        {/* Progress Bars */}
        <div className="story-progress-bars">
          {currentGroup?.stories.map((_, index) => (
            <div key={index} className="progress-bar-container">
              <div 
                className="progress-bar"
                style={{
                  width: index === currentStoryIndex ? `${progress}%` :
                         index < currentStoryIndex ? '100%' : '0%'
                }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="story-header">
          <div className="story-user-info">
            <img 
              src={currentGroup?.user_avatar} 
              alt={currentGroup?.user_name}
              className="story-user-avatar"
            />
            <div className="story-user-details">
              <span className="story-user-name">{currentGroup?.user_name}</span>
              <span className="story-timestamp">
                {formatRelativeTime(currentStory?.created_at)}
              </span>
            </div>
          </div>

          <div className="story-header-actions">
            {isOwnStory ? (
              <>
                <button 
                  className="story-action-btn"
                  onClick={() => setShowViewers(!showViewers)}
                >
                  👁️ {currentStory?.views_count || 0}
                </button>
                <button 
                  className="story-action-btn"
                  onClick={handleDelete}
                >
                  🗑️
                </button>
              </>
            ) : (
              <>
                <button className="story-action-btn">⋯</button>
              </>
            )}
            <button 
              className="story-action-btn close"
              onClick={onClose}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Story Content */}
        <div 
          className="story-content"
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchEnd={handleMouseUp}
        >
          {/* Navigation Areas */}
          <div className="story-nav-area left" onClick={previousStory} />
          <div className="story-nav-area right" onClick={nextStory} />

          {/* Media */}
          {currentStory?.media_type === 'photo' ? (
            <img 
              src={currentStory.media_url} 
              alt="Story"
              className="story-media"
            />
          ) : (
            <video 
              src={currentStory?.media_url}
              className="story-media"
              autoPlay
              muted
            />
          )}

          {/* Text Overlay */}
          {currentStory?.text_overlay && (
            <div className="story-text-overlay">
              {currentStory.text_overlay}
            </div>
          )}
        </div>

        {/* Footer / Reply Input */}
        {!isOwnStory && (
          <div className="story-footer">
            <input
              type="text"
              placeholder={`Reply to ${currentGroup?.user_name}...`}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleReply()}
              className="story-reply-input"
            />
            <button 
              className="story-reply-send"
              onClick={handleReply}
              disabled={!replyText.trim()}
            >
              ➤
            </button>
          </div>
        )}

        {/* Viewers List (for own stories) */}
        {isOwnStory && showViewers && (
          <StoryViewers 
            storyId={currentStory?.id}
            onClose={() => setShowViewers(false)}
          />
        )}
      </div>
    </div>
  );
};

// Story Viewers Component
const StoryViewers = ({ storyId, onClose }) => {
  const [viewers, setViewers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchViewers();
  }, [storyId]);

  const fetchViewers = async () => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const response = await fetch(`/api/stories/${storyId}/viewers`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        setViewers(data.viewers);
      }
    } catch (error) {
      console.error('Error fetching viewers:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="story-viewers-panel">
      <div className="viewers-header">
        <h3>Viewers</h3>
        <button onClick={onClose}>✕</button>
      </div>
      <div className="viewers-list">
        {loading ? (
          <div className="loading-state">Loading viewers...</div>
        ) : viewers.length === 0 ? (
          <div className="empty-state">No views yet</div>
        ) : (
          viewers.map(viewer => (
            <div key={viewer.id} className="viewer-item">
              <img src={viewer.avatar} alt={viewer.name} />
              <div className="viewer-info">
                <span className="viewer-name">{viewer.name}</span>
                <span className="viewer-time">
                  {formatRelativeTime(viewer.viewed_at)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// Story Creator Component
export const StoryCreator = ({ onClose, onStoryCreated }) => {
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [mediaType, setMediaType] = useState(null);
  const [textOverlay, setTextOverlay] = useState('');
  const [backgroundColor, setBackgroundColor] = useState('#667eea');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const type = file.type.startsWith('image/') ? 'photo' : 'video';
    setMediaType(type);
    setSelectedMedia(URL.createObjectURL(file));
  };

  const captureFromCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' },
        audio: false 
      });
      
      // Show camera preview and capture
      // Implementation would need a camera component
      console.log('Camera capture not fully implemented in this demo');
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Unable to access camera');
    }
  };

  const handleCreateStory = async () => {
    if (!selectedMedia && !textOverlay) {
      alert('Please add media or text to your story');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      
      // If there's a file
      if (fileInputRef.current?.files[0]) {
        formData.append('media', fileInputRef.current.files[0]);
        formData.append('media_type', mediaType);
      }

      formData.append('text_overlay', textOverlay);
      formData.append('background_color', backgroundColor);

      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const response = await fetch('/api/stories', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();
      
      if (data.success) {
        onStoryCreated?.(data.story);
        onClose();
      } else {
        alert('Failed to create story: ' + data.error);
      }
    } catch (error) {
      console.error('Error creating story:', error);
      alert('Failed to create story');
    } finally {
      setUploading(false);
    }
  };

  const backgroundColors = [
    '#667eea', '#764ba2', '#f093fb', '#4facfe',
    '#43e97b', '#fa709a', '#fee140', '#30cfd0'
  ];

  return (
    <div className="story-creator-overlay">
      <div className="story-creator">
        <div className="creator-header">
          <button onClick={onClose}>✕</button>
          <h3>Create Story</h3>
          <button 
            onClick={handleCreateStory}
            disabled={uploading || (!selectedMedia && !textOverlay)}
            className="create-btn"
          >
            {uploading ? 'Posting...' : 'Share'}
          </button>
        </div>

        <div className="creator-canvas" style={{ backgroundColor }}>
          {selectedMedia ? (
            mediaType === 'photo' ? (
              <img src={selectedMedia} alt="Story" className="preview-media" />
            ) : (
              <video 
                ref={videoRef}
                src={selectedMedia}
                className="preview-media"
                controls
              />
            )
          ) : (
            <div className="empty-canvas">
              <p>Add photo/video or create text story</p>
            </div>
          )}

          {textOverlay && (
            <div className="text-overlay-preview">
              {textOverlay}
            </div>
          )}
        </div>

        <div className="creator-tools">
          <button onClick={() => fileInputRef.current?.click()}>
            📷 Photo/Video
          </button>
          <button onClick={() => setTextOverlay(prompt('Enter text:') || '')}>
            Aa Text
          </button>
          <button>✨ Filters</button>
          <button>🎨 Draw</button>
        </div>

        <div className="color-picker">
          {backgroundColors.map(color => (
            <button
              key={color}
              className={`color-option ${backgroundColor === color ? 'active' : ''}`}
              style={{ backgroundColor: color }}
              onClick={() => setBackgroundColor(color)}
            />
          ))}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          hidden
          onChange={handleFileSelect}
        />
      </div>
    </div>
  );
};

// Utility function
const formatRelativeTime = (timestamp) => {
  const now = new Date();
  const past = new Date(timestamp);
  const diffMs = now - past;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return past.toLocaleDateString();
};

export default StoriesCarousel;
