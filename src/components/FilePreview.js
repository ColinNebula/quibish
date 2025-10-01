import React, { useState, useEffect } from 'react';
import fileShareService from '../services/fileShareService';
import './FilePreview.css';

const FilePreview = ({ fileId, onClose }) => {
  const [file, setFile] = useState(null);
  const [blobUrl, setBlobUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadFile();
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [fileId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadFile = async () => {
    try {
      setLoading(true);
      const { blob, metadata } = await fileShareService.getFileBlob(fileId);
      const url = URL.createObjectURL(blob);
      setBlobUrl(url);
      setFile(metadata);
      setLoading(false);
    } catch (err) {
      console.error('Failed to load file:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      await fileShareService.downloadFile(fileId);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this file?')) {
      try {
        await fileShareService.deleteFile(fileId);
        onClose();
      } catch (err) {
        console.error('Delete failed:', err);
      }
    }
  };

  const renderPreview = () => {
    if (!file || !blobUrl) return null;

    const { category, type } = file;

    // Image preview
    if (category === 'images') {
      return (
        <div className="preview-content image-preview">
          <img src={blobUrl} alt={file.name} />
        </div>
      );
    }

    // Video preview
    if (category === 'videos') {
      return (
        <div className="preview-content video-preview">
          <video controls src={blobUrl}>
            Your browser does not support video playback.
          </video>
        </div>
      );
    }

    // Audio preview
    if (category === 'audio') {
      return (
        <div className="preview-content audio-preview">
          <div className="audio-icon">🎵</div>
          <audio controls src={blobUrl}>
            Your browser does not support audio playback.
          </audio>
        </div>
      );
    }

    // PDF preview
    if (type === 'application/pdf') {
      return (
        <div className="preview-content pdf-preview">
          <iframe src={blobUrl} title={file.name} />
        </div>
      );
    }

    // Text preview
    if (type === 'text/plain') {
      return (
        <div className="preview-content text-preview">
          <iframe src={blobUrl} title={file.name} />
        </div>
      );
    }

    // Document/Other - show download option
    return (
      <div className="preview-content generic-preview">
        <div className="generic-icon">📄</div>
        <h3>{file.name}</h3>
        <p className="generic-hint">
          This file type cannot be previewed in the browser
        </p>
        <button className="download-preview-btn" onClick={handleDownload}>
          ⬇️ Download to View
        </button>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="file-preview-modal">
        <div className="file-preview-content loading">
          <div className="loader-spinner"></div>
          <p>Loading preview...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="file-preview-modal">
        <div className="file-preview-content error">
          <div className="error-icon">⚠️</div>
          <h3>Failed to load file</h3>
          <p>{error}</p>
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="file-preview-modal" onClick={onClose}>
      <div className="file-preview-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="preview-header">
          <div className="preview-info">
            <h2>{file.name}</h2>
            <div className="preview-meta">
              <span>{fileShareService.formatFileSize(file.size)}</span>
              <span>•</span>
              <span>{new Date(file.uploadDate).toLocaleString()}</span>
            </div>
          </div>
          <button className="preview-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Preview Area */}
        {renderPreview()}

        {/* Actions */}
        <div className="preview-actions">
          <button className="preview-btn download-btn" onClick={handleDownload}>
            ⬇️ Download
          </button>
          <button className="preview-btn delete-btn" onClick={handleDelete}>
            🗑️ Delete
          </button>
        </div>

        {/* Additional Info */}
        {file.description && (
          <div className="preview-description">
            <h4>Description</h4>
            <p>{file.description}</p>
          </div>
        )}

        {file.tags && file.tags.length > 0 && (
          <div className="preview-tags">
            <h4>Tags</h4>
            <div className="tag-list">
              {file.tags.map((tag, index) => (
                <span key={index} className="tag">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FilePreview;
