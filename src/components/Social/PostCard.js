import React, { useState, useRef, useEffect } from 'react';
import './PostCard.css';
import postsService from '../../services/postsService';

const PostCard = ({ post: initialPost, currentUser, onPostDeleted, onPostUpdated, className = '' }) => {
  const [post, setPost] = useState(initialPost);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isCommenting, setIsCommenting] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [showReactions, setShowReactions] = useState(false);
  const optionsRef = useRef(null);

  const reactions = [
    { type: 'like', emoji: '👍', label: 'Like' },
    { type: 'love', emoji: '❤️', label: 'Love' },
    { type: 'haha', emoji: '😂', label: 'Haha' },
    { type: 'wow', emoji: '😮', label: 'Wow' },
    { type: 'sad', emoji: '😢', label: 'Sad' },
    { type: 'angry', emoji: '😠', label: 'Angry' }
  ];

  useEffect(() => {
    setPost(initialPost);
  }, [initialPost]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (optionsRef.current && !optionsRef.current.contains(event.target)) {
        setShowOptions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLike = async (reactionType = 'like') => {
    try {
      const result = await postsService.toggleLike('post', post.id, currentUser.id, reactionType);
      
      if (result.success) {
        setPost({
          ...post,
          isLikedByCurrentUser: result.liked,
          likesCount: result.likesCount
        });
      }
      setShowReactions(false);
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const loadComments = async () => {
    if (comments.length > 0) {
      setShowComments(!showComments);
      return;
    }

    setIsLoadingComments(true);
    try {
      const result = await postsService.getComments(post.id, {
        userId: currentUser.id,
        limit: 10
      });

      if (result.success) {
        setComments(result.comments);
        setShowComments(true);
      }
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setIsLoadingComments(false);
    }
  };

  const handleComment = async () => {
    if (!commentText.trim()) return;

    setIsCommenting(true);
    try {
      const result = await postsService.addComment(post.id, {
        userId: currentUser.id,
        content: commentText.trim()
      });

      if (result.success) {
        setComments([result.comment, ...comments]);
        setCommentText('');
        setPost({
          ...post,
          commentsCount: post.commentsCount + 1
        });
      }
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setIsCommenting(false);
    }
  };

  const handleShare = async () => {
    try {
      const result = await postsService.sharePost(post.id, currentUser.id);
      
      if (result.success) {
        setPost({
          ...post,
          sharesCount: post.sharesCount + 1
        });
        alert('Post shared successfully!');
      }
    } catch (error) {
      console.error('Error sharing post:', error);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditContent(post.content);
    setShowOptions(false);
  };

  const handleSaveEdit = async () => {
    try {
      const result = await postsService.updatePost(post.id, {
        userId: currentUser.id,
        content: editContent
      });

      if (result.success) {
        setPost(result.post);
        setIsEditing(false);
        if (onPostUpdated) onPostUpdated(result.post);
      }
    } catch (error) {
      console.error('Error updating post:', error);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;

    try {
      const result = await postsService.deletePost(post.id, currentUser.id);

      if (result.success) {
        if (onPostDeleted) onPostDeleted(post.id);
      }
    } catch (error) {
      console.error('Error deleting post:', error);
    }
  };

  const handlePin = async () => {
    try {
      const result = await postsService.togglePin(post.id, currentUser.id, !post.isPinned);

      if (result.success) {
        setPost(result.post);
        if (onPostUpdated) onPostUpdated(result.post);
      }
      setShowOptions(false);
    } catch (error) {
      console.error('Error toggling pin:', error);
    }
  };

  const isOwnPost = currentUser && post.author && currentUser.id === post.author.id;

  return (
    <div className={`post-card ${className}`}>
      {/* Post Header */}
      <div className="post-header">
        <div className="post-author">
          <div className="author-avatar">
            {post.author?.avatar ? (
              <img src={post.author.avatar} alt={post.author.displayName} />
            ) : (
              <div className="avatar-placeholder">
                {post.author?.displayName?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
          </div>
          
          <div className="author-info">
            <div className="author-name">
              {post.author?.displayName || 'Unknown User'}
              {post.isPinned && <span className="pinned-badge">📌 Pinned</span>}
            </div>
            <div className="post-time">
              {postsService.getTimeAgo(post.createdAt)}
              {post.isEdited && ' · Edited'}
              {post.visibility !== 'public' && ` · ${post.visibility === 'friends' ? '👥' : '🔒'}`}
              {post.feeling && ` · Feeling ${post.feeling}`}
              {post.location && ` · 📍 ${post.location}`}
            </div>
          </div>
        </div>

        {isOwnPost && (
          <div className="post-options" ref={optionsRef}>
            <button className="options-btn" onClick={() => setShowOptions(!showOptions)}>
              ⋯
            </button>
            
            {showOptions && (
              <div className="options-menu">
                <button onClick={handlePin}>
                  {post.isPinned ? '📌 Unpin' : '📌 Pin to profile'}
                </button>
                <button onClick={handleEdit}>✏️ Edit post</button>
                <button onClick={handleDelete} className="danger">🗑️ Delete post</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Post Content */}
      <div className="post-content">
        {isEditing ? (
          <div className="edit-mode">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={4}
            />
            <div className="edit-actions">
              <button onClick={() => setIsEditing(false)}>Cancel</button>
              <button onClick={handleSaveEdit} className="primary">Save</button>
            </div>
          </div>
        ) : (
          <p className="post-text">{post.content}</p>
        )}

        {/* Media */}
        {post.media && post.media.length > 0 && !isEditing && (
          <div className={`post-media media-count-${post.media.length}`}>
            {post.media.map((item, index) => (
              <div key={index} className="media-item">
                {item.type === 'image' ? (
                  <img src={item.url} alt="" />
                ) : (
                  <video controls>
                    <source src={item.url} />
                  </video>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Shared Post */}
        {post.sharedPost && !isEditing && (
          <div className="shared-post">
            <div className="shared-post-header">
              <div className="shared-author-avatar">
                {post.sharedPost.author?.avatar ? (
                  <img src={post.sharedPost.author.avatar} alt={post.sharedPost.author.displayName} />
                ) : (
                  <div className="avatar-placeholder">
                    {post.sharedPost.author?.displayName?.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="shared-author-name">
                {post.sharedPost.author?.displayName}
              </div>
            </div>
            <p className="shared-post-content">{post.sharedPost.content}</p>
          </div>
        )}
      </div>

      {/* Engagement Stats */}
      {(post.likesCount > 0 || post.commentsCount > 0 || post.sharesCount > 0) && (
        <div className="post-stats">
          <div className="stats-left">
            {post.likesCount > 0 && (
              <button className="stat-item">
                <span className="stat-reactions">👍</span>
                <span className="stat-count">{post.likesCount}</span>
              </button>
            )}
          </div>
          <div className="stats-right">
            {post.commentsCount > 0 && (
              <button className="stat-item" onClick={loadComments}>
                {post.commentsCount} {post.commentsCount === 1 ? 'comment' : 'comments'}
              </button>
            )}
            {post.sharesCount > 0 && (
              <span className="stat-item">
                {post.sharesCount} {post.sharesCount === 1 ? 'share' : 'shares'}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="post-actions">
        <div className="reaction-container">
          <button
            className={`action-btn ${post.isLikedByCurrentUser ? 'active' : ''}`}
            onClick={() => handleLike('like')}
            onMouseEnter={() => setShowReactions(true)}
            onMouseLeave={() => setTimeout(() => setShowReactions(false), 300)}
          >
            <span className="action-icon">{post.isLikedByCurrentUser ? '👍' : '👍'}</span>
            <span className="action-label">Like</span>
          </button>

          {showReactions && (
            <div
              className="reactions-picker"
              onMouseEnter={() => setShowReactions(true)}
              onMouseLeave={() => setShowReactions(false)}
            >
              {reactions.map((reaction) => (
                <button
                  key={reaction.type}
                  className="reaction-btn"
                  onClick={() => handleLike(reaction.type)}
                  title={reaction.label}
                >
                  {reaction.emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        <button className="action-btn" onClick={loadComments}>
          <span className="action-icon">💬</span>
          <span className="action-label">Comment</span>
        </button>

        <button className="action-btn" onClick={handleShare}>
          <span className="action-icon">🔄</span>
          <span className="action-label">Share</span>
        </button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="comments-section">
          {/* Comment Input */}
          <div className="comment-input">
            <div className="commenter-avatar">
              {currentUser.avatar ? (
                <img src={currentUser.avatar} alt={currentUser.displayName} />
              ) : (
                <div className="avatar-placeholder">
                  {currentUser.displayName?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="comment-input-wrapper">
              <input
                type="text"
                placeholder="Write a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleComment()}
                disabled={isCommenting}
              />
              {commentText && (
                <button
                  className="send-comment-btn"
                  onClick={handleComment}
                  disabled={isCommenting}
                >
                  {isCommenting ? '...' : '➤'}
                </button>
              )}
            </div>
          </div>

          {/* Comments List */}
          {isLoadingComments ? (
            <div className="loading-comments">Loading comments...</div>
          ) : (
            <div className="comments-list">
              {comments.map((comment) => (
                <Comment
                  key={comment.id}
                  comment={comment}
                  currentUser={currentUser}
                  postId={post.id}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Comment Component
const Comment = ({ comment, currentUser, postId }) => {
  const [isLiked, setIsLiked] = useState(comment.isLikedByCurrentUser);
  const [likesCount, setLikesCount] = useState(comment.likesCount);
  const [showReplies, setShowReplies] = useState(false);
  const [replies, setReplies] = useState(comment.replies || []);
  const [replyText, setReplyText] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [showReplyInput, setShowReplyInput] = useState(false);

  const handleLikeComment = async () => {
    try {
      const result = await postsService.toggleLike('comment', comment.id, currentUser.id);
      if (result.success) {
        setIsLiked(result.liked);
        setLikesCount(result.likesCount);
      }
    } catch (error) {
      console.error('Error liking comment:', error);
    }
  };

  const handleReply = async () => {
    if (!replyText.trim()) return;

    setIsReplying(true);
    try {
      const result = await postsService.addComment(postId, {
        userId: currentUser.id,
        content: replyText.trim(),
        parentCommentId: comment.id
      });

      if (result.success) {
        setReplies([...replies, result.comment]);
        setReplyText('');
        setShowReplyInput(false);
      }
    } catch (error) {
      console.error('Error adding reply:', error);
    } finally {
      setIsReplying(false);
    }
  };

  return (
    <div className="comment">
      <div className="comment-avatar">
        {comment.author?.avatar ? (
          <img src={comment.author.avatar} alt={comment.author.displayName} />
        ) : (
          <div className="avatar-placeholder">
            {comment.author?.displayName?.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      
      <div className="comment-content">
        <div className="comment-bubble">
          <div className="comment-author">{comment.author?.displayName}</div>
          <div className="comment-text">{comment.content}</div>
        </div>
        
        <div className="comment-actions">
          <button
            className={`comment-action ${isLiked ? 'active' : ''}`}
            onClick={handleLikeComment}
          >
            Like {likesCount > 0 && `(${likesCount})`}
          </button>
          <button
            className="comment-action"
            onClick={() => setShowReplyInput(!showReplyInput)}
          >
            Reply
          </button>
          <span className="comment-time">
            {postsService.getTimeAgo(comment.createdAt)}
          </span>
        </div>

        {/* Reply Input */}
        {showReplyInput && (
          <div className="reply-input">
            <input
              type="text"
              placeholder="Write a reply..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleReply()}
              disabled={isReplying}
            />
            {replyText && (
              <button onClick={handleReply} disabled={isReplying}>
                {isReplying ? '...' : 'Reply'}
              </button>
            )}
          </div>
        )}

        {/* Replies */}
        {comment.repliesCount > 0 && (
          <div className="replies-section">
            {!showReplies && replies.length < comment.repliesCount && (
              <button
                className="view-replies-btn"
                onClick={() => setShowReplies(true)}
              >
                View {comment.repliesCount} {comment.repliesCount === 1 ? 'reply' : 'replies'}
              </button>
            )}
            
            {(showReplies || replies.length > 0) && (
              <div className="replies-list">
                {replies.map((reply) => (
                  <Comment
                    key={reply.id}
                    comment={reply}
                    currentUser={currentUser}
                    postId={postId}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PostCard;
