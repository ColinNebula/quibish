import React, { useState, useRef } from 'react';
import './VideoUploadDemo.css';

/**
 * Video Upload Demo Component
 * Demonstrates the video upload functionality with sample videos
 */
const VideoUploadDemo = () => {
  const [uploadedVideos, setUploadedVideos] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Sample video URLs for demonstration
  const sampleVideos = [
    {
      id: 'sample-1',
      name: 'Sample Video - Nature.mp4',
      url: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
      type: 'video/mp4',
      size: 1024 * 1024, // 1MB
      duration: '0:30'
    },
    {
      id: 'sample-2',
      name: 'Sample Video - Ocean.mp4',
      url: 'https://sample-videos.com/zip/10/mp4/SampleVideo_640x360_1mb.mp4',
      type: 'video/mp4',
      size: 1024 * 1024, // 1MB
      duration: '0:30'
    }
  ];

  // Handle file selection
  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length === 0) return;

    setIsUploading(true);

    for (const file of files) {
      if (file.type.startsWith('video/')) {
        await processVideo(file);
      }
    }

    setIsUploading(false);
    // Reset file input
    e.target.value = '';
  };

  // Process video file to extract metadata and thumbnail
  const processVideo = (file) => {
    return new Promise((resolve) => {
      const videoUrl = URL.createObjectURL(file);
      const video = document.createElement('video');
      
      video.onloadedmetadata = () => {
        const duration = Math.round(video.duration);
        const formattedDuration = `${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}`;
        
        // Set video time to get thumbnail from middle
        video.currentTime = Math.min(duration * 0.1, 5);
      };
      
      video.onseeked = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 320;
        canvas.height = 180;
        
        // Draw video frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const thumbnail = canvas.toDataURL('image/jpeg', 0.7);
        
        const duration = Math.round(video.duration);
        const formattedDuration = `${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}`;
        
        const videoData = {
          id: Date.now() + Math.random(),
          name: file.name,
          url: videoUrl,
          type: file.type,
          size: file.size,
          thumbnail: thumbnail,
          duration: formattedDuration,
          width: video.videoWidth,
          height: video.videoHeight,
          uploadedAt: new Date().toISOString()
        };

        setUploadedVideos(prev => [...prev, videoData]);
        resolve(videoData);
      };
      
      video.onerror = () => {
        console.error('Error loading video metadata');
        // Fallback without metadata
        const videoData = {
          id: Date.now() + Math.random(),
          name: file.name,
          url: videoUrl,
          type: file.type,
          size: file.size,
          uploadedAt: new Date().toISOString()
        };
        setUploadedVideos(prev => [...prev, videoData]);
        resolve(videoData);
      };
      
      video.src = videoUrl;
    });
  };

  // Add sample video to demo
  const addSampleVideo = (sampleVideo) => {
    const videoData = {
      ...sampleVideo,
      uploadedAt: new Date().toISOString()
    };
    setUploadedVideos(prev => [...prev, videoData]);
  };

  // Remove video from list
  const removeVideo = (videoId) => {
    setUploadedVideos(prev => {
      const video = prev.find(v => v.id === videoId);
      if (video && video.url.startsWith('blob:')) {
        URL.revokeObjectURL(video.url);
      }
      return prev.filter(v => v.id !== videoId);
    });
  };

  // Format file size
  const formatFileSize = (bytes) => {
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) {
      return `${mb.toFixed(1)} MB`;
    } else {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
  };

  return (
    <div className="video-upload-demo">
      <div className="demo-header">
        <h2>🎥 Video Upload Demo</h2>
        <p>Upload videos and see them displayed with thumbnails, duration, and metadata</p>
      </div>

      {/* Upload Controls */}
      <div className="upload-controls">
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          multiple
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        
        <button 
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="upload-button primary"
        >
          {isUploading ? '⏳ Processing...' : '📤 Upload Videos'}
        </button>

        <div className="sample-videos">
          <span>Or try sample videos:</span>
          {sampleVideos.map(sample => (
            <button
              key={sample.id}
              onClick={() => addSampleVideo(sample)}
              className="sample-button"
            >
              {sample.name.split(' - ')[1].split('.')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Video Grid */}
      {uploadedVideos.length > 0 && (
        <div className="video-grid">
          <h3>Uploaded Videos ({uploadedVideos.length})</h3>
          <div className="videos-container">
            {uploadedVideos.map(video => (
              <div key={video.id} className="video-card">
                <div className="video-preview">
                  <video 
                    src={video.url}
                    poster={video.thumbnail}
                    controls
                    preload="metadata"
                    className="video-player"
                  >
                    <source src={video.url} type={video.type} />
                    Your browser does not support the video tag.
                  </video>
                  
                  {video.duration && (
                    <div className="duration-badge">
                      {video.duration}
                    </div>
                  )}
                  
                  <button 
                    className="remove-button"
                    onClick={() => removeVideo(video.id)}
                    title="Remove video"
                  >
                    ×
                  </button>
                </div>
                
                <div className="video-info">
                  <div className="video-name" title={video.name}>
                    {video.name}
                  </div>
                  <div className="video-metadata">
                    <span className="file-size">{formatFileSize(video.size)}</span>
                    {video.width && video.height && (
                      <span className="resolution">{video.width}×{video.height}</span>
                    )}
                    <span className="upload-time">
                      {new Date(video.uploadedAt).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Features List */}
      <div className="features-info">
        <h3>✨ Video Upload Features</h3>
        <ul>
          <li>🎬 <strong>Multiple Format Support:</strong> MP4, WebM, AVI, MOV, OGG</li>
          <li>📸 <strong>Automatic Thumbnails:</strong> Generated from video frames</li>
          <li>⏱️ <strong>Duration Detection:</strong> Extracts video length automatically</li>
          <li>📏 <strong>Resolution Info:</strong> Shows video dimensions (width×height)</li>
          <li>💾 <strong>File Size Display:</strong> Shows size in KB/MB format</li>
          <li>🎮 <strong>Video Controls:</strong> Built-in play, pause, seek, volume</li>
          <li>📱 <strong>Responsive Design:</strong> Works on desktop and mobile</li>
          <li>🚀 <strong>Large File Support:</strong> Up to 50MB video uploads</li>
        </ul>
      </div>

      {/* Technical Info */}
      <div className="technical-info">
        <h3>🔧 Technical Implementation</h3>
        <div className="tech-grid">
          <div className="tech-item">
            <h4>Backend API</h4>
            <p>POST /api/upload/media with multer middleware</p>
            <p>Video files stored in /uploads/user-media/videos/</p>
          </div>
          <div className="tech-item">
            <h4>Frontend Processing</h4>
            <p>HTML5 Video API for metadata extraction</p>
            <p>Canvas API for thumbnail generation</p>
          </div>
          <div className="tech-item">
            <h4>File Validation</h4>
            <p>MIME type checking: video/mp4, video/webm, etc.</p>
            <p>Size limit: 50MB maximum per file</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoUploadDemo;