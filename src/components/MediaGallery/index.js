import React, { useState, useEffect, useRef } from 'react';
import './MediaGallery.css';

/**
 * Enhanced Media Gallery component for displaying photos and videos with advanced features
 */
const MediaGallery = ({ 
  mediaItems = [], 
  onMediaClick, 
  onDeleteMedia, 
  onApplyFilter,
  canDelete = false, 
  title = 'Media Gallery', 
  showThumbnails = true,
  maxHeight = null,
  autoScroll = true
}) => {
  const [activeItem, setActiveItem] = useState(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('none');
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState('grid');
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const galleryRef = useRef(null);

  // Available filters
  const availableFilters = [
    { id: 'none', name: 'Original' },
    { id: 'grayscale', name: 'Grayscale' },
    { id: 'sepia', name: 'Sepia' },
    { id: 'vintage', name: 'Vintage' },
    { id: 'blur', name: 'Soft Blur' },
    { id: 'brightness', name: 'Brighten' },
    { id: 'contrast', name: 'Enhance Contrast' },
    { id: 'saturate', name: 'Vibrant' },
  ];

  // Auto scroll to the end when new items are added
  useEffect(() => {
    if (autoScroll && galleryRef.current && mediaItems.length > 0) {
      galleryRef.current.scrollLeft = galleryRef.current.scrollWidth;
    }
  }, [mediaItems.length, autoScroll]);

  // Handle opening the lightbox
  const handleOpenLightbox = (item) => {
    setActiveItem(item);
    setLightboxOpen(true);
    // Prevent body scrolling when lightbox is open
    document.body.style.overflow = 'hidden';
  };

  // Handle closing the lightbox
  const handleCloseLightbox = () => {
    setLightboxOpen(false);
    setIsZoomed(false);
    setZoomLevel(1);
    // Re-enable body scrolling
    document.body.style.overflow = '';
  };

  // Navigate to next/previous item in lightbox
  const navigateMedia = (direction) => {
    if (!activeItem || mediaItems.length <= 1) return;

    const currentIndex = mediaItems.findIndex(item => item.id === activeItem.id);
    if (currentIndex === -1) return;

    let newIndex = currentIndex + direction;
    
    // Loop around if we reach the end
    if (newIndex < 0) {
      newIndex = mediaItems.length - 1;
    } else if (newIndex >= mediaItems.length) {
      newIndex = 0;
    }

    setActiveItem(mediaItems[newIndex]);
    setIsZoomed(false);
    setZoomLevel(1);
  };

  // Handle zooming in lightbox
  const handleZoom = (e) => {
    if (!lightboxOpen || !activeItem) return;

    if (isZoomed) {
      setIsZoomed(false);
      setZoomLevel(1);
    } else {
      setIsZoomed(true);
      setZoomLevel(2); // Double size on first zoom
    }
  };

  // Handle applying a filter to a photo
  const applyFilter = (filter) => {
    if (onApplyFilter && activeItem) {
      onApplyFilter(activeItem.id, filter);
      setSelectedFilter(filter);
      setFilterMenuOpen(false);
    }
  };

  // Sort media items according to current sort setting
  const sortedMediaItems = [...mediaItems].sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.timestamp) - new Date(a.timestamp);
      case 'oldest':
        return new Date(a.timestamp) - new Date(b.timestamp);
      case 'name':
        return a.name.localeCompare(b.name);
      case 'size':
        return (b.fileSize || 0) - (a.fileSize || 0);
      default:
        return 0;
    }
  });

  // Get CSS class for filter preview
  const getFilterClass = (filterId) => {
    if (filterId === 'none') return '';
    return `filter-${filterId}`;
  };

  // Media item renderer
  const renderMediaItem = (item) => {
    const isVideo = item.type === 'video';
    const isPhoto = item.type === 'photo';
    const thumbnailSrc = isVideo && item.thumbnail ? 
      item.thumbnail : 
      item.url.startsWith('http') ? item.url : `http://localhost:5000${item.url}`;

    return (
      <div 
        key={item.id} 
        className={`media-item ${isVideo ? 'video-item' : 'photo-item'} ${activeItem?.id === item.id ? 'active' : ''}`} 
        onClick={() => handleOpenLightbox(item)}
      >
        {/* Thumbnail with lazy loading */}
        <img 
          src={thumbnailSrc} 
          alt={item.name} 
          className={`media-thumbnail ${getFilterClass(item.filter || 'none')}`} 
          loading="lazy" 
          onError={e => {
            // Fallback to placeholder on error
            e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" fill="%23f0f0f0"/%3E%3Ctext x="50" y="50" font-size="14" text-anchor="middle" alignment-baseline="middle" font-family="Arial" fill="%23999"%3EImage%3C/text%3E%3C/svg%3E';
            e.target.classList.add('error');
          }}
        />
        
        {/* Video duration badge */}
        {isVideo && item.formattedDuration && (
          <div className="duration-badge">
            {item.formattedDuration}
          </div>
        )}

        {/* Delete button if allowed */}
        {canDelete && (
          <button 
            className="delete-button" 
            onClick={(e) => {
              e.stopPropagation();
              onDeleteMedia(item.id);
            }}
            aria-label="Delete media"
          >
            ×
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="enhanced-media-gallery" style={maxHeight ? { maxHeight: `${maxHeight}px` } : {}}>
      {/* Gallery Header */}
      <div className="gallery-header">
        <div className="gallery-title">{title}</div>

        {/* Controls */}
        <div className="gallery-controls">
          {/* Sort control */}
          <div className="control-dropdown">
            <button className="control-button">
              Sort: {sortBy === 'newest' ? 'Newest' : sortBy === 'oldest' ? 'Oldest' : sortBy === 'name' ? 'Name' : 'Size'}
            </button>
            <div className="dropdown-content">
              <div className="dropdown-item" onClick={() => setSortBy('newest')}>Newest</div>
              <div className="dropdown-item" onClick={() => setSortBy('oldest')}>Oldest</div>
              <div className="dropdown-item" onClick={() => setSortBy('name')}>Name</div>
              <div className="dropdown-item" onClick={() => setSortBy('size')}>Size</div>
            </div>
          </div>

          {/* View mode toggle */}
          <button 
            className="control-button view-toggle" 
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
          >
            {viewMode === 'grid' ? 'List View' : 'Grid View'}
          </button>
        </div>
      </div>

      {/* Media Gallery Content */}
      {mediaItems.length === 0 ? (
        <div className="empty-gallery">No media uploaded yet</div>
      ) : (
        <div 
          ref={galleryRef}
          className={`media-container ${viewMode === 'grid' ? 'grid-view' : 'list-view'}`}
        >
          {sortedMediaItems.map(renderMediaItem)}
        </div>
      )}

      {/* Lightbox for viewing media */}
      {lightboxOpen && activeItem && (
        <div className="media-lightbox">
          <div className="lightbox-overlay" onClick={handleCloseLightbox}></div>
          
          <div className="lightbox-content">
            {/* Navigation arrows */}
            {mediaItems.length > 1 && (
              <>
                <button 
                  className="lightbox-nav prev"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigateMedia(-1);
                  }}
                  aria-label="Previous"
                >
                  ‹
                </button>
                <button 
                  className="lightbox-nav next"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigateMedia(1);
                  }}
                  aria-label="Next"
                >
                  ›
                </button>
              </>
            )}

            {/* Close button */}
            <button 
              className="lightbox-close"
              onClick={handleCloseLightbox}
              aria-label="Close"
            >
              ×
            </button>

            {/* Media display */}
            <div className={`lightbox-media-container ${isZoomed ? 'zoomed' : ''}`} onClick={handleZoom}>
              {activeItem.type === 'video' ? (
                <video 
                  src={activeItem.url.startsWith('http') ? activeItem.url : `http://localhost:5000${activeItem.url}`} 
                  className={`lightbox-media ${getFilterClass(activeItem.filter || 'none')}`}
                  controls
                  autoPlay
                  style={{ transform: isZoomed ? `scale(${zoomLevel})` : 'none' }}
                />
              ) : (
                <img 
                  src={activeItem.url.startsWith('http') ? activeItem.url : `http://localhost:5000${activeItem.url}`} 
                  alt={activeItem.name}
                  className={`lightbox-media ${getFilterClass(activeItem.filter || 'none')}`}
                  style={{ transform: isZoomed ? `scale(${zoomLevel})` : 'none' }}
                />
              )}
            </div>

            {/* Media info and actions */}
            <div className="lightbox-info">
              <div className="media-details">
                <h3>{activeItem.name}</h3>
                <p className="upload-info">
                  Uploaded by {activeItem.sender} on {new Date(activeItem.timestamp).toLocaleString()}
                </p>
                {activeItem.dimensions && (
                  <p className="technical-info">
                    {activeItem.dimensions} 
                    {activeItem.fileSize && ` · ${Math.round(activeItem.fileSize / 1024)} KB`}
                  </p>
                )}
              </div>

              <div className="lightbox-actions">
                {/* Filter button for photos */}
                {activeItem.type === 'photo' && onApplyFilter && (
                  <div className="filter-dropdown">
                    <button 
                      className="action-button" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setFilterMenuOpen(!filterMenuOpen);
                      }}
                    >
                      Filters
                    </button>
                    {filterMenuOpen && (
                      <div className="filter-menu">
                        {availableFilters.map(filter => (
                          <div 
                            key={filter.id}
                            className={`filter-option ${selectedFilter === filter.id ? 'active' : ''}`}
                            onClick={() => applyFilter(filter.id)}
                          >
                            <div className={`filter-preview ${getFilterClass(filter.id)}`}></div>
                            <span>{filter.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Download button */}
                <a 
                  className="action-button" 
                  href={activeItem.url.startsWith('http') ? activeItem.url : `http://localhost:5000${activeItem.url}`} 
                  download={activeItem.name}
                  onClick={e => e.stopPropagation()}
                >
                  Download
                </a>

                {/* Delete button if allowed */}
                {canDelete && (
                  <button 
                    className="action-button delete" 
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteMedia(activeItem.id);
                      handleCloseLightbox();
                    }}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MediaGallery;
