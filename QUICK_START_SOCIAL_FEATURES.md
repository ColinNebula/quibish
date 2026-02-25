# 🚀 Quick Start: Implementing Social Network Features

## Overview
This guide will help you implement the first set of social network features for Quibish. We'll start with the most essential features that will transform the app from a messaging platform to a social network.

---

## 📝 Phase 0: Quick Wins (2-3 Weeks)

### Priority 1: Enhanced User Profiles ⭐⭐⭐⭐⭐

#### Backend Changes
```javascript
// backend/models/User.js - Add to existing user model
{
  // Existing fields...
  username: String,
  email: String,
  name: String,
  
  // NEW SOCIAL FIELDS
  bio: { type: String, maxLength: 500, default: '' },
  coverPhoto: { type: String, default: null },
  location: { type: String, default: '' },
  website: { type: String, default: '' },
  interests: { type: [String], default: [] },
  
  // Stats
  friendsCount: { type: Number, default: 0 },
  postsCount: { type: Number, default: 0 },
  followersCount: { type: Number, default: 0 },
  followingCount: { type: Number, default: 0 },
  
  // Social Links (already exists)
  socialLinks: {
    twitter: String,
    linkedin: String,
    github: String,
    instagram: String,
    facebook: String,
    youtube: String
  },
  
  // Privacy Settings
  privacy: {
    profileVisibility: { type: String, enum: ['public', 'friends', 'private'], default: 'public' },
    showEmail: { type: Boolean, default: false },
    showPhone: { type: Boolean, default: false },
    allowFriendRequests: { type: Boolean, default: true },
    showOnlineStatus: { type: Boolean, default: true }
  }
}
```

#### Frontend Component
```jsx
// src/components/Social/Profile/SocialProfile.jsx
import React, { useState, useEffect } from 'react';
import './SocialProfile.css';

const SocialProfile = ({ userId, isOwnProfile }) => {
  const [profile, setProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="social-profile">
      {/* Cover Photo */}
      <div className="profile-cover">
        <img src={profile?.coverPhoto || '/default-cover.jpg'} alt="Cover" />
        {isOwnProfile && (
          <button className="edit-cover-btn">
            <i className="icon-camera"></i> Change Cover
          </button>
        )}
      </div>

      {/* Profile Header */}
      <div className="profile-header">
        <div className="profile-avatar-section">
          <img src={profile?.avatar} alt={profile?.name} className="profile-avatar-large" />
          {isOwnProfile && <button className="edit-avatar-btn">📷</button>}
        </div>
        
        <div className="profile-info">
          <h1>{profile?.name}</h1>
          <p className="username">@{profile?.username}</p>
          <p className="bio">{profile?.bio}</p>
        </div>

        <div className="profile-stats">
          <div className="stat">
            <strong>{profile?.friendsCount}</strong>
            <span>Friends</span>
          </div>
          <div className="stat">
            <strong>{profile?.postsCount}</strong>
            <span>Posts</span>
          </div>
          <div className="stat">
            <strong>{profile?.followersCount}</strong>
            <span>Followers</span>
          </div>
        </div>

        {!isOwnProfile && (
          <div className="profile-actions">
            <button className="btn-primary">Add Friend</button>
            <button className="btn-secondary">Message</button>
            <button className="btn-secondary">More</button>
          </div>
        )}
      </div>

      {/* Profile Content Tabs */}
      <div className="profile-tabs">
        <button className="tab active">Posts</button>
        <button className="tab">About</button>
        <button className="tab">Friends</button>
        <button className="tab">Photos</button>
        <button className="tab">Videos</button>
      </div>
    </div>
  );
};

export default SocialProfile;
```

---

### Priority 2: Posts & News Feed ⭐⭐⭐⭐⭐

#### Database Schema
```sql
-- Run this migration
CREATE TABLE posts (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  content TEXT,
  media_urls JSON,
  media_type ENUM('none', 'photo', 'video', 'link'),
  visibility ENUM('public', 'friends', 'private') DEFAULT 'friends',
  location VARCHAR(255),
  tagged_users JSON,
  likes_count INT DEFAULT 0,
  comments_count INT DEFAULT 0,
  shares_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_created (user_id, created_at DESC),
  INDEX idx_created (created_at DESC)
);

CREATE TABLE post_likes (
  id VARCHAR(36) PRIMARY KEY,
  post_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_like (post_id, user_id),
  INDEX idx_post (post_id)
);

CREATE TABLE post_comments (
  id VARCHAR(36) PRIMARY KEY,
  post_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  parent_comment_id VARCHAR(36),
  content TEXT NOT NULL,
  media_url VARCHAR(255),
  likes_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_comment_id) REFERENCES post_comments(id) ON DELETE CASCADE,
  INDEX idx_post_created (post_id, created_at DESC)
);
```

