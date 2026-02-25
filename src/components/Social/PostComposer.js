import React, { useState, useRef } from 'react';
import './PostComposer.css';
import postsService from '../../services/postsService';

const PostComposer = ({ user, onPostCreated, className = '' }) => {
  const [content, setContent] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [visibility, setVisibility] = useState('public');
  const [feeling, setFeeling] = useState('');
  const [location, setLocation] = useState('');
  const [showOptions, setShowOptions] = useState(false);
  const [media, setMedia] = useState([]);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  const feelings = [
    { value: 'happy', label: '😊 Happy', emoji: '😊' },
    { value: 'excited', label: '🎉 Excited', emoji: '🎉' },
    { value: 'loved', label: '❤️ Loved', emoji: '❤️' },
    { value: 'grateful', label: '🙏 Grateful', emoji: '🙏' },
    { value: 'blessed', label: '✨ Blessed', emoji: '✨' },
    { value: 'motivated', label: '💪 Motivated', emoji: '💪' },
    { value: 'relaxed', label: '😌 Relaxed', emoji: '😌' },
    { value: 'thoughtful', label: '🤔 Thoughtful', emoji: '🤔' }
  ];

  const handleExpand = () => {
    setIsExpanded(true);
    setTimeout(() => textareaRef.current?.focus(), 100);
  };

  const handleCollapse = () => {
    if (!content && media.length === 0) {
      setIsExpanded(false);
      setShowOptions(false);
      setFeeling('');
      setLocation('');
    }
  };

  const handleContentChange = (e) => {
    setContent(e.target.value);
    setError('');
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    const newMedia = files.map(file => ({
      type: file.type.startsWith('image/') ? 'image' : 'video',
      file,
      url: URL.createObjectURL(file),
      name: file.name
    }));
    setMedia([...media, ...newMedia]);
  };

  const removeMedia = (index) => {
    const newMedia = [...media];
    URL.revokeObjectURL(newMedia[index].url);
    newMedia.splice(index, 1);
    setMedia(newMedia);
  };

  const handlePost = async () => {
    if (!content.trim() && media.length === 0) {
      setError('Please write something or add media');
      return;
    }

    setIsPosting(true);
    setError('');

    try {
      // Extract hashtags and mentions
      const tags = postsService.extractHashtags(content);
      const mentions = postsService.extractMentions(content);

      // Prepare post data
      const postData = {
        userId: user.id,
        content: content.trim(),
        type: media.length > 0 ? (media[0].type === 'image' ? 'image' : 'video') : 'text',
        media: media.map(m => ({ type: m.type, url: m.url, name: m.name })),
        visibility,
        tags,
        mentions,
        feeling: feeling || null,
        location: location || null
      };

      const result = await postsService.createPost(postData);

      if (result.success) {
        // Reset form
        setContent('');
        setMedia([]);
        setFeeling('');
        setLocation('');
        setIsExpanded(false);
        setShowOptions(false);
        
        // Notify parent
        if (onPostCreated) {
          onPostCreated(result.post);
        }
      } else {
        setError(result.error || 'Failed to create post');
      }
    } catch (err) {
      setError(err.message || 'Failed to create post');
    } finally {
      setIsPosting(false);
    }
  };

  const getFeelingEmoji = () => {
    const selected = feelings.find(f => f.value === feeling);
    return selected ? selected.emoji : '';
  };

  return (
    <div className={`post-composer ${isExpanded ? 'expanded' : ''} ${className}`}>
      <div className="post-composer-header">
        <div className="user-avatar">
          {user.avatar ? (
            <img src={user.avatar} alt={user.displayName || user.username} />
          ) : (
            <div className="avatar-placeholder">
              {(user.displayName || user.username).charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        
        {!isExpanded ? (
          <div className="composer-trigger" onClick={handleExpand}>
            <span className="placeholder">What's on your mind, {user.displayName || user.username}?</span>
          </div>
        ) : (
          <div className="composer-content">
            <textarea
              ref={textareaRef}
              className="composer-textarea"
              placeholder={`What's on your mind, ${user.displayName || user.username}?`}
              value={content}
              onChange={handleContentChange}
              rows={4}
              disabled={isPosting}
            />
            
            {error && <div className="composer-error">{error}</div>}
            
            {/* Media Preview */}
            {media.length > 0 && (
              <div className="media-preview">
                {media.map((item, index) => (
                  <div key={index} className="media-item">
                    {item.type === 'image' ? (
                      <img src={item.url} alt={item.name} />
                    ) : (
                      <video src={item.url} />
                    )}
                    <button 
                      className="remove-media" 
                      onClick={() => removeMedia(index)}
                      disabled={isPosting}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {/* Feeling & Location Display */}
            {(feeling || location) && (
              <div className="post-meta">
                {feeling && (
                  <span className="meta-tag feeling">
                    {getFeelingEmoji()} Feeling {feeling}
                  </span>
                )}
                {location && (
                  <span className="meta-tag location">
                    📍 {location}
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {isExpanded && (
        <>
          {/* Options Panel */}
          {showOptions && (
            <div className="options-panel">
              <div className="option-group">
                <label>Feeling/Activity</label>
                <select value={feeling} onChange={(e) => setFeeling(e.target.value)}>
                  <option value="">Select a feeling...</option>
                  {feelings.map(f => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>
              
              <div className="option-group">
                <label>Location</label>
                <input
                  type="text"
                  placeholder="Add location..."
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
              
              <div className="option-group">
                <label>Privacy</label>
                <select value={visibility} onChange={(e) => setVisibility(e.target.value)}>
                  <option value="public">🌍 Public</option>
                  <option value="friends">👥 Friends</option>
                  <option value="private">🔒 Only Me</option>
                </select>
              </div>
            </div>
          )}

          {/* Action Bar */}
          <div className="composer-actions">
            <div className="action-buttons">
              <button 
                className="action-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={isPosting}
                title="Add photo/video"
              >
                <span className="icon">📷</span>
                <span className="label">Photo/Video</span>
              </button>
              
              <button 
                className="action-btn"
                onClick={() => setShowOptions(!showOptions)}
                disabled={isPosting}
                title="More options"
              >
                <span className="icon">⚙️</span>
                <span className="label">Options</span>
              </button>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                style={{ display: 'none' }}
                onChange={handleFileSelect}
              />
            </div>
            
            <div className="post-buttons">
              <button 
                className="btn-cancel"
                onClick={handleCollapse}
                disabled={isPosting}
              >
                Cancel
              </button>
              <button 
                className="btn-post"
                onClick={handlePost}
                disabled={isPosting || (!content.trim() && media.length === 0)}
              >
                {isPosting ? 'Posting...' : 'Post'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PostComposer;
