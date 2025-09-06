import React, { useState, useRef } from 'react';

const VideoDebugTest = () => {
  const [testVideos, setTestVideos] = useState([]);
  const [debugInfo, setDebugInfo] = useState([]);
  const fileInputRef = useRef(null);

  const addDebugInfo = (message) => {
    setDebugInfo(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
    console.log(message);
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    addDebugInfo(`Selected ${files.length} files`);
    
    for (const file of files) {
      addDebugInfo(`Processing file: ${file.name} (${file.type})`);
      
      if (file.type.startsWith('video/')) {
        await processVideoFile(file);
      } else {
        addDebugInfo(`Skipping non-video file: ${file.type}`);
      }
    }
  };

  const processVideoFile = (file) => {
    return new Promise((resolve) => {
      addDebugInfo(`Creating object URL for ${file.name}`);
      const videoUrl = URL.createObjectURL(file);
      addDebugInfo(`Object URL created: ${videoUrl}`);
      
      const video = document.createElement('video');
      
      video.onloadedmetadata = () => {
        addDebugInfo(`Metadata loaded - Duration: ${video.duration}s, Size: ${video.videoWidth}x${video.videoHeight}`);
        
        const videoData = {
          id: Date.now() + Math.random(),
          name: file.name,
          type: file.type,
          size: file.size,
          url: videoUrl,
          duration: video.duration,
          width: video.videoWidth,
          height: video.videoHeight
        };
        
        setTestVideos(prev => [...prev, videoData]);
        addDebugInfo(`Video added to test list: ${file.name}`);
        resolve(videoData);
      };
      
      video.onerror = (error) => {
        addDebugInfo(`ERROR loading video metadata: ${error}`);
        resolve(null);
      };
      
      video.onloadstart = () => addDebugInfo('Video load started');
      video.onloadeddata = () => addDebugInfo('Video data loaded');
      video.oncanplay = () => addDebugInfo('Video can play');
      video.oncanplaythrough = () => addDebugInfo('Video can play through');
      
      addDebugInfo(`Setting video src: ${videoUrl}`);
      video.src = videoUrl;
    });
  };

  const testVideoPlayback = (videoData) => {
    addDebugInfo(`Testing playback for: ${videoData.name}`);
    const video = document.createElement('video');
    video.src = videoData.url;
    video.controls = true;
    
    video.onloadedmetadata = () => {
      addDebugInfo(`Playback test - metadata loaded for ${videoData.name}`);
    };
    
    video.oncanplay = () => {
      addDebugInfo(`Playback test - can play ${videoData.name}`);
    };
    
    video.onerror = (error) => {
      addDebugInfo(`Playback test ERROR for ${videoData.name}: ${error}`);
    };
  };

  const clearDebugInfo = () => {
    setDebugInfo([]);
    setTestVideos([]);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h2>🎥 Video Upload Debug Test</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          multiple
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        <button onClick={() => fileInputRef.current?.click()}>
          Select Video Files
        </button>
        <button onClick={clearDebugInfo} style={{ marginLeft: '10px' }}>
          Clear Debug Info
        </button>
      </div>

      {/* Debug Info */}
      <div style={{ 
        backgroundColor: '#000', 
        color: '#0f0', 
        padding: '10px', 
        borderRadius: '5px',
        maxHeight: '200px',
        overflow: 'auto',
        marginBottom: '20px',
        fontSize: '12px'
      }}>
        <h3 style={{ color: '#fff', margin: '0 0 10px 0' }}>Debug Log:</h3>
        {debugInfo.map((info, index) => (
          <div key={index}>{info}</div>
        ))}
      </div>

      {/* Test Videos */}
      {testVideos.length > 0 && (
        <div>
          <h3>Test Videos ({testVideos.length}):</h3>
          {testVideos.map(videoData => (
            <div key={videoData.id} style={{ 
              border: '1px solid #ccc', 
              padding: '10px', 
              margin: '10px 0',
              borderRadius: '5px'
            }}>
              <h4>{videoData.name}</h4>
              <p>Type: {videoData.type}</p>
              <p>Size: {(videoData.size / (1024 * 1024)).toFixed(1)} MB</p>
              <p>Duration: {videoData.duration?.toFixed(2)}s</p>
              <p>Resolution: {videoData.width}x{videoData.height}</p>
              
              <video 
                src={videoData.url}
                controls
                preload="metadata"
                style={{ 
                  maxWidth: '300px', 
                  maxHeight: '200px',
                  width: '100%',
                  border: '1px solid #ddd'
                }}
                onError={(e) => addDebugInfo(`Video element error for ${videoData.name}: ${e.target.error?.message || 'Unknown error'}`)}
                onLoadedMetadata={() => addDebugInfo(`Video element metadata loaded for ${videoData.name}`)}
                onCanPlay={() => addDebugInfo(`Video element can play ${videoData.name}`)}
              >
                <source src={videoData.url} type={videoData.type} />
                Your browser does not support the video tag.
              </video>
              
              <button 
                onClick={() => testVideoPlayback(videoData)}
                style={{ marginTop: '10px' }}
              >
                Test Playback
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VideoDebugTest;