#### Backend API
```javascript
// backend/routes/posts.js
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

// Create a post
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { content, mediaUrls, mediaType, visibility, location, taggedUsers } = req.body;
    
    const postId = uuidv4();
    const post = {
      id: postId,
      user_id: req.user.id,
      content: content || '',
      media_urls: JSON.stringify(mediaUrls || []),
      media_type: mediaType || 'none',
      visibility: visibility || 'friends',
      location: location || null,
      tagged_users: JSON.stringify(taggedUsers || []),
      created_at: new Date()
    };

    // Insert post
    await db.query('INSERT INTO posts SET ?', post);
    
    // Update user's post count
    await db.query('UPDATE users SET postsCount = postsCount + 1 WHERE id = ?', [req.user.id]);

    // Fetch complete post with user info
    const [posts] = await db.query(`
      SELECT p.*, u.name, u.username, u.avatar
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `, [postId]);

    res.status(201).json({
      success: true,
      post: posts[0]
    });
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get news feed
router.get('/feed', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // Get posts from user and their friends
    const [posts] = await db.query(`
      SELECT 
        p.*,
        u.name, u.username, u.avatar,
        (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as likes_count,
        (SELECT COUNT(*) FROM post_comments WHERE post_id = p.id) as comments_count,
        EXISTS(SELECT 1 FROM post_likes WHERE post_id = p.id AND user_id = ?) as is_liked
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.user_id = ? 
         OR p.user_id IN (
           SELECT friend_id FROM connections 
           WHERE user_id = ? AND status = 'accepted'
         )
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `, [req.user.id, req.user.id, req.user.id, parseInt(limit), offset]);

    res.json({
      success: true,
      posts,
      hasMore: posts.length === parseInt(limit)
    });
  } catch (error) {
    console.error('Error fetching feed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Like a post
router.post('/:postId/like', authenticateToken, async (req, res) => {
  try {
    const { postId } = req.params;
    
    // Check if already liked
    const [existing] = await db.query(
      'SELECT id FROM post_likes WHERE post_id = ? AND user_id = ?',
      [postId, req.user.id]
    );

    if (existing.length > 0) {
      // Unlike
      await db.query('DELETE FROM post_likes WHERE post_id = ? AND user_id = ?', 
        [postId, req.user.id]);
      await db.query('UPDATE posts SET likes_count = likes_count - 1 WHERE id = ?', [postId]);
      
      res.json({ success: true, liked: false });
    } else {
      // Like
      await db.query('INSERT INTO post_likes (id, post_id, user_id) VALUES (?, ?, ?)',
        [uuidv4(), postId, req.user.id]);
      await db.query('UPDATE posts SET likes_count = likes_count + 1 WHERE id = ?', [postId]);
      
      // TODO: Create notification for post owner
      
      res.json({ success: true, liked: true });
    }
  } catch (error) {
    console.error('Error liking post:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Comment on a post
router.post('/:postId/comment', authenticateToken, async (req, res) => {
  try {
    const { postId } = req.params;
    const { content, parentCommentId } = req.body;

    const commentId = uuidv4();
    await db.query(`
      INSERT INTO post_comments (id, post_id, user_id, parent_comment_id, content)
      VALUES (?, ?, ?, ?, ?)
    `, [commentId, postId, req.user.id, parentCommentId || null, content]);

    // Update post comment count
    await db.query('UPDATE posts SET comments_count = comments_count + 1 WHERE id = ?', [postId]);

    // Fetch the comment with user info
    const [comments] = await db.query(`
      SELECT c.*, u.name, u.username, u.avatar
      FROM post_comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `, [commentId]);

    res.status(201).json({
      success: true,
      comment: comments[0]
    });
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
```

#### Frontend Components
```jsx
// src/components/Social/Feed/PostComposer.jsx
import React, { useState } from 'react';
import './PostComposer.css';

const PostComposer = ({ onPostCreated }) => {
  const [content, setContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [mediaFiles, setMediaFiles] = useState([]);

  const handlePost = async () => {
    if (!content.trim() && mediaFiles.length === 0) return;

    setIsPosting(true);
    try {
      // Upload media if any
      const mediaUrls = await uploadMedia(mediaFiles);

      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          content: content.trim(),
          mediaUrls,
          mediaType: mediaFiles.length > 0 ? 'photo' : 'none',
          visibility: 'friends'
        })
      });

      const data = await response.json();
      if (data.success) {
        setContent('');
        setMediaFiles([]);
        onPostCreated(data.post);
      }
    } catch (error) {
      console.error('Error creating post:', error);
      alert('Failed to create post');
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="post-composer">
      <div className="composer-header">
        <img src={currentUser.avatar} alt={currentUser.name} className="composer-avatar" />
        <textarea
          placeholder="What's on your mind?"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          disabled={isPosting}
        />
      </div>

      {mediaFiles.length > 0 && (
        <div className="composer-media-preview">
          {mediaFiles.map((file, index) => (
            <div key={index} className="media-preview-item">
              <img src={URL.createObjectURL(file)} alt={`Preview ${index + 1}`} />
              <button onClick={() => removeMedia(index)}>✕</button>
            </div>
          ))}
        </div>
      )}

      <div className="composer-actions">
        <div className="composer-options">
          <button className="option-btn" onClick={() => fileInput.current.click()}>
            <i className="icon-photo"></i> Photo/Video
          </button>
          <button className="option-btn">
            <i className="icon-emoji"></i> Feeling/Activity
          </button>
          <button className="option-btn">
            <i className="icon-location"></i> Check In
          </button>
        </div>
        
        <button 
          className="post-btn" 
          onClick={handlePost}
          disabled={isPosting || (!content.trim() && mediaFiles.length === 0)}
        >
          {isPosting ? 'Posting...' : 'Post'}
        </button>
      </div>

      <input
        ref={fileInput}
        type="file"
        accept="image/*,video/*"
        multiple
        hidden
        onChange={(e) => setMediaFiles([...e.target.files])}
      />
    </div>
  );
};
```

```jsx
// src/components/Social/Feed/PostCard.jsx
import React, { useState } from 'react';
import './PostCard.css';

const PostCard = ({ post }) => {
  const [isLiked, setIsLiked] = useState(post.is_liked);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [showComments, setShowComments] = useState(false);

  const handleLike = async () => {
    try {
      const response = await fetch(`/api/posts/${post.id}/like`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      const data = await response.json();
      if (data.success) {
        setIsLiked(data.liked);
        setLikesCount(prev => data.liked ? prev + 1 : prev - 1);
      }
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  return (
    <div className="post-card">
      {/* Post Header */}
      <div className="post-header">
        <img src={post.avatar} alt={post.name} className="post-avatar" />
        <div className="post-author-info">
          <h4>{post.name}</h4>
          <p className="post-time">{formatTime(post.created_at)}</p>
        </div>
        <button className="post-menu-btn">⋯</button>
      </div>

      {/* Post Content */}
      <div className="post-content">
        {post.content && <p>{post.content}</p>}
        
        {post.media_urls && JSON.parse(post.media_urls).length > 0 && (
          <div className="post-media">
            {JSON.parse(post.media_urls).map((url, index) => (
              <img key={index} src={url} alt={`Post media ${index + 1}`} />
            ))}
          </div>
        )}
      </div>

      {/* Post Stats */}
      <div className="post-stats">
        <span>{likesCount} likes</span>
        <span>{post.comments_count} comments</span>
        <span>{post.shares_count} shares</span>
      </div>

      {/* Post Actions */}
      <div className="post-actions">
        <button 
          className={`action-btn ${isLiked ? 'liked' : ''}`}
          onClick={handleLike}
        >
          <i className={`icon-heart${isLiked ? '-filled' : ''}`}></i>
          Like
        </button>
        <button 
          className="action-btn"
          onClick={() => setShowComments(!showComments)}
        >
          <i className="icon-comment"></i>
          Comment
        </button>
        <button className="action-btn">
          <i className="icon-share"></i>
          Share
        </button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="post-comments">
          <CommentsList postId={post.id} />
          <CommentInput postId={post.id} />
        </div>
      )}
    </div>
  );
};
```

---

### Priority 3: Friend Connections ⭐⭐⭐⭐

#### Database Schema
```sql
CREATE TABLE connections (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  friend_id VARCHAR(36) NOT NULL,
  status ENUM('pending', 'accepted', 'declined', 'blocked') DEFAULT 'pending',
  requested_by VARCHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (friend_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (requested_by) REFERENCES users(id),
  UNIQUE KEY unique_connection (user_id, friend_id),
  INDEX idx_user_status (user_id, status),
  INDEX idx_friend_status (friend_id, status)
);
```

#### Backend API
```javascript
// backend/routes/connections.js
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

// Send friend request
router.post('/request', authenticateToken, async (req, res) => {
  try {
    const { friendId } = req.body;
    const userId = req.user.id;

    if (userId === friendId) {
      return res.status(400).json({ success: false, error: 'Cannot add yourself' });
    }

    // Check if connection already exists
    const [existing] = await db.query(
      'SELECT * FROM connections WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)',
      [userId, friendId, friendId, userId]
    );

    if (existing.length > 0) {
      return res.status(400).json({ success: false, error: 'Connection already exists' });
    }

    // Create bidirectional connections
    const connectionId1 = uuidv4();
    const connectionId2 = uuidv4();

    await db.query(`
      INSERT INTO connections (id, user_id, friend_id, status, requested_by)
      VALUES (?, ?, ?, 'pending', ?), (?, ?, ?, 'pending', ?)
    `, [connectionId1, userId, friendId, userId, connectionId2, friendId, userId, userId]);

    // TODO: Create notification for friend

    res.json({ success: true, message: 'Friend request sent' });
  } catch (error) {
    console.error('Error sending friend request:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Accept friend request
router.put('/:connectionId/accept', authenticateToken, async (req, res) => {
  try {
    const { connectionId } = req.params;
    const userId = req.user.id;

    // Update both connections to accepted
    await db.query(`
      UPDATE connections 
      SET status = 'accepted', updated_at = NOW()
      WHERE id = ? OR (user_id = ? AND friend_id = (
        SELECT friend_id FROM (SELECT friend_id FROM connections WHERE id = ?) t
      ))
    `, [connectionId, userId, connectionId]);

    // Update friend counts
    const [connection] = await db.query('SELECT user_id, friend_id FROM connections WHERE id = ?', [connectionId]);
    if (connection.length > 0) {
      await db.query('UPDATE users SET friendsCount = friendsCount + 1 WHERE id IN (?, ?)',
        [connection[0].user_id, connection[0].friend_id]);
    }

    res.json({ success: true, message: 'Friend request accepted' });
  } catch (error) {
    console.error('Error accepting friend request:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get friends list
router.get('/friends', authenticateToken, async (req, res) => {
  try {
    const [friends] = await db.query(`
      SELECT u.id, u.name, u.username, u.avatar, u.bio, u.status
      FROM connections c
      JOIN users u ON c.friend_id = u.id
      WHERE c.user_id = ? AND c.status = 'accepted'
      ORDER BY u.name
    `, [req.user.id]);

    res.json({ success: true, friends });
  } catch (error) {
    console.error('Error fetching friends:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get pending friend requests
router.get('/requests/pending', authenticateToken, async (req, res) => {
  try {
    const [requests] = await db.query(`
      SELECT c.id as connection_id, u.id, u.name, u.username, u.avatar, c.created_at
      FROM connections c
      JOIN users u ON c.requested_by = u.id
      WHERE c.friend_id = ? AND c.status = 'pending' AND c.requested_by != ?
      ORDER BY c.created_at DESC
    `, [req.user.id, req.user.id]);

    res.json({ success: true, requests });
  } catch (error) {
    console.error('Error fetching friend requests:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get friend suggestions
router.get('/suggestions', authenticateToken, async (req, res) => {
  try {
    // Get mutual friends based suggestions
    const [suggestions] = await db.query(`
      SELECT DISTINCT u.id, u.name, u.username, u.avatar, u.bio,
        COUNT(DISTINCT c2.friend_id) as mutual_friends_count
      FROM users u
      JOIN connections c1 ON u.id = c1.friend_id
      JOIN connections c2 ON c1.user_id = c2.friend_id
      WHERE c2.user_id = ? 
        AND c2.status = 'accepted'
        AND u.id != ?
        AND u.id NOT IN (
          SELECT friend_id FROM connections WHERE user_id = ?
        )
      GROUP BY u.id, u.name, u.username, u.avatar, u.bio
      ORDER BY mutual_friends_count DESC
      LIMIT 10
    `, [req.user.id, req.user.id, req.user.id]);

    res.json({ success: true, suggestions });
  } catch (error) {
    console.error('Error fetching friend suggestions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
```

---

### Priority 4: Notifications System ⭐⭐⭐⭐

#### Database Schema
```sql
CREATE TABLE notifications (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  actor_id VARCHAR(36),
  type ENUM('friend_request', 'friend_accept', 'post_like', 'post_comment', 'post_mention', 'comment_reply') NOT NULL,
  target_type VARCHAR(50),
  target_id VARCHAR(36),
  content TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_read (user_id, is_read, created_at DESC)
);
```

#### Backend API
```javascript
// backend/routes/notifications.js
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

// Get user notifications
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly = false } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT n.*, u.name as actor_name, u.username as actor_username, u.avatar as actor_avatar
      FROM notifications n
      LEFT JOIN users u ON n.actor_id = u.id
      WHERE n.user_id = ?
    `;

    if (unreadOnly === 'true') {
      query += ' AND n.is_read = FALSE';
    }

    query += ' ORDER BY n.created_at DESC LIMIT ? OFFSET ?';

    const [notifications] = await db.query(query, [req.user.id, parseInt(limit), offset]);

    res.json({
      success: true,
      notifications,
      hasMore: notifications.length === parseInt(limit)
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Mark notification as read
router.put('/:notificationId/read', authenticateToken, async (req, res) => {
  try {
    await db.query(
      'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
      [req.params.notificationId, req.user.id]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Mark all notifications as read
router.put('/read-all', authenticateToken, async (req, res) => {
  try {
    await db.query(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE',
      [req.user.id]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get unread count
router.get('/unread-count', authenticateToken, async (req, res) => {
  try {
    const [result] = await db.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE',
      [req.user.id]
    );

    res.json({ success: true, count: result[0].count });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
```

---

## 🎨 CSS Styles

```css
/* src/components/Social/Feed/Feed.css */
.social-feed {
  max-width: 680px;
  margin: 0 auto;
  padding: 20px;
}

.post-composer {
  background: white;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.composer-header {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.composer-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
}

.composer-header textarea {
  flex: 1;
  border: none;
  resize: none;
  font-size: 16px;
  padding: 12px;
  background: #f0f2f5;
  border-radius: 20px;
  font-family: inherit;
}

.composer-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid #e4e6eb;
}

.composer-options {
  display: flex;
  gap: 8px;
}

.option-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border: none;
  background: transparent;
  color: #65676b;
  font-size: 14px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
}

.option-btn:hover {
  background: #f0f2f5;
}

.post-btn {
  padding: 8px 24px;
  background: #1877f2;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.post-btn:hover:not(:disabled) {
  background: #166fe5;
}

.post-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Post Card */
.post-card {
  background: white;
  border-radius: 12px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.post-header {
  display: flex;
  align-items: center;
  padding: 16px;
  gap: 12px;
}

.post-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
}

.post-author-info {
  flex: 1;
}

.post-author-info h4 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
}

.post-time {
  margin: 2px 0 0 0;
  font-size: 13px;
  color: #65676b;
}

.post-menu-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  border-radius: 50%;
  font-size: 20px;
  color: #65676b;
  cursor: pointer;
  transition: background 0.2s;
}

.post-menu-btn:hover {
  background: #f0f2f5;
}

.post-content {
  padding: 0 16px 16px;
}

.post-content p {
  margin: 0 0 12px 0;
  line-height: 1.5;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.post-media {
  margin-top: 12px;
  border-radius: 8px;
  overflow: hidden;
}

.post-media img {
  width: 100%;
  display: block;
}

.post-stats {
  display: flex;
  justify-content: space-between;
  padding: 8px 16px;
  font-size: 14px;
  color: #65676b;
  border-top: 1px solid #e4e6eb;
}

.post-actions {
  display: flex;
  padding: 4px 16px 12px;
  gap: 4px;
}

.action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px;
  border: none;
  background: transparent;
  color: #65676b;
  font-size: 14px;
  font-weight: 600;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
}

.action-btn:hover {
  background: #f0f2f5;
}

.action-btn.liked {
  color: #e41e3f;
}
```

---

## 📱 Mobile Responsive

```css
/* Mobile optimizations */
@media (max-width: 768px) {
  .social-feed {
    padding: 12px;
  }

  .post-composer,
  .post-card {
    border-radius: 0;
    margin-bottom: 8px;
  }

  .composer-header textarea {
    font-size: 14px;
  }

  .option-btn span {
    display: none; /* Hide text on mobile, show icon only */
  }
}
```

---

## 🚀 Next Steps

1. **Set up database tables** - Run the SQL migrations
2. **Add API routes** - Integrate the new routes in your backend
3. **Create components** - Build the React components
4. **Test features** - Test posting, liking, commenting, friendships
5. **Polish UI** - Add loading states, error handling, animations

---

## 📚 Additional Resources

- [News Feed Architecture](https://engineering.fb.com/2013/03/20/web/news-feed/)
- [Building a Social Network Database](https://www.digitalocean.com/community/tutorials/how-to-model-a-social-network-database)
- [React Patterns for Social Apps](https://reactpatterns.com/)

---

**Ready to build? Let's get started! 🎉**
