import React, { useState, useEffect } from 'react';
import './EnhancedMediaGallery.css';
import userDataService from '../../services/userDataService';

const EnhancedMediaGallery = ({ userUploads, userId, isOwnProfile, onRefresh }) => {
  const [filteredUploads, setFilteredUploads] = useState(userUploads || []);
  const [activeFilter, setActiveFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [viewMode, setViewMode] = useState('grid');
  const [showStats, setShowStats] = useState(false);
  const [loading, setLoading] = useState(false);

  // Filter and sort uploads
  useEffect(() => {
    let filtered = [...(userUploads || [])];

    // Apply type filter
    if (activeFilter !== 'all') {
      filtered = filtered.filter(item => item.type === activeFilter);
    }

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      if (sortBy === 'date') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      } else if (sortBy === 'size') {
        aValue = parseInt(aValue) || 0;
        bValue = parseInt(bValue) || 0;
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredUploads(filtered);
  }, [userUploads, activeFilter, searchQuery, sortBy, sortDirection]);

  const filterOptions = [
    { value: 'all', label: 'All Files', icon: '📁', count: userUploads?.length || 0 },
    { value: 'image', label: 'Images', icon: '🖼️', count: userUploads?.filter(item => item.type === 'image').length || 0 },
    { value: 'video', label: 'Videos', icon: '🎥', count: userUploads?.filter(item => item.type === 'video').length || 0 },
    { value: 'gif', label: 'GIFs', icon: '✨', count: userUploads?.filter(item => item.type === 'gif').length || 0 },
    { value: 'document', label: 'Documents', icon: '📄', count: userUploads?.filter(item => item.type === 'document').length || 0 }
  ];

  const sortOptions = [
    { value: 'date', label: 'Date' },
    { value: 'name', label: 'Name' },
    { value: 'size', label: 'Size' },
    { value: 'type', label: 'Type' }
  ];

  const handleItemSelect = (itemId) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedItems.size === filteredUploads.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredUploads.map(item => item.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (!isOwnProfile || selectedItems.size === 0) return;

    setLoading(true);
    try {
      const deletePromises = Array.from(selectedItems).map(itemId => {
        const item = filteredUploads.find(u => u.id === itemId);
        return userDataService.deleteMediaItem(item.type, itemId);
      });

      await Promise.all(deletePromises);
      setSelectedItems(new Set());
      onRefresh && onRefresh();
    } catch (error) {
      console.error('Error deleting items:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getFileIcon = (type) => {
    switch (type) {
      case 'image': return '🖼️';
      case 'video': return '🎥';
      case 'gif': return '✨';
      case 'document': return '📄';
      default: return '📁';
    }
  };

  const calculateStats = () => {
    const totalSize = userUploads?.reduce((sum, item) => sum + (item.size || 0), 0) || 0;
    const types = userUploads?.reduce((acc, item) => {
      acc[item.type] = (acc[item.type] || 0) + 1;
      return acc;
    }, {}) || {};

    return {
      totalFiles: userUploads?.length || 0,
      totalSize: formatFileSize(totalSize),
      types,
      averageSize: userUploads?.length ? formatFileSize(totalSize / userUploads.length) : '0 Bytes'
    };
  };

  const stats = calculateStats();

  const MediaItem = ({ item, isSelected, onSelect, onView }) => (
    <div className={`media-item ${isSelected ? 'selected' : ''} ${viewMode}`}>
      {isOwnProfile && (
        <div className="item-checkbox">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onSelect(item.id)}
          />
        </div>
      )}

      <div className="item-preview" onClick={() => onView(item)}>
        {item.type === 'image' && (
          <img src={item.url} alt={item.name} loading="lazy" />
        )}
        {item.type === 'video' && (
          <div className="video-preview">
            {item.thumbnailUrl ? (
              <img src={item.thumbnailUrl} alt={item.name} loading="lazy" />
            ) : (
              <div className="video-placeholder">🎥</div>
            )}
            <div className="video-overlay">▶️</div>
          </div>
        )}
        {item.type === 'gif' && (
          <img src={item.url} alt={item.name} loading="lazy" />
        )}
        {item.type === 'document' && (
          <div className="document-preview">
            <span className="file-icon">{getFileIcon(item.type)}</span>
            <span className="file-extension">{item.name.split('.').pop()?.toUpperCase()}</span>
          </div>
        )}
      </div>

      <div className="item-info">
        <span className="item-name" title={item.name}>{item.name}</span>
        <div className="item-meta">
          <span className="item-size">{formatFileSize(item.size)}</span>
          <span className="item-date">{formatDate(item.date)}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="enhanced-media-gallery">
      {/* Controls */}
      <div className="gallery-controls">
        <div className="search-section">
          <div className="search-input-wrapper">
            <input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            <span className="search-icon">🔍</span>
          </div>
        </div>

        <div className="filter-section">
          <div className="filter-buttons">
            {filterOptions.map(option => (
              <button
                key={option.value}
                className={`filter-btn ${activeFilter === option.value ? 'active' : ''}`}
                onClick={() => setActiveFilter(option.value)}
              >
                <span className="filter-icon">{option.icon}</span>
                <span className="filter-label">{option.label}</span>
                <span className="filter-count">({option.count})</span>
              </button>
            ))}
          </div>
        </div>

        <div className="view-controls">
          <div className="sort-controls">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="sort-select"
            >
              {sortOptions.map(option => (
                <option key={option.value} value={option.value}>
                  Sort by {option.label}
                </option>
              ))}
            </select>
            <button
              className="sort-direction-btn"
              onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
              title={`Sort ${sortDirection === 'asc' ? 'Descending' : 'Ascending'}`}
            >
              {sortDirection === 'asc' ? '↑' : '↓'}
            </button>
          </div>

          <div className="view-mode-controls">
            <button
              className={`view-mode-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid View"
            >
              ⊞
            </button>
            <button
              className={`view-mode-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="List View"
            >
              ☰
            </button>
          </div>

          <button
            className={`stats-btn ${showStats ? 'active' : ''}`}
            onClick={() => setShowStats(!showStats)}
            title="Toggle Statistics"
          >
            📊
          </button>
        </div>
      </div>

      {/* Statistics Panel */}
      {showStats && (
        <div className="stats-panel">
          <h4>📊 Media Statistics</h4>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-label">Total Files:</span>
              <span className="stat-value">{stats.totalFiles}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Total Size:</span>
              <span className="stat-value">{stats.totalSize}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Average Size:</span>
              <span className="stat-value">{stats.averageSize}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">File Types:</span>
              <div className="type-breakdown">
                {Object.entries(stats.types).map(([type, count]) => (
                  <span key={type} className="type-stat">
                    {getFileIcon(type)} {count}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Actions */}
      {isOwnProfile && selectedItems.size > 0 && (
        <div className="bulk-actions">
          <span className="selection-count">
            {selectedItems.size} of {filteredUploads.length} selected
          </span>
          <div className="bulk-buttons">
            <button onClick={handleSelectAll} className="select-all-btn">
              {selectedItems.size === filteredUploads.length ? 'Deselect All' : 'Select All'}
            </button>
            <button
              onClick={handleBulkDelete}
              className="bulk-delete-btn"
              disabled={loading}
            >
              {loading ? 'Deleting...' : `Delete (${selectedItems.size})`}
            </button>
          </div>
        </div>
      )}

      {/* Media Grid/List */}
      <div className={`media-container ${viewMode}`}>
        {filteredUploads.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📂</div>
            <h3>No files found</h3>
            <p>
              {searchQuery 
                ? `No files match "${searchQuery}"` 
                : activeFilter !== 'all' 
                  ? `No ${activeFilter} files found`
                  : 'No files uploaded yet'
              }
            </p>
          </div>
        ) : (
          filteredUploads.map(item => (
            <MediaItem
              key={item.id}
              item={item}
              isSelected={selectedItems.has(item.id)}
              onSelect={handleItemSelect}
              onView={(item) => {
                // Handle item view - could open a modal or navigate
                console.log('Viewing item:', item);
              }}
            />
          ))
        )}
      </div>

      {/* Results Summary */}
      <div className="results-summary">
        Showing {filteredUploads.length} of {userUploads?.length || 0} files
        {searchQuery && ` matching "${searchQuery}"`}
        {activeFilter !== 'all' && ` (${activeFilter} only)`}
      </div>
    </div>
  );
};

export default EnhancedMediaGallery;