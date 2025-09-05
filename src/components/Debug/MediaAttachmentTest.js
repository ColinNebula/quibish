import React, { useState } from 'react';
import './MediaAttachmentTest.css';

/**
 * Media Attachment Test Component
 * This component helps diagnose image and video attachment display issues
 */
const MediaAttachmentTest = () => {
  const [testResults, setTestResults] = useState({});
  const [isRunningTests, setIsRunningTests] = useState(false);

  // Test image and video URLs
  const testMedia = {
    images: [
      {
        id: 'test-img-1',
        name: 'Test Image 1 (External)',
        url: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&h=600&fit=crop',
        type: 'image',
        mimeType: 'image/jpeg'
      },
      {
        id: 'test-img-2', 
        name: 'Test Image 2 (External)',
        url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&h=600&fit=crop',
        type: 'image',
        mimeType: 'image/jpeg'
      }
    ],
    videos: [
      {
        id: 'test-vid-1',
        name: 'Test Video 1 (Sample)',
        url: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
        type: 'video',
        mimeType: 'video/mp4'
      }
    ]
  };

  // Test media loading
  const testMediaLoading = async () => {
    setIsRunningTests(true);
    const results = {};

    // Test images
    for (const img of testMedia.images) {
      try {
        await testImageLoad(img.url);
        results[img.id] = { 
          status: 'success', 
          message: 'Image loaded successfully',
          type: 'image'
        };
      } catch (error) {
        results[img.id] = { 
          status: 'error', 
          message: `Image failed to load: ${error.message}`,
          type: 'image'
        };
      }
    }

    // Test videos
    for (const vid of testMedia.videos) {
      try {
        await testVideoLoad(vid.url);
        results[vid.id] = { 
          status: 'success', 
          message: 'Video loaded successfully',
          type: 'video'
        };
      } catch (error) {
        results[vid.id] = { 
          status: 'error', 
          message: `Video failed to load: ${error.message}`,
          type: 'video'
        };
      }
    }

    setTestResults(results);
    setIsRunningTests(false);
  };

  // Test image loading
  const testImageLoad = (url) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = url;
    });
  };

  // Test video loading  
  const testVideoLoad = (url) => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.onloadeddata = () => resolve();
      video.onerror = () => reject(new Error('Failed to load video'));
      video.src = url;
    });
  };

  // Clear test results
  const clearResults = () => {
    setTestResults({});
  };

  return (
    <div className="media-attachment-test">
      <div className="test-header">
        <h3>📸 Media Attachment Diagnostic Tool</h3>
        <p>This tool helps diagnose issues with image and video attachments in chat messages.</p>
      </div>

      <div className="test-controls">
        <button 
          onClick={testMediaLoading}
          disabled={isRunningTests}
          className="test-button primary"
        >
          {isRunningTests ? '🔄 Running Tests...' : '▶️ Run Media Tests'}
        </button>
        
        {Object.keys(testResults).length > 0 && (
          <button 
            onClick={clearResults}
            className="test-button secondary"
          >
            🗑️ Clear Results
          </button>
        )}
      </div>

      {/* Test Results */}
      {Object.keys(testResults).length > 0 && (
        <div className="test-results">
          <h4>Test Results:</h4>
          {Object.entries(testResults).map(([id, result]) => (
            <div key={id} className={`test-result ${result.status}`}>
              <div className="result-icon">
                {result.status === 'success' ? '✅' : '❌'}
              </div>
              <div className="result-content">
                <div className="result-name">
                  {result.type === 'image' ? '🖼️' : '🎥'} {testMedia.images.find(i => i.id === id)?.name || testMedia.videos.find(v => v.id === id)?.name}
                </div>
                <div className="result-message">{result.message}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sample Media Preview */}
      <div className="sample-media">
        <h4>Sample Media Attachments:</h4>
        
        <div className="media-section">
          <h5>📷 Test Images</h5>
          <div className="media-grid">
            {testMedia.images.map(img => (
              <div key={img.id} className="media-item">
                <div className="pro-image-attachment">
                  <img 
                    src={img.url} 
                    alt={img.name}
                    loading="lazy"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                  <div className="pro-image-fallback" style={{ display: 'none' }}>
                    <div className="pro-fallback-icon">🖼️</div>
                    <span>Image failed to load</span>
                  </div>
                  <div className="media-info">
                    <div className="media-name">{img.name}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="media-section">
          <h5>🎬 Test Videos</h5>
          <div className="media-grid">
            {testMedia.videos.map(vid => (
              <div key={vid.id} className="media-item">
                <div className="pro-video-container">
                  <video 
                    className="pro-video-player"
                    controls
                    preload="metadata"
                    onError={(e) => {
                      console.error('Video load error:', e);
                    }}
                  >
                    <source src={vid.url} type={vid.mimeType} />
                    Your browser does not support the video tag.
                  </video>
                  <div className="media-info">
                    <div className="media-name">{vid.name}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Troubleshooting Tips */}
      <div className="troubleshooting">
        <h4>🛠️ Troubleshooting Tips:</h4>
        <ul>
          <li><strong>Images not loading:</strong> Check if the URLs are accessible and not blocked by CORS policy</li>
          <li><strong>Videos not playing:</strong> Ensure the video format is supported by the browser (MP4, WebM)</li>
          <li><strong>Slow loading:</strong> Large media files may take time to load, especially on slower connections</li>
          <li><strong>Mixed content errors:</strong> Make sure HTTPS URLs are used when serving over HTTPS</li>
          <li><strong>Browser compatibility:</strong> Some older browsers may not support certain video formats</li>
        </ul>
      </div>
    </div>
  );
};

export default MediaAttachmentTest;
