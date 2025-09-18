import React, { useState, useRef, useCallback, useEffect } from 'react';
import './EnhancedFileUpload.css';

const EnhancedFileUpload = ({ 
  onFileSelect,
  onFileRemove,
  acceptedTypes = "image/*,video/*,audio/*,.pdf,.doc,.docx,.txt",
  maxFiles = 10,
  maxFileSize = 50 * 1024 * 1024, // 50MB
  multiple = true,
  showPreviews = true,
  showProgress = true,
  className = ""
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [files, setFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({});
  const [compressionProgress, setCompressionProgress] = useState({});
  const fileInputRef = useRef(null);
  const dragCounterRef = useRef(0);

  // File validation
  const validateFile = useCallback((file) => {
    const errors = [];
    
    if (file.size > maxFileSize) {
      errors.push(`File size exceeds ${Math.round(maxFileSize / (1024 * 1024))}MB limit`);
    }
    
    const acceptedTypesArray = acceptedTypes.split(',').map(type => type.trim());
    const isAccepted = acceptedTypesArray.some(type => {
      if (type.includes('*')) {
        const baseType = type.split('/')[0];
        return file.type.startsWith(baseType);
      }
      return file.type === type || file.name.toLowerCase().endsWith(type);
    });
    
    if (!isAccepted) {
      errors.push('File type not supported');
    }
    
    return errors;
  }, [acceptedTypes, maxFileSize]);

  // Handle file selection
  const handleFileSelect = useCallback((selectedFiles) => {
    const fileList = Array.from(selectedFiles);
    
    if (files.length + fileList.length > maxFiles) {
      alert(`Maximum ${maxFiles} files allowed`);
      return;
    }

    const validFiles = [];
    const errors = [];

    fileList.forEach((file, index) => {
      const fileErrors = validateFile(file);
      if (fileErrors.length === 0) {
        const fileObj = {
          id: Date.now() + index,
          file,
          name: file.name,
          size: file.size,
          type: file.type,
          preview: null,
          compressed: null,
          status: 'pending' // pending, compressing, uploading, completed, error
        };
        validFiles.push(fileObj);
      } else {
        errors.push(`${file.name}: ${fileErrors.join(', ')}`);
      }
    });

    if (errors.length > 0) {
      alert('Some files were rejected:\n' + errors.join('\n'));
    }

    if (validFiles.length > 0) {
      setFiles(prev => [...prev, ...validFiles]);
      validFiles.forEach(fileObj => {
        generatePreview(fileObj);
        if (onFileSelect) onFileSelect(fileObj);
      });
    }
  }, [files.length, maxFiles, validateFile, onFileSelect]);

  // Generate file preview
  const generatePreview = useCallback(async (fileObj) => {
    const { file, type, id } = fileObj;

    if (type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFiles(prev => prev.map(f => 
          f.id === id ? { ...f, preview: e.target.result } : f
        ));
        
        // Start compression for images
        if (file.size > 1024 * 1024) { // 1MB
          compressImage(fileObj);
        }
      };
      reader.readAsDataURL(file);
    } else if (type.startsWith('video/')) {
      generateVideoThumbnail(fileObj);
    } else if (type.startsWith('audio/')) {
      setFiles(prev => prev.map(f => 
        f.id === id ? { ...f, preview: '🎵' } : f
      ));
    } else {
      const iconMap = {
        'application/pdf': '📄',
        'application/msword': '📝',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📝',
        'text/plain': '📄',
        'default': '📁'
      };
      setFiles(prev => prev.map(f => 
        f.id === id ? { ...f, preview: iconMap[type] || iconMap.default } : f
      ));
    }
  }, []);

  // Generate video thumbnail
  const generateVideoThumbnail = useCallback((fileObj) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    video.onloadedmetadata = () => {
      canvas.width = 200;
      canvas.height = (video.videoHeight / video.videoWidth) * 200;
      video.currentTime = Math.min(2, video.duration / 2); // Seek to 2s or middle
    };

    video.oncanplay = () => {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const thumbnail = canvas.toDataURL('image/jpeg', 0.7);
      
      setFiles(prev => prev.map(f => 
        f.id === fileObj.id ? { ...f, preview: thumbnail } : f
      ));
      
      URL.revokeObjectURL(video.src);
    };

    video.src = URL.createObjectURL(fileObj.file);
  }, []);

  // Compress image
  const compressImage = useCallback(async (fileObj) => {
    const { file, id } = fileObj;
    
    setFiles(prev => prev.map(f => 
      f.id === id ? { ...f, status: 'compressing' } : f
    ));

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = URL.createObjectURL(file);
      });

      // Calculate new dimensions (max 1920px width)
      const maxWidth = 1920;
      const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;

      // Draw and compress
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob((compressedBlob) => {
        setFiles(prev => prev.map(f => 
          f.id === id ? { 
            ...f, 
            compressed: compressedBlob,
            status: 'completed',
            originalSize: file.size,
            compressedSize: compressedBlob.size
          } : f
        ));
      }, 'image/jpeg', 0.8);

      URL.revokeObjectURL(img.src);
    } catch (error) {
      console.error('Compression failed:', error);
      setFiles(prev => prev.map(f => 
        f.id === id ? { ...f, status: 'error' } : f
      ));
    }
  }, []);

  // Remove file
  const removeFile = useCallback((fileId) => {
    setFiles(prev => {
      const fileToRemove = prev.find(f => f.id === fileId);
      if (fileToRemove && onFileRemove) {
        onFileRemove(fileToRemove);
      }
      return prev.filter(f => f.id !== fileId);
    });
    delete uploadProgress[fileId];
    delete compressionProgress[fileId];
  }, [onFileRemove, uploadProgress, compressionProgress]);

  // Drag and drop handlers
  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    dragCounterRef.current = 0;
    
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      handleFileSelect(droppedFiles);
    }
  }, [handleFileSelect]);

  // File input change handler
  const handleInputChange = useCallback((e) => {
    const selectedFiles = e.target.files;
    if (selectedFiles.length > 0) {
      handleFileSelect(selectedFiles);
    }
    // Reset input
    e.target.value = '';
  }, [handleFileSelect]);

  // Format file size
  const formatFileSize = useCallback((bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  // Get compression ratio
  const getCompressionRatio = useCallback((original, compressed) => {
    if (!compressed) return 0;
    return Math.round(((original - compressed) / original) * 100);
  }, []);

  return (
    <div className={`enhanced-file-upload ${className}`}>
      {/* Drop Zone */}
      <div
        className={`drop-zone ${isDragOver ? 'drag-over' : ''} ${files.length > 0 ? 'has-files' : ''}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedTypes}
          multiple={multiple}
          onChange={handleInputChange}
          className="file-input"
        />
        
        <div className="drop-zone-content">
          <div className="upload-icon">
            {isDragOver ? '📂' : '📁'}
          </div>
          <div className="upload-text">
            <p className="primary-text">
              {isDragOver ? 'Drop files here' : 'Drag & drop files here'}
            </p>
            <p className="secondary-text">
              or <span className="browse-link">browse</span> to choose files
            </p>
          </div>
          <div className="upload-info">
            <span>Max {maxFiles} files, up to {Math.round(maxFileSize / (1024 * 1024))}MB each</span>
          </div>
        </div>
      </div>

      {/* File Previews */}
      {showPreviews && files.length > 0 && (
        <div className="file-previews">
          <div className="previews-header">
            <h4>Selected Files ({files.length})</h4>
            <button 
              className="clear-all-btn"
              onClick={() => setFiles([])}
              title="Remove all files"
            >
              Clear All
            </button>
          </div>
          
          <div className="preview-grid">
            {files.map((fileObj) => (
              <div key={fileObj.id} className={`file-preview ${fileObj.status}`}>
                <div className="preview-content">
                  {/* Preview Image/Icon */}
                  <div className="preview-thumbnail">
                    {typeof fileObj.preview === 'string' && fileObj.preview.startsWith('data:') ? (
                      <img 
                        src={fileObj.preview} 
                        alt={fileObj.name}
                        className="preview-image"
                      />
                    ) : (
                      <div className="preview-icon">
                        {fileObj.preview || '📄'}
                      </div>
                    )}
                    
                    {/* Status Overlay */}
                    {fileObj.status === 'compressing' && (
                      <div className="status-overlay">
                        <div className="compression-spinner"></div>
                      </div>
                    )}
                  </div>

                  {/* File Info */}
                  <div className="file-info">
                    <div className="file-name" title={fileObj.name}>
                      {fileObj.name}
                    </div>
                    <div className="file-details">
                      <span className="file-size">
                        {formatFileSize(fileObj.size)}
                        {fileObj.compressedSize && (
                          <span className="compression-info">
                            → {formatFileSize(fileObj.compressedSize)}
                            <span className="compression-ratio">
                              ({getCompressionRatio(fileObj.size, fileObj.compressedSize)}% saved)
                            </span>
                          </span>
                        )}
                      </span>
                      <span className="file-status">
                        {fileObj.status === 'pending' && '⏳ Pending'}
                        {fileObj.status === 'compressing' && '🔄 Compressing...'}
                        {fileObj.status === 'uploading' && '⬆️ Uploading...'}
                        {fileObj.status === 'completed' && '✅ Ready'}
                        {fileObj.status === 'error' && '❌ Error'}
                      </span>
                    </div>
                  </div>

                  {/* Remove Button */}
                  <button
                    className="remove-file-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(fileObj.id);
                    }}
                    title="Remove file"
                  >
                    ×
                  </button>
                </div>

                {/* Progress Bar */}
                {showProgress && (fileObj.status === 'compressing' || fileObj.status === 'uploading') && (
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ 
                        width: `${uploadProgress[fileObj.id] || compressionProgress[fileObj.id] || 0}%` 
                      }}
                    ></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* File Type Info */}
      <div className="file-type-info">
        <p>Supported formats: Images, Videos, Audio, PDF, Documents</p>
        <p>Images will be automatically compressed for optimal performance</p>
      </div>
    </div>
  );
};

export default EnhancedFileUpload;