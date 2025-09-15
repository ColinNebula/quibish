import React, { useState, useEffect, useRef } from 'react';
import './UserProfileManager.css';

// Utility function to format video duration
const formatDuration = (seconds) => {
  if (!seconds || isNaN(seconds)) return '0:00';
  
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const UserProfileManager = ({ user, onUserUpdate, onClose }) => {
  const [activeTab, setActiveTab] = useState('profile');
  const [userInfo, setUserInfo] = useState({
    name: '',
    email: '',
    bio: '',
    phone: '',
    location: '',
    company: '',
    jobTitle: '',
    website: '',
    statusMessage: '',
    ...user
  });
  const [avatar, setAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || null);
  const [mediaFiles, setMediaFiles] = useState([]);
  const [userMedia, setUserMedia] = useState({
    photos: [],
    videos: [],
    gifs: [],
    documents: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploadProgress, setUploadProgress] = useState({});

  const fileInputRef = useRef(null);
  const mediaInputRef = useRef(null);

  useEffect(() => {
    if (user) {
      setUserInfo({
        name: user.name || '',
        email: user.email || '',
        bio: user.bio || '',
        phone: user.phone || '',
        location: user.location || '',
        company: user.company || '',
        jobTitle: user.jobTitle || '',
        website: user.website || '',
        statusMessage: user.statusMessage || '',
        ...user
      });
      setAvatarPreview(user.avatar || null);
    }
    loadUserMedia();
  }, [user]);

  const loadUserMedia = async () => {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await fetch('http://localhost:5001/api/upload/media', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUserMedia(data.userMedia);
      }
    } catch (error) {
      console.error('Error loading user media:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUserInfo(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        setError('Please select a valid image file (JPEG, PNG, GIF, WebP)');
        return;
      }

      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Avatar image must be less than 5MB');
        return;
      }

      setAvatar(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMediaChange = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = [];
    
    files.forEach(file => {
      // Validate file type
      const allowedTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
        'video/mp4', 'video/webm', 'video/ogg', 'video/avi', 'video/mov',
        'application/pdf'
      ];
      
      if (allowedTypes.includes(file.type)) {
        // Validate file size (50MB for videos, 10MB for images)
        const maxSize = file.type.startsWith('video/') ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
        if (file.size <= maxSize) {
          validFiles.push(file);
        } else {
          setError(`File ${file.name} is too large. Max size is ${file.type.startsWith('video/') ? '50MB' : '10MB'}`);
        }
      } else {
        setError(`File ${file.name} is not a supported format`);
      }
    });
    
    setMediaFiles(validFiles);
  };

  const saveProfile = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');

      // Update basic profile info
      const profileResponse = await fetch('http://localhost:5001/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(userInfo)
      });

      if (!profileResponse.ok) {
        throw new Error('Failed to update profile');
      }

      // Update email separately if changed
      if (userInfo.email !== user.email) {
        const emailResponse = await fetch('http://localhost:5001/api/users/email', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ email: userInfo.email })
        });

        if (!emailResponse.ok) {
          const emailError = await emailResponse.json();
          throw new Error(emailError.error || 'Failed to update email');
        }
      }

      // Upload avatar if changed
      if (avatar) {
        const formData = new FormData();
        formData.append('avatar', avatar);

        const avatarResponse = await fetch('http://localhost:5001/api/upload/avatar', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });

        if (!avatarResponse.ok) {
          throw new Error('Failed to upload avatar');
        }

        const avatarData = await avatarResponse.json();
        setAvatarPreview(avatarData.avatar);
      }

      const updatedProfileResponse = await fetch('http://localhost:5001/api/users/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (updatedProfileResponse.ok) {
        const updatedData = await updatedProfileResponse.json();
        if (onUserUpdate) {
          onUserUpdate(updatedData.user);
        }
      }

      setSuccess('Profile updated successfully!');
      setAvatar(null);

    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const uploadMedia = async () => {
    if (mediaFiles.length === 0) {
      setError('Please select files to upload');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const formData = new FormData();
      
      mediaFiles.forEach(file => {
        formData.append('media', file);
      });

      const response = await fetch('http://localhost:5001/api/upload/media', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to upload media');
      }

      const data = await response.json();
      setUserMedia(data.userMedia);
      setMediaFiles([]);
      setSuccess(`Successfully uploaded ${data.uploadedMedia.length} file(s)!`);
      
      // Clear file input
      if (mediaInputRef.current) {
        mediaInputRef.current.value = '';
      }

    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteMedia = async (mediaId) => {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await fetch(`http://localhost:5001/api/upload/media/${mediaId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete media');
      }

      const data = await response.json();
      setUserMedia(data.userMedia);
      setSuccess('Media deleted successfully!');

    } catch (error) {
      setError(error.message);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const renderProfileTab = () => (
    <div className="profile-tab">
      <div className="form-section">
        <h3>Basic Information</h3>
        
        <div className="avatar-section">
          <div className="avatar-preview">
            {avatarPreview ? (
              <img src={avatarPreview} alt="Avatar" />
            ) : (
              <div className="avatar-placeholder">
                <span>{userInfo.name?.charAt(0) || 'U'}</span>
              </div>
            )}
          </div>
          <button 
            type="button" 
            onClick={() => fileInputRef.current?.click()}
            className="change-avatar-btn"
          >
            Change Avatar
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            style={{ display: 'none' }}
          />
        </div>

        <div className="form-grid">
          <div className="form-group">
            <label>Full Name</label>
            <input
              type="text"
              name="name"
              value={userInfo.name}
              onChange={handleInputChange}
              placeholder="Enter your full name"
            />
          </div>

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={userInfo.email}
              onChange={handleInputChange}
              placeholder="Enter your email"
            />
          </div>

          <div className="form-group">
            <label>Phone</label>
            <input
              type="tel"
              name="phone"
              value={userInfo.phone}
              onChange={handleInputChange}
              placeholder="Enter your phone number"
            />
          </div>

          <div className="form-group">
            <label>Location</label>
            <input
              type="text"
              name="location"
              value={userInfo.location}
              onChange={handleInputChange}
              placeholder="Enter your location"
            />
          </div>

          <div className="form-group">
            <label>Company</label>
            <input
              type="text"
              name="company"
              value={userInfo.company}
              onChange={handleInputChange}
              placeholder="Enter your company"
            />
          </div>

          <div className="form-group">
            <label>Job Title</label>
            <input
              type="text"
              name="jobTitle"
              value={userInfo.jobTitle}
              onChange={handleInputChange}
              placeholder="Enter your job title"
            />
          </div>

          <div className="form-group full-width">
            <label>Website</label>
            <input
              type="url"
              name="website"
              value={userInfo.website}
              onChange={handleInputChange}
              placeholder="Enter your website URL"
            />
          </div>

          <div className="form-group full-width">
            <label>Bio</label>
            <textarea
              name="bio"
              value={userInfo.bio}
              onChange={handleInputChange}
              placeholder="Tell us about yourself"
              rows="3"
            />
          </div>

          <div className="form-group full-width">
            <label>Status Message</label>
            <input
              type="text"
              name="statusMessage"
              value={userInfo.statusMessage}
              onChange={handleInputChange}
              placeholder="Enter your status message"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderMediaTab = () => (
    <div className="media-tab">
      <div className="media-upload-section">
        <h3>Upload Media</h3>
        <div className="upload-area">
          <input
            ref={mediaInputRef}
            type="file"
            multiple
            accept="image/*,video/*,.pdf"
            onChange={handleMediaChange}
            id="media-upload"
          />
          <label htmlFor="media-upload" className="upload-label">
            <div className="upload-icon">📁</div>
            <p>Click to select photos, videos, GIFs, or PDFs</p>
            <p className="upload-hint">Max 10 files, 50MB per video, 10MB per image/PDF</p>
          </label>
        </div>

        {mediaFiles.length > 0 && (
          <div className="selected-files">
            <h4>Selected Files ({mediaFiles.length})</h4>
            <div className="file-list">
              {mediaFiles.map((file, index) => (
                <div key={index} className="file-item">
                  <span className="file-name">{file.name}</span>
                  <span className="file-size">{formatFileSize(file.size)}</span>
                  <span className="file-type">{file.type.split('/')[0]}</span>
                </div>
              ))}
            </div>
            <button 
              onClick={uploadMedia} 
              disabled={loading}
              className="upload-btn"
            >
              {loading ? 'Uploading...' : 'Upload Files'}
            </button>
          </div>
        )}
      </div>

      <div className="user-media-section">
        <h3>Your Media</h3>
        
        {/* Photos */}
        {userMedia.photos.length > 0 && (
          <div className="media-category">
            <h4>Photos ({userMedia.photos.length})</h4>
            <div className="media-grid">
              {userMedia.photos.map((photo) => (
                <div key={photo.id} className="media-item">
                  <img src={photo.url.startsWith('http') ? photo.url : `http://localhost:5001${photo.url}`} alt={photo.originalName} />
                  <div className="media-overlay">
                    <button 
                      onClick={() => deleteMedia(photo.id)}
                      className="delete-btn"
                    >
                      🗑️
                    </button>
                  </div>
                  <div className="media-info">
                    <span className="media-name">{photo.originalName}</span>
                    <span className="media-size">{formatFileSize(photo.size)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Videos */}
        {userMedia.videos.length > 0 && (
          <div className="media-category">
            <h4>Videos ({userMedia.videos.length})</h4>
            <div className="media-grid">
              {userMedia.videos.map((video) => (
                <div key={video.id} className="media-item">
                  <div className="video-container">
                    <video 
                      src={video.url.startsWith('http') ? video.url : `http://localhost:5001${video.url}`}
                      controls
                      preload="metadata"
                      poster={video.thumbnailUrl}
                      playsInline
                      onError={(e) => {
                        console.error('Video playback error:', e);
                        console.log('Video details:', video);
                      }}
                      onLoadedMetadata={(e) => {
                        console.log('Video loaded successfully:', video.originalName);
                      }}
                    >
                      <source src={video.url.startsWith('http') ? video.url : `http://localhost:5001${video.url}`} type={video.type || 'video/mp4'} />
                      Your browser does not support the video tag.
                    </video>
                    {video.duration && (
                      <div className="video-duration">{formatDuration(video.duration)}</div>
                    )}
                  </div>
                  <div className="media-overlay">
                    <button 
                      onClick={() => deleteMedia(video.id)}
                      className="delete-btn"
                    >
                      🗑️
                    </button>
                  </div>
                  <div className="media-info">
                    <span className="media-name">{video.originalName}</span>
                    <span className="media-size">{formatFileSize(video.size)}</span>
                    {video.duration && (
                      <span className="media-duration">Duration: {formatDuration(video.duration)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* GIFs */}
        {userMedia.gifs.length > 0 && (
          <div className="media-category">
            <h4>GIFs ({userMedia.gifs.length})</h4>
            <div className="media-grid">
              {userMedia.gifs.map((gif) => (
                <div key={gif.id} className="media-item">
                  <img src={gif.url.startsWith('http') ? gif.url : `http://localhost:5001${gif.url}`} alt={gif.originalName} />
                  <div className="media-overlay">
                    <button 
                      onClick={() => deleteMedia(gif.id)}
                      className="delete-btn"
                    >
                      🗑️
                    </button>
                  </div>
                  <div className="media-info">
                    <span className="media-name">{gif.originalName}</span>
                    <span className="media-size">{formatFileSize(gif.size)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Documents (PDFs) */}
        {userMedia.documents.length > 0 && (
          <div className="media-category">
            <h4>Documents ({userMedia.documents.length})</h4>
            <div className="media-grid">
              {userMedia.documents.map((document) => (
                <div key={document.id} className="media-item document-item">
                  <div className="document-preview">
                    <div className="document-icon">📄</div>
                    <div className="document-info">
                      <span className="document-name">{document.originalName}</span>
                      <span className="document-size">{formatFileSize(document.size)}</span>
                    </div>
                  </div>
                  <div className="media-overlay">
                    <button 
                      onClick={() => window.open(document.url.startsWith('http') ? document.url : `http://localhost:5001${document.url}`, '_blank')}
                      className="view-btn"
                      title="View PDF"
                    >
                      👁️
                    </button>
                    <button 
                      onClick={() => deleteMedia(document.id)}
                      className="delete-btn"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {userMedia.photos.length === 0 && userMedia.videos.length === 0 && userMedia.gifs.length === 0 && userMedia.documents.length === 0 && (
          <div className="no-media">
            <p>No media uploaded yet. Start by uploading some photos, videos, GIFs, or PDFs!</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="user-profile-manager">
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-content">
        <div className="modal-header">
          <h2>Profile Manager</h2>
          <button onClick={onClose} className="close-btn">×</button>
        </div>

        <div className="tab-navigation">
          <button 
            className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            Profile Info
          </button>
          <button 
            className={`tab-btn ${activeTab === 'media' ? 'active' : ''}`}
            onClick={() => setActiveTab('media')}
          >
            Media ({userMedia.photos.length + userMedia.videos.length + userMedia.gifs.length})
          </button>
        </div>

        <div className="tab-content">
          {activeTab === 'profile' && renderProfileTab()}
          {activeTab === 'media' && renderMediaTab()}
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        {activeTab === 'profile' && (
          <div className="modal-footer">
            <button onClick={onClose} className="cancel-btn">Cancel</button>
            <button 
              onClick={saveProfile} 
              disabled={loading}
              className="save-btn"
            >
              {loading ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfileManager;
