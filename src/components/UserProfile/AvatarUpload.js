import React, { useState, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import userDataService from '../../services/userDataService';
import './AvatarUpload.css';

const AvatarUpload = ({ currentAvatar, onAvatarChange, isOwnProfile }) => {
  const { updateUser, refreshUser, user: currentUser } = useAuth();
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
    console.log('🔑 Auth token check:', { 
      hasToken: !!token, 
      tokenLength: token ? token.length : 0,
      localStorage: !!localStorage.getItem('authToken'),
      sessionStorage: !!sessionStorage.getItem('authToken')
    });      if (!token) {
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
      
      try {
        const result = await userDataService.api.uploadAvatar(file);
        console.log('✅ Upload successful via userDataService:', result);
        
        // Make sure we have a valid avatar URL
        if (result && result.avatarUrl) {
          console.log('🖼️ Setting new avatar URL:', result.avatarUrl);
          onAvatarChange(result.avatarUrl);
          
          // 🔑 KEY FIX: Update user context immediately for message avatar sync
          if (currentUser) {
            const updatedUser = { ...currentUser, avatar: result.avatarUrl };
            updateUser(updatedUser);
            console.log('✅ User context updated with new avatar for message sync');
          }
        } else {
          console.error('❌ No avatar URL in response:', result);
          throw new Error('Invalid response: no avatar URL returned');
        }
      } catch (apiError) {
        console.error('❌ API upload failed:', apiError);
        throw new Error(apiError.message || 'Upload failed');
      }
    } catch (error) {
      console.error('💥 Avatar upload error:', error);
      console.error('💥 Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      
      // Fallback to demo mode
      if (error.message.includes('Network Error') || error.message.includes('fetch') || error.message.includes('API call failed')) {
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