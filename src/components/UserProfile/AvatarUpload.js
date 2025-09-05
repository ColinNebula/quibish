import React, { useState, useRef, useCallback } from 'react';
import './AvatarUpload.css';

const AvatarUpload = ({ currentAvatar, onAvatarChange, isOwnProfile }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState(currentAvatar);
  const fileInputRef = useRef(null);

  const handleFiles = useCallback(async (files) => {
    console.log('🔄 Avatar upload started:', { fileCount: files.length });
    const file = files[0];
    if (!file) return;

    console.log('📁 File details:', { 
      name: file.name, 
      size: file.size, 
      type: file.type 
    });

    // Validate file type
    if (!file.type.startsWith('image/')) {
      console.error('❌ Invalid file type:', file.type);
      alert('Please select an image file (PNG, JPG, GIF, etc.)');
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      console.error('❌ File too large:', file.size);
      alert('File size must be less than 5MB');
      return;
    }

    setIsUploading(true);
    console.log('⏳ Upload started...');

    try {
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target.result);
        console.log('🖼️ Preview created');
      };
      reader.readAsDataURL(file);

      // Check if we have authentication token
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      console.log('🔑 Auth token check:', { hasToken: !!token });
      
      if (!token) {
        // Demo mode - just use the data URL from file reader
        console.log('🎭 No auth token found, running in demo mode');
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target.result;
          setPreview(dataUrl);
          onAvatarChange(dataUrl);
          console.log('✅ Demo mode avatar update successful');
        };
        reader.readAsDataURL(file);
        return;
      }

      // Upload to server
      console.log('🌐 Uploading to server...');
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await fetch('http://localhost:5001/api/users/avatar', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('📡 Server response:', { 
        status: response.status, 
        statusText: response.statusText 
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Upload successful:', result);
        onAvatarChange(result.avatarUrl);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
        console.error('❌ Server error:', errorData);
        throw new Error(errorData.error || 'Upload failed');
      }
    } catch (error) {
      console.error('💥 Avatar upload error:', error);
      
      // Fallback to demo mode
      if (error.message.includes('Network Error') || error.message.includes('fetch')) {
        console.log('🔄 Network error, falling back to demo mode');
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target.result;
          setPreview(dataUrl);
          onAvatarChange(dataUrl);
          console.log('✅ Fallback demo mode avatar update successful');
        };
        reader.readAsDataURL(file);
      } else {
        alert(`Failed to upload avatar: ${error.message}`);
        setPreview(currentAvatar); // Reset preview on error
      }
    } finally {
      setIsUploading(false);
      console.log('🏁 Upload process completed');
    }
  }, [currentAvatar, onAvatarChange]);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const handleChange = useCallback((e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  }, [handleFiles]);

  const handleClick = useCallback(() => {
    if (isOwnProfile && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [isOwnProfile]);

  return (
    <div className="avatar-upload-container">
      <div 
        className={`profile-avatar ${isOwnProfile ? 'editable' : ''} ${dragActive ? 'drag-active' : ''} ${isUploading ? 'uploading' : ''}`}
        onDragEnter={isOwnProfile ? handleDrag : undefined}
        onDragLeave={isOwnProfile ? handleDrag : undefined}
        onDragOver={isOwnProfile ? handleDrag : undefined}
        onDrop={isOwnProfile ? handleDrop : undefined}
        onClick={handleClick}
      >
        <div className="avatar-image-container">
          <img 
            src={preview || '/default-avatar.png'} 
            alt="Profile Avatar"
            className="avatar-image"
          />
          
          {isOwnProfile && (
            <div className="avatar-overlay">
              {isUploading ? (
                <div className="upload-spinner">
                  <div className="spinner"></div>
                  <span>Uploading...</span>
                </div>
              ) : (
                <div className="upload-prompt">
                  <div className="upload-icon">📷</div>
                  <span>Change Photo</span>
                </div>
              )}
            </div>
          )}
        </div>

        {isOwnProfile && (
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleChange}
            className="avatar-file-input"
          />
        )}
      </div>

      {isOwnProfile && (
        <div className="avatar-upload-tips">
          <p className="upload-hint">
            Click or drag & drop to change your profile photo
          </p>
          <p className="upload-requirements">
            Supports: JPG, PNG, GIF • Max size: 5MB
          </p>
        </div>
      )}
    </div>
  );
};

export default AvatarUpload;