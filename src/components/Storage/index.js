import React, { useState, useEffect } from 'react';
import userDataService from '../../services/userDataService';
import './Storage.css';

const Storage = ({ user, onClose }) => {
  const [storageStats, setStorageStats] = useState(null);
  const [mediaItems, setMediaItems] = useState({
    photos: [],
    videos: [],
    audio: [],
    files: []
  });
  const [favorites, setFavorites] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  
  // Fetch storage usage and media items
  useEffect(() => {
    const fetchStorageData = async () => {
      try {
        setLoading(true);
        
        // Get storage usage stats
        const stats = await userDataService.getStorageUsage();
        setStorageStats(stats);
        
        // Get media counts and samples
        const photos = await userDataService.getMediaItems('photo', { limit: 10 });
        const videos = await userDataService.getMediaItems('video', { limit: 10 });
        const audio = await userDataService.getMediaItems('audio', { limit: 10 });
        const files = await userDataService.getMediaItems('file', { limit: 10 });
        
        setMediaItems({
          photos,
          videos,
          audio,
          files
        });
        
        // Get favorites
        const favs = await userDataService.getFavorites({ limit: 10 });
        setFavorites(favs);
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching storage data:', err);
        setError('Failed to load your storage data. Please try again.');
        setLoading(false);
      }
    };
    
    fetchStorageData();
  }, [user?.username]);
  
  // Handle item selection for batch operations
  const toggleItemSelection = (item) => {
    if (selectedItems.find(selected => selected.id === item.id)) {
      setSelectedItems(selectedItems.filter(selected => selected.id !== item.id));
    } else {
      setSelectedItems([...selectedItems, item]);
    }
  };
  
  // Handle favorite toggle
  const handleToggleFavorite = async (item) => {
    try {
      const updatedItem = await userDataService.toggleFavorite(item);
      
      // Update the UI based on the result
      if (updatedItem.isFavorite) {
        // Item was added to favorites
        setFavorites(prev => [updatedItem, ...prev]);
      } else {
        // Item was removed from favorites
        setFavorites(prev => prev.filter(fav => fav.id !== item.id));
      }
      
      // Also update the item in its respective media array
      const itemType = item.type.toLowerCase();
      if (mediaItems[itemType + 's']) {
        setMediaItems(prev => ({
          ...prev,
          [itemType + 's']: prev[itemType + 's'].map(i => 
            i.id === item.id ? { ...i, isFavorite: updatedItem.isFavorite } : i
          )
        }));
      }
    } catch (err) {
      console.error('Error toggling favorite:', err);
      setError('Failed to update favorite status.');
    }
  };
  
  // Handle delete items
  const handleDeleteItems = async () => {
    if (selectedItems.length === 0) return;
    
    try {
      setLoading(true);
      
      // Delete each selected item
      for (const item of selectedItems) {
        await userDataService.deleteMediaItem(item.type, item.id);
      }
      
      // Refresh the data
      const photos = await userDataService.getMediaItems('photo', { limit: 10 });
      const videos = await userDataService.getMediaItems('video', { limit: 10 });
      const audio = await userDataService.getMediaItems('audio', { limit: 10 });
      const files = await userDataService.getMediaItems('file', { limit: 10 });
      
      setMediaItems({
        photos,
        videos,
        audio,
        files
      });
      
      // Refresh favorites too
      const favs = await userDataService.getFavorites({ limit: 10 });
      setFavorites(favs);
      
      // Update storage stats
      const stats = await userDataService.getStorageUsage();
      setStorageStats(stats);
      
      // Clear selection
      setSelectedItems([]);
      setConfirmDelete(false);
      setLoading(false);
    } catch (err) {
      console.error('Error deleting items:', err);
      setError('Failed to delete selected items.');
      setLoading(false);
    }
  };
  
  // Format bytes to human-readable size
  const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
  };
  
  // Render thumbnail for media item
  const renderThumbnail = (item) => {
    if (!item) return null;
    
    switch (item.type) {
      case 'photo':
        return (
          <div className="thumbnail">
            <img 
              src={item.url || item.dataUrl} 
              alt={item.name || 'Photo'} 
              className="media-thumbnail"
            />
            <div className="thumbnail-overlay">
              <div className="thumbnail-actions">
                <button 
                  onClick={() => handleToggleFavorite(item)}
                  className={`favorite-btn ${item.isFavorite ? 'favorited' : ''}`}
                >
                  {item.isFavorite ? '❤️' : '🤍'}
                </button>
                <button 
                  onClick={() => toggleItemSelection(item)}
                  className={`select-btn ${selectedItems.find(i => i.id === item.id) ? 'selected' : ''}`}
                >
                  {selectedItems.find(i => i.id === item.id) ? '✓' : ''}
                </button>
              </div>
            </div>
          </div>
        );
        
      case 'video':
        return (
          <div className="thumbnail">
            <div className="video-thumbnail">
              {item.thumbnail ? (
                <img src={item.thumbnail} alt="Video thumbnail" />
              ) : (
                <div className="video-icon">🎬</div>
              )}
              <div className="play-icon">▶️</div>
            </div>
            <div className="thumbnail-overlay">
              <div className="thumbnail-actions">
                <button 
                  onClick={() => handleToggleFavorite(item)}
                  className={`favorite-btn ${item.isFavorite ? 'favorited' : ''}`}
                >
                  {item.isFavorite ? '❤️' : '🤍'}
                </button>
                <button 
                  onClick={() => toggleItemSelection(item)}
                  className={`select-btn ${selectedItems.find(i => i.id === item.id) ? 'selected' : ''}`}
                >
                  {selectedItems.find(i => i.id === item.id) ? '✓' : ''}
                </button>
              </div>
            </div>
          </div>
        );
        
      case 'audio':
      case 'voice':
        return (
          <div className="thumbnail audio-thumbnail">
            <div className="audio-icon">🎵</div>
            <div className="audio-name">{item.name || 'Audio recording'}</div>
            <div className="thumbnail-overlay">
              <div className="thumbnail-actions">
                <button 
                  onClick={() => handleToggleFavorite(item)}
                  className={`favorite-btn ${item.isFavorite ? 'favorited' : ''}`}
                >
                  {item.isFavorite ? '❤️' : '🤍'}
                </button>
                <button 
                  onClick={() => toggleItemSelection(item)}
                  className={`select-btn ${selectedItems.find(i => i.id === item.id) ? 'selected' : ''}`}
                >
                  {selectedItems.find(i => i.id === item.id) ? '✓' : ''}
                </button>
              </div>
            </div>
          </div>
        );
        
      case 'file':
        return (
          <div className="thumbnail file-thumbnail">
            <div className="file-icon">📄</div>
            <div className="file-name">{item.name || 'File'}</div>
            <div className="thumbnail-overlay">
              <div className="thumbnail-actions">
                <button 
                  onClick={() => handleToggleFavorite(item)}
                  className={`favorite-btn ${item.isFavorite ? 'favorited' : ''}`}
                >
                  {item.isFavorite ? '❤️' : '🤍'}
                </button>
                <button 
                  onClick={() => toggleItemSelection(item)}
                  className={`select-btn ${selectedItems.find(i => i.id === item.id) ? 'selected' : ''}`}
                >
                  {selectedItems.find(i => i.id === item.id) ? '✓' : ''}
                </button>
              </div>
            </div>
          </div>
        );
        
      default:
        return (
          <div className="thumbnail default-thumbnail">
            <div className="default-icon">📁</div>
            <div className="default-name">{item.name || 'File'}</div>
          </div>
        );
    }
  };
  
  return (
    <div className="storage-manager">
      <div className="storage-header">
        <h2>Storage Manager</h2>
        <button onClick={onClose} className="close-btn">✖</button>
      </div>
      
      {loading && <div className="loading">Loading your storage data...</div>}
      
      {error && (
        <div className="error-message">
          <span>{error}</span>
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}
      
      <div className="storage-tabs">
        <button 
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={`tab-btn ${activeTab === 'photos' ? 'active' : ''}`}
          onClick={() => setActiveTab('photos')}
        >
          Photos
        </button>
        <button 
          className={`tab-btn ${activeTab === 'videos' ? 'active' : ''}`}
          onClick={() => setActiveTab('videos')}
        >
          Videos
        </button>
        <button 
          className={`tab-btn ${activeTab === 'audio' ? 'active' : ''}`}
          onClick={() => setActiveTab('audio')}
        >
          Audio
        </button>
        <button 
          className={`tab-btn ${activeTab === 'files' ? 'active' : ''}`}
          onClick={() => setActiveTab('files')}
        >
          Files
        </button>
        <button 
          className={`tab-btn ${activeTab === 'favorites' ? 'active' : ''}`}
          onClick={() => setActiveTab('favorites')}
        >
          Favorites
        </button>
      </div>
      
      {selectedItems.length > 0 && (
        <div className="batch-actions">
          <span>{selectedItems.length} items selected</span>
          
          {!confirmDelete ? (
            <button 
              className="delete-btn"
              onClick={() => setConfirmDelete(true)}
            >
              Delete Selected
            </button>
          ) : (
            <div className="confirm-delete">
              <span>Are you sure?</span>
              <button 
                className="cancel-btn"
                onClick={() => setConfirmDelete(false)}
              >
                Cancel
              </button>
              <button 
                className="confirm-btn"
                onClick={handleDeleteItems}
              >
                Confirm Delete
              </button>
            </div>
          )}
        </div>
      )}
      
      <div className="storage-content">
        {/* Overview Tab */}
        {activeTab === 'overview' && !loading && storageStats && (
          <div className="storage-overview">
            <div className="storage-usage">
              <h3>Storage Usage</h3>
              <div className="usage-bar">
                <div 
                  className="usage-fill"
                  style={{ width: `${Math.min(storageStats.percentUsed || 0, 100)}%` }}
                ></div>
              </div>
              <div className="usage-stats">
                {storageStats.usage && storageStats.quota ? (
                  <span>
                    {formatBytes(storageStats.usage)} used of {formatBytes(storageStats.quota)} ({storageStats.percentUsed?.toFixed(1)}%)
                  </span>
                ) : (
                  <span>Storage usage information not available</span>
                )}
              </div>
            </div>
            
            <div className="media-stats">
              <div className="stat-card">
                <div className="stat-icon photo-icon">📷</div>
                <div className="stat-info">
                  <h4>Photos</h4>
                  <span>{mediaItems.photos.length} items</span>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon video-icon">🎬</div>
                <div className="stat-info">
                  <h4>Videos</h4>
                  <span>{mediaItems.videos.length} items</span>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon audio-icon">🎵</div>
                <div className="stat-info">
                  <h4>Audio</h4>
                  <span>{mediaItems.audio.length} items</span>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon file-icon">📄</div>
                <div className="stat-info">
                  <h4>Files</h4>
                  <span>{mediaItems.files.length} items</span>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon favorite-icon">❤️</div>
                <div className="stat-info">
                  <h4>Favorites</h4>
                  <span>{favorites.length} items</span>
                </div>
              </div>
            </div>
            
            <div className="recent-media">
              <h3>Recent Media</h3>
              <div className="media-grid">
                {[...mediaItems.photos, ...mediaItems.videos, ...mediaItems.audio, ...mediaItems.files]
                  .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                  .slice(0, 8)
                  .map((item) => (
                    <div key={item.id} className="media-item">
                      {renderThumbnail(item)}
                      <div className="media-meta">
                        <span className="media-date">
                          {new Date(item.timestamp).toLocaleDateString()}
                        </span>
                        <span className="media-type">{item.type}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
        
        {/* Photos Tab */}
        {activeTab === 'photos' && (
          <div className="media-gallery">
            <h3>Photos</h3>
            {mediaItems.photos.length === 0 ? (
              <div className="no-items">
                <span>No photos saved yet</span>
              </div>
            ) : (
              <div className="media-grid">
                {mediaItems.photos.map((photo) => (
                  <div key={photo.id} className="media-item">
                    {renderThumbnail(photo)}
                    <div className="media-meta">
                      <span className="media-date">
                        {new Date(photo.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Videos Tab */}
        {activeTab === 'videos' && (
          <div className="media-gallery">
            <h3>Videos</h3>
            {mediaItems.videos.length === 0 ? (
              <div className="no-items">
                <span>No videos saved yet</span>
              </div>
            ) : (
              <div className="media-grid">
                {mediaItems.videos.map((video) => (
                  <div key={video.id} className="media-item">
                    {renderThumbnail(video)}
                    <div className="media-meta">
                      <span className="media-date">
                        {new Date(video.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Audio Tab */}
        {activeTab === 'audio' && (
          <div className="media-gallery">
            <h3>Audio</h3>
            {mediaItems.audio.length === 0 ? (
              <div className="no-items">
                <span>No audio files saved yet</span>
              </div>
            ) : (
              <div className="media-grid">
                {mediaItems.audio.map((audio) => (
                  <div key={audio.id} className="media-item">
                    {renderThumbnail(audio)}
                    <div className="media-meta">
                      <span className="media-date">
                        {new Date(audio.timestamp).toLocaleDateString()}
                      </span>
                      {audio.duration && <span className="audio-duration">{audio.duration}s</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Files Tab */}
        {activeTab === 'files' && (
          <div className="media-gallery">
            <h3>Files</h3>
            {mediaItems.files.length === 0 ? (
              <div className="no-items">
                <span>No files saved yet</span>
              </div>
            ) : (
              <div className="media-grid">
                {mediaItems.files.map((file) => (
                  <div key={file.id} className="media-item">
                    {renderThumbnail(file)}
                    <div className="media-meta">
                      <span className="media-date">
                        {new Date(file.timestamp).toLocaleDateString()}
                      </span>
                      {file.fileSize && <span className="file-size">{formatBytes(file.fileSize)}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Favorites Tab */}
        {activeTab === 'favorites' && (
          <div className="media-gallery">
            <h3>Favorites</h3>
            {favorites.length === 0 ? (
              <div className="no-items">
                <span>No favorites saved yet</span>
              </div>
            ) : (
              <div className="media-grid">
                {favorites.map((favorite) => (
                  <div key={favorite.id} className="media-item">
                    {renderThumbnail(favorite)}
                    <div className="media-meta">
                      <span className="media-date">
                        {new Date(favorite.timestamp).toLocaleDateString()}
                      </span>
                      <span className="media-type">{favorite.type}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Storage;
