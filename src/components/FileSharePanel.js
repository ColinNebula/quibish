import React, { useState, useEffect, useRef, useCallback } from 'react';
import fileShareService from '../services/fileShareService';
import './FileSharePanel.css';

const FileSharePanel = ({ userId, conversationId, onClose, onFileSelect }) => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFiles, setSelectedFiles] = useState(new Set());
  const fileInputRef = useRef(null);

  // Add body class when panel opens, remove on close
  useEffect(() => {
    document.body.classList.add('file-share-open');
    return () => {
      document.body.classList.remove('file-share-open');
    };
  }, []);

  // Load files
  useEffect(() => {
    loadFiles();
    
    // Subscribe to upload events
    const handleUploadProgress = ({ fileId, progress, file }) => {
      setUploading(prev => {
        const index = prev.findIndex(f => f.id === fileId);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = { ...updated[index], progress };
          return updated;
        }
        return [...prev, { ...file, progress }];
      });
    };

    const handleUploadComplete = ({ file }) => {
      setUploading(prev => prev.filter(f => f.id !== file.id));
      loadFiles();
    };

    const handleUploadError = ({ fileId }) => {
      setUploading(prev => prev.filter(f => f.id !== fileId));
    };

    const handleFileDeleted = () => {
      loadFiles();
    };

    fileShareService.on('onUploadProgress', handleUploadProgress);
    fileShareService.on('onUploadComplete', handleUploadComplete);
    fileShareService.on('onUploadError', handleUploadError);
    fileShareService.on('onFileDeleted', handleFileDeleted);

    return () => {
      fileShareService.off('onUploadProgress', handleUploadProgress);
      fileShareService.off('onUploadComplete', handleUploadComplete);
      fileShareService.off('onUploadError', handleUploadError);
      fileShareService.off('onFileDeleted', handleFileDeleted);
    };
  }, [conversationId, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadFiles = useCallback(async () => {
    try {
      let loadedFiles;
      if (conversationId) {
        loadedFiles = await fileShareService.getConversationFiles(conversationId);
      } else {
        loadedFiles = await fileShareService.getUserFiles(userId);
      }
      setFiles(loadedFiles);
    } catch (error) {
      console.error('Failed to load files:', error);
    }
  }, [conversationId, userId]);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      await handleFileUpload(droppedFiles);
    }
  }, [userId, conversationId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFileInputChange = useCallback(async (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length > 0) {
      await handleFileUpload(selectedFiles);
    }
    // Reset input
    e.target.value = '';
  }, [userId, conversationId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFileUpload = async (filesToUpload) => {
    try {
      await fileShareService.uploadFiles(filesToUpload, {
        userId,
        conversationId
      });
    } catch (error) {
      console.error('Upload error:', error);
    }
  };

  const handleFileClick = (file) => {
    if (onFileSelect) {
      onFileSelect(file);
    }
  };

  const handleFileDelete = async (fileId, e) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this file?')) {
      try {
        await fileShareService.deleteFile(fileId);
      } catch (error) {
        console.error('Delete error:', error);
      }
    }
  };

  const handleFileDownload = async (fileId, e) => {
    e.stopPropagation();
    try {
      await fileShareService.downloadFile(fileId);
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  const toggleFileSelection = (fileId, e) => {
    e.stopPropagation();
    setSelectedFiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fileId)) {
        newSet.delete(fileId);
      } else {
        newSet.add(fileId);
      }
      return newSet;
    });
  };

  const handleBulkDelete = async () => {
    if (window.confirm(`Delete ${selectedFiles.size} selected files?`)) {
      try {
        for (const fileId of selectedFiles) {
          await fileShareService.deleteFile(fileId);
        }
        setSelectedFiles(new Set());
      } catch (error) {
        console.error('Bulk delete error:', error);
      }
    }
  };

  const getFileIcon = (file) => {
    const category = file.category;
    const icons = {
      images: '🖼️',
      videos: '🎥',
      audio: '🎵',
      documents: '📄',
      archives: '📦',
      other: '📎'
    };
    return icons[category] || icons.other;
  };

  // Filter files
  const filteredFiles = files.filter(file => {
    // Filter by category
    if (filter !== 'all' && file.category !== filter) {
      return false;
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return file.name.toLowerCase().includes(query) ||
             file.description.toLowerCase().includes(query) ||
             file.tags.some(tag => tag.toLowerCase().includes(query));
    }
    
    return true;
  });

  return (
    <div className="file-share-panel">
      <div className="file-share-header">
        <h2>📁 File Sharing</h2>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>

      {/* Upload Area */}
      <div
        className={`upload-area ${dragActive ? 'drag-active' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileInputChange}
          style={{ display: 'none' }}
        />
        <div className="upload-icon">📤</div>
        <p className="upload-text">
          {dragActive ? 'Drop files here' : 'Click or drag files to upload'}
        </p>
        <p className="upload-hint">
          Max 100MB • Images, Videos, Audio, Documents, Archives
        </p>
      </div>

      {/* Uploading Progress */}
      {uploading.length > 0 && (
        <div className="uploading-section">
          <h3>Uploading ({uploading.length})</h3>
          {uploading.map(file => (
            <div key={file.id} className="upload-progress-item">
              <div className="upload-info">
                <span className="file-icon">{getFileIcon(file)}</span>
                <div className="upload-details">
                  <div className="upload-name">{file.name}</div>
                  <div className="upload-size">
                    {fileShareService.formatFileSize(file.size)}
                  </div>
                </div>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${file.progress}%` }}
                />
              </div>
              <div className="progress-text">{Math.round(file.progress)}%</div>
            </div>
          ))}
        </div>
      )}

      {/* Filter and Search */}
      <div className="file-controls">
        <div className="filter-tabs">
          <button
            className={filter === 'all' ? 'active' : ''}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button
            className={filter === 'images' ? 'active' : ''}
            onClick={() => setFilter('images')}
          >
            🖼️ Images
          </button>
          <button
            className={filter === 'videos' ? 'active' : ''}
            onClick={() => setFilter('videos')}
          >
            🎥 Videos
          </button>
          <button
            className={filter === 'documents' ? 'active' : ''}
            onClick={() => setFilter('documents')}
          >
            📄 Docs
          </button>
          <button
            className={filter === 'audio' ? 'active' : ''}
            onClick={() => setFilter('audio')}
          >
            🎵 Audio
          </button>
        </div>

        <div className="search-box">
          <input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedFiles.size > 0 && (
        <div className="bulk-actions">
          <span>{selectedFiles.size} selected</span>
          <button onClick={handleBulkDelete} className="bulk-delete-btn">
            🗑️ Delete Selected
          </button>
          <button onClick={() => setSelectedFiles(new Set())} className="bulk-clear-btn">
            Clear Selection
          </button>
        </div>
      )}

      {/* File List */}
      <div className="file-list">
        {filteredFiles.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <p>No files found</p>
            <p className="empty-hint">Upload files to get started</p>
          </div>
        ) : (
          <div className="file-grid">
            {filteredFiles.map(file => (
              <div
                key={file.id}
                className={`file-item ${selectedFiles.has(file.id) ? 'selected' : ''}`}
                onClick={() => handleFileClick(file)}
              >
                <div className="file-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedFiles.has(file.id)}
                    onChange={(e) => toggleFileSelection(file.id, e)}
                  />
                </div>

                {file.thumbnail ? (
                  <div
                    className="file-thumbnail"
                    style={{ backgroundImage: `url(${file.thumbnail})` }}
                  />
                ) : (
                  <div className="file-icon-large">
                    {getFileIcon(file)}
                  </div>
                )}

                <div className="file-details">
                  <div className="file-name" title={file.name}>
                    {file.name}
                  </div>
                  <div className="file-meta">
                    <span>{fileShareService.formatFileSize(file.size)}</span>
                    <span>•</span>
                    <span>{new Date(file.uploadDate).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="file-actions">
                  <button
                    className="file-action-btn download"
                    onClick={(e) => handleFileDownload(file.id, e)}
                    title="Download"
                  >
                    ⬇️
                  </button>
                  <button
                    className="file-action-btn delete"
                    onClick={(e) => handleFileDelete(file.id, e)}
                    title="Delete"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FileSharePanel;
