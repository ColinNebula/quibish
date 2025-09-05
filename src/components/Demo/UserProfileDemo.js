import React, { useState } from 'react';
import UserProfileManager from '../Profile/UserProfileManager';
import './UserProfileDemo.css';

const UserProfileDemo = () => {
  const [showProfileManager, setShowProfileManager] = useState(false);
  const [currentUser, setCurrentUser] = useState({
    id: '1',
    username: 'demo',
    name: 'Demo User',
    email: 'demo@quibish.com',
    bio: 'This is a demo user for testing the Quibish profile management system.',
    phone: '+1 (555) 123-4567',
    location: 'San Francisco, CA',
    company: 'Quibish Inc.',
    jobTitle: 'Software Developer',
    website: 'https://demo.quibish.com',
    avatar: null,
    statusMessage: 'Building amazing chat experiences!',
    userMedia: {
      photos: [],
      videos: [],
      gifs: []
    }
  });

  const handleUserUpdate = (updatedUser) => {
    setCurrentUser(updatedUser);
    console.log('User profile updated:', updatedUser);
  };

  return (
    <div className="user-profile-demo">
      <div className="demo-header">
        <h1>User Profile Management System</h1>
        <p>Complete user profile and media management with backend integration</p>
      </div>

      <div className="demo-content">
        <div className="current-user-card">
          <div className="user-avatar">
            {currentUser.avatar ? (
              <img src={currentUser.avatar} alt={currentUser.name} />
            ) : (
              <div className="avatar-placeholder">
                {currentUser.name?.charAt(0) || 'U'}
              </div>
            )}
          </div>
          <div className="user-info">
            <h2>{currentUser.name}</h2>
            <p className="user-email">{currentUser.email}</p>
            <p className="user-title">{currentUser.jobTitle} at {currentUser.company}</p>
            <p className="user-bio">{currentUser.bio}</p>
            {currentUser.statusMessage && (
              <p className="user-status">{currentUser.statusMessage}</p>
            )}
          </div>
        </div>

        <div className="demo-actions">
          <button 
            className="open-profile-btn"
            onClick={() => setShowProfileManager(true)}
          >
            📝 Manage Profile & Media
          </button>
        </div>

        <div className="feature-list">
          <h3>✨ Features</h3>
          <ul>
            <li>✅ Complete profile information management</li>
            <li>✅ Avatar upload and management</li>
            <li>✅ Email update with validation</li>
            <li>✅ Photos, videos, and GIFs upload</li>
            <li>✅ Media organization and deletion</li>
            <li>✅ Real-time preview and thumbnails</li>
            <li>✅ File type and size validation</li>
            <li>✅ Responsive design</li>
            <li>✅ Backend API integration</li>
            <li>✅ Secure file storage</li>
          </ul>
        </div>

        <div className="technical-info">
          <h3>🔧 Technical Implementation</h3>
          <div className="tech-grid">
            <div className="tech-item">
              <h4>Frontend</h4>
              <ul>
                <li>React with Hooks</li>
                <li>File upload with drag & drop</li>
                <li>Image preview generation</li>
                <li>Form validation</li>
                <li>Responsive CSS</li>
              </ul>
            </div>
            <div className="tech-item">
              <h4>Backend</h4>
              <ul>
                <li>Node.js + Express</li>
                <li>Multer for file uploads</li>
                <li>File type validation</li>
                <li>Size limit enforcement</li>
                <li>Static file serving</li>
              </ul>
            </div>
            <div className="tech-item">
              <h4>Storage</h4>
              <ul>
                <li>Local file system</li>
                <li>Organized by media type</li>
                <li>Unique filename generation</li>
                <li>Automatic cleanup</li>
                <li>IndexedDB for local cache</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="api-endpoints">
          <h3>🌐 API Endpoints</h3>
          <div className="endpoint-list">
            <div className="endpoint">
              <span className="method get">GET</span>
              <span className="path">/api/users/profile</span>
              <span className="desc">Get user profile</span>
            </div>
            <div className="endpoint">
              <span className="method put">PUT</span>
              <span className="path">/api/users/profile</span>
              <span className="desc">Update user profile</span>
            </div>
            <div className="endpoint">
              <span className="method put">PUT</span>
              <span className="path">/api/users/email</span>
              <span className="desc">Update user email</span>
            </div>
            <div className="endpoint">
              <span className="method post">POST</span>
              <span className="path">/api/upload/avatar</span>
              <span className="desc">Upload avatar image</span>
            </div>
            <div className="endpoint">
              <span className="method post">POST</span>
              <span className="path">/api/upload/media</span>
              <span className="desc">Upload media files</span>
            </div>
            <div className="endpoint">
              <span className="method get">GET</span>
              <span className="path">/api/upload/media</span>
              <span className="desc">Get user media</span>
            </div>
            <div className="endpoint">
              <span className="method delete">DELETE</span>
              <span className="path">/api/upload/media/:id</span>
              <span className="desc">Delete specific media</span>
            </div>
          </div>
        </div>
      </div>

      {showProfileManager && (
        <UserProfileManager
          user={currentUser}
          onUserUpdate={handleUserUpdate}
          onClose={() => setShowProfileManager(false)}
        />
      )}
    </div>
  );
};

export default UserProfileDemo;
