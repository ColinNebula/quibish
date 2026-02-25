import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import './SocialProfile.css';

const SocialProfile = ({ userId, onClose }) => {
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('posts');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const coverInputRef = useRef(null);
  const avatarInputRef = useRef(null);

  const isOwnProfile = currentUser?.id === userId || currentUser?.username === userId;

  useEffect(() => {
    fetchProfile();
  }, [userId]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/social-profiles/${userId}`, { headers });
      const data = await response.json();

      if (data.success) {
        setProfile(data.profile);
        setEditForm({
          bio: data.profile.bio || '',
          headline: data.profile.headline || '',
          location: data.profile.location || '',
          website: data.profile.website || '',
          company: data.profile.company || '',
          jobTitle: data.profile.jobTitle || '',
        });
      } else {
        setError(data.error || 'Failed to load profile');
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError('Unable to load profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCoverPhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('cover', file);

      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const response = await fetch('/api/social-profiles/cover-photo', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();
      if (data.success) {
        setProfile(prev => ({ ...prev, cover_photo: data.coverPhotoUrl }));
      } else {
        alert('Failed to upload cover photo: ' + data.error);
      }
    } catch (err) {
      console.error('Error uploading cover photo:', err);
      alert('Failed to upload cover photo');
    }
  };

  const handleProfileUpdate = async () => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const response = await fetch('/api/social-profiles/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editForm)
      });

      const data = await response.json();
      if (data.success) {
        setProfile(data.profile);
        setIsEditing(false);
      } else {
        alert('Failed to update profile: ' + data.error);
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      alert('Failed to update profile');
    }
  };

  const handleInputChange = (field, value) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="social-profile-loading">
        <div className="loading-spinner"></div>
        <p>Loading profile...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="social-profile-error">
        <p>{error}</p>
        <button onClick={fetchProfile}>Retry</button>
        {onClose && <button onClick={onClose}>Close</button>}
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <div className="social-profile-container">
      {/* Header with close button */}
      {onClose && (
        <button className="profile-close-btn" onClick={onClose}>
          ✕
        </button>
      )}

      {/* Cover Photo Section */}
      <div className="profile-cover-section">
        <div 
          className="profile-cover"
          style={{
            backgroundImage: profile.cover_photo 
              ? `url(${profile.cover_photo})` 
              : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
          }}
        >
          {isOwnProfile && (
            <button 
              className="edit-cover-btn"
              onClick={() => coverInputRef.current.click()}
            >
              <i className="icon-camera">📷</i> Change Cover
            </button>
          )}
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={handleCoverPhotoUpload}
          />
        </div>

        {/* Profile Header */}
        <div className="profile-header-section">
          <div className="profile-avatar-wrapper">
            <img 
              src={profile.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(profile.name)} 
              alt={profile.name}
              className="profile-avatar-large"
            />
            {isOwnProfile && (
              <button 
                className="edit-avatar-btn"
                onClick={() => avatarInputRef.current.click()}
              >
                📷
              </button>
            )}
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {/* Handle avatar upload */}}
            />
            {profile.is_verified && (
              <div className="verified-badge" title="Verified Account">✓</div>
            )}
          </div>

          <div className="profile-info-section">
            <div className="profile-name-section">
              <h1 className="profile-name">
                {profile.displayName || profile.name}
              </h1>
              <p className="profile-username">@{profile.username}</p>
            </div>

            {profile.headline && (
              <p className="profile-headline">{profile.headline}</p>
            )}

            {profile.bio && !isEditing && (
              <p className="profile-bio">{profile.bio}</p>
            )}

            {isEditing && (
              <div className="profile-edit-form">
                <textarea
                  value={editForm.bio}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                  placeholder="Tell us about yourself..."
                  maxLength={500}
                  rows={3}
                  className="edit-bio-input"
                />
                <div className="bio-char-count">
                  {editForm.bio.length}/500
                </div>

                <input
                  type="text"
                  value={editForm.headline}
                  onChange={(e) => handleInputChange('headline', e.target.value)}
                  placeholder="Your headline (e.g., Software Engineer at TechCorp)"
                  className="edit-headline-input"
                />

                <div className="edit-info-grid">
                  <input
                    type="text"
                    value={editForm.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    placeholder="📍 Location"
                  />
                  <input
                    type="text"
                    value={editForm.website}
                    onChange={(e) => handleInputChange('website', e.target.value)}
                    placeholder="🔗 Website"
                  />
                  <input
                    type="text"
                    value={editForm.company}
                    onChange={(e) => handleInputChange('company', e.target.value)}
                    placeholder="🏢 Company"
                  />
                  <input
                    type="text"
                    value={editForm.jobTitle}
                    onChange={(e) => handleInputChange('jobTitle', e.target.value)}
                    placeholder="💼 Job Title"
                  />
                </div>

                <div className="edit-actions">
                  <button onClick={() => setIsEditing(false)} className="btn-cancel">
                    Cancel
                  </button>
                  <button onClick={handleProfileUpdate} className="btn-save">
                    Save Changes
                  </button>
                </div>
              </div>
            )}

            <div className="profile-details">
              {profile.location && (
                <span className="profile-detail-item">
                  <i className="icon">📍</i> {profile.location}
                </span>
              )}
              {profile.website && (
                <a 
                  href={profile.website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="profile-detail-item"
                >
                  <i className="icon">🔗</i> {profile.website}
                </a>
              )}
              {profile.company && (
                <span className="profile-detail-item">
                  <i className="icon">🏢</i> {profile.company}
                  {profile.jobTitle && ` • ${profile.jobTitle}`}
                </span>
              )}
              {profile.createdAt && (
                <span className="profile-detail-item">
                  <i className="icon">📅</i> Joined {new Date(profile.createdAt).toLocaleDateString('en-US', { 
                    month: 'long', 
                    year: 'numeric' 
                  })}
                </span>
              )}
            </div>
          </div>

          {/* Profile Stats */}
          <div className="profile-stats-section">
            <div className="stat-item">
              <strong className="stat-value">{profile.friends_count || 0}</strong>
              <span className="stat-label">Friends</span>
            </div>
            <div className="stat-item">
              <strong className="stat-value">{profile.posts_count || 0}</strong>
              <span className="stat-label">Posts</span>
            </div>
            <div className="stat-item">
              <strong className="stat-value">{profile.followers_count || 0}</strong>
              <span className="stat-label">Followers</span>
            </div>
            <div className="stat-item">
              <strong className="stat-value">{profile.following_count || 0}</strong>
              <span className="stat-label">Following</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="profile-actions">
            {isOwnProfile ? (
              <>
                <button 
                  className="btn-primary"
                  onClick={() => setIsEditing(!isEditing)}
                >
                  {isEditing ? 'Cancel Edit' : 'Edit Profile'}
                </button>
                <button className="btn-secondary">
                  View Activity
                </button>
              </>
            ) : (
              <>
                <button className="btn-primary">
                  {profile.isFriend ? 'Friends' : 'Add Friend'}
                </button>
                <button className="btn-secondary">
                  Message
                </button>
                <button className="btn-secondary">
                  More
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Profile Navigation Tabs */}
      <div className="profile-tabs">
        <button 
          className={`tab ${activeTab === 'posts' ? 'active' : ''}`}
          onClick={() => setActiveTab('posts')}
        >
          Posts
        </button>
        <button 
          className={`tab ${activeTab === 'about' ? 'active' : ''}`}
          onClick={() => setActiveTab('about')}
        >
          About
        </button>
        <button 
          className={`tab ${activeTab === 'friends' ? 'active' : ''}`}
          onClick={() => setActiveTab('friends')}
        >
          Friends
        </button>
        <button 
          className={`tab ${activeTab === 'photos' ? 'active' : ''}`}
          onClick={() => setActiveTab('photos')}
        >
          Photos
        </button>
        <button 
          className={`tab ${activeTab === 'videos' ? 'active' : ''}`}
          onClick={() => setActiveTab('videos')}
        >
          Videos
        </button>
      </div>

      {/* Tab Content */}
      <div className="profile-content">
        {activeTab === 'posts' && (
          <div className="tab-content-posts">
            <div className="no-content-message">
              <p>📝 No posts yet</p>
              {isOwnProfile && (
                <button className="btn-primary">Create your first post</button>
              )}
            </div>
          </div>
        )}

        {activeTab === 'about' && (
          <div className="tab-content-about">
            <div className="about-section">
              <h3>About</h3>
              {profile.bio ? (
                <p>{profile.bio}</p>
              ) : (
                <p className="no-content">No bio added yet</p>
              )}
            </div>

            {profile.interests && profile.interests.length > 0 && (
              <div className="about-section">
                <h3>Interests</h3>
                <div className="interests-tags">
                  {profile.interests.map((interest, index) => (
                    <span key={index} className="interest-tag">
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'friends' && (
          <div className="tab-content-friends">
            <div className="no-content-message">
              <p>👥 No friends to show</p>
            </div>
          </div>
        )}

        {activeTab === 'photos' && (
          <div className="tab-content-photos">
            <div className="no-content-message">
              <p>📸 No photos yet</p>
            </div>
          </div>
        )}

        {activeTab === 'videos' && (
          <div className="tab-content-videos">
            <div className="no-content-message">
              <p>🎥 No videos yet</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SocialProfile;
