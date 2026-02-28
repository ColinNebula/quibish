const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Like = require('../models/Like');
const User = require('../models/User');
const { createNotification } = require('./notifications');

// In-memory storage for posts (will fall back to MySQL if available)
const posts = new Map();
const comments = new Map();
const likes = new Map();

// Helper: Get user from in-memory storage or create mock user
function getUser(userId) {
  if (global.inMemoryStorage && global.inMemoryStorage.users) {
    return global.inMemoryStorage.users.get(userId);
  }
  // Return mock user for development
  return {
    id: userId,
    username: 'user' + userId,
    displayName: 'User ' + userId,
    avatar: null
  };
}

// Helper: Enrich post with user data
function enrichPost(post, currentUserId = null) {
  const user = getUser(post.userId);
  const enriched = {
    ...post.toJSON(),
    author: {
      id: user.id,
      username: user.username,
      displayName: user.displayName || user.name || user.username,
      avatar: user.avatar
    }
  };
  
  // Check if current user liked the post
  if (currentUserId) {
    enriched.isLikedByCurrentUser = post.likes.includes(currentUserId);
  }
  
  // If shared post, enrich it too
  if (post.sharedPostId && posts.has(post.sharedPostId)) {
    const sharedPost = posts.get(post.sharedPostId);
    enriched.sharedPost = enrichPost(sharedPost);
  }
  
  return enriched;
}

// Helper: Enrich comment with user data
function enrichComment(comment, currentUserId = null) {
  const user = getUser(comment.userId);
  const enriched = {
    ...comment.toJSON(),
    author: {
      id: user.id,
      username: user.username,
      displayName: user.displayName || user.name || user.username,
      avatar: user.avatar
    }
  };
  
  if (currentUserId) {
    enriched.isLikedByCurrentUser = comment.likes.includes(currentUserId);
  }
  
  return enriched;
}

// ============= POST ENDPOINTS =============

// Create a new post
router.post('/', async (req, res) => {
  try {
    const { 
      userId, 
      content, 
      type, 
      media, 
      visibility, 
      tags, 
      mentions, 
      location, 
      feeling, 
      activity,
      link,
      sharedPostId 
    } = req.body;

    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'User ID is required' 
      });
    }

    // Create new post
    const post = new Post({
      userId,
      content,
      type: type || 'text',
      media: media || [],
      visibility: visibility || 'public',
      tags: tags || [],
      mentions: mentions || [],
      location,
      feeling,
      activity,
      link,
      sharedPostId
    });

    // Save to storage
    posts.set(post.id, post);

    // Update user's post count
    const user = getUser(userId);
    if (user && user.posts_count !== undefined) {
      user.posts_count++;
    }

    // If sharing a post, increment share count
    if (sharedPostId && posts.has(sharedPostId)) {
      const sharedPost = posts.get(sharedPostId);
      sharedPost.sharesCount++;
      sharedPost.shares.push({ userId, timestamp: new Date() });
    }

    res.json({
      success: true,
      post: enrichPost(post, userId),
      message: 'Post created successfully'
    });
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create post',
      details: error.message 
    });
  }
});

// Get feed (all posts with pagination and filtering)
router.get('/feed', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      userId, 
      visibility = 'public',
      sortBy = 'recent' // recent, popular, trending
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    // Get all posts
    let allPosts = Array.from(posts.values());

    // Filter by visibility
    allPosts = allPosts.filter(post => {
      if (visibility === 'all') return true;
      return post.visibility === visibility || post.visibility === 'public';
    });

    // Filter out archived posts
    allPosts = allPosts.filter(post => !post.isArchived);

    // Sort posts
    if (sortBy === 'recent') {
      allPosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (sortBy === 'popular') {
      allPosts.sort((a, b) => b.likesCount - a.likesCount);
    } else if (sortBy === 'trending') {
      // Calculate trending score based on recent engagement
      allPosts.forEach(post => post.calculateEngagementScore());
      allPosts.sort((a, b) => b.engagementScore - a.engagementScore);
    }

    // Paginate
    const paginatedPosts = allPosts.slice(skip, skip + limitNum);
    
    // Enrich with user data
    const enrichedPosts = paginatedPosts.map(post => enrichPost(post, userId));

    res.json({
      success: true,
      posts: enrichedPosts,
      pagination: {
        page: parseInt(page),
        limit: limitNum,
        total: allPosts.length,
        pages: Math.ceil(allPosts.length / limitNum),
        hasMore: skip + limitNum < allPosts.length
      }
    });
  } catch (error) {
    console.error('Error fetching feed:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch feed',
      details: error.message 
    });
  }
});

// Get posts by user
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    // Get user's posts
    let userPosts = Array.from(posts.values()).filter(post => post.userId === userId);
    
    // Sort by date
    userPosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Paginate
    const paginatedPosts = userPosts.slice(skip, skip + limitNum);
    const enrichedPosts = paginatedPosts.map(post => enrichPost(post, userId));

    res.json({
      success: true,
      posts: enrichedPosts,
      pagination: {
        page: parseInt(page),
        limit: limitNum,
        total: userPosts.length,
        pages: Math.ceil(userPosts.length / limitNum),
        hasMore: skip + limitNum < userPosts.length
      }
    });
  } catch (error) {
    console.error('Error fetching user posts:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch user posts',
      details: error.message 
    });
  }
});

// Get single post by ID
router.get('/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId } = req.query;

    if (!posts.has(postId)) {
      return res.status(404).json({ 
        success: false, 
        error: 'Post not found' 
      });
    }

    const post = posts.get(postId);
    
    // Increment view count
    post.views++;

    res.json({
      success: true,
      post: enrichPost(post, userId)
    });
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch post',
      details: error.message 
    });
  }
});

// Update post
router.put('/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId, content, media, visibility, tags, location, feeling, activity } = req.body;

    if (!posts.has(postId)) {
      return res.status(404).json({ 
        success: false, 
        error: 'Post not found' 
      });
    }

    const post = posts.get(postId);

    // Check authorization
    if (post.userId !== userId) {
      return res.status(403).json({ 
        success: false, 
        error: 'Not authorized to update this post' 
      });
    }

    // Update fields
    if (content !== undefined) post.content = content;
    if (media !== undefined) post.media = media;
    if (visibility !== undefined) post.visibility = visibility;
    if (tags !== undefined) post.tags = tags;
    if (location !== undefined) post.location = location;
    if (feeling !== undefined) post.feeling = feeling;
    if (activity !== undefined) post.activity = activity;
    
    post.isEdited = true;
    post.updatedAt = new Date();

    res.json({
      success: true,
      post: enrichPost(post, userId),
      message: 'Post updated successfully'
    });
  } catch (error) {
    console.error('Error updating post:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update post',
      details: error.message 
    });
  }
});

// Delete post
router.delete('/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId } = req.body;

    if (!posts.has(postId)) {
      return res.status(404).json({ 
        success: false, 
        error: 'Post not found' 
      });
    }

    const post = posts.get(postId);

    // Check authorization
    if (post.userId !== userId) {
      return res.status(403).json({ 
        success: false, 
        error: 'Not authorized to delete this post' 
      });
    }

    // Delete associated comments and likes
    const postComments = Array.from(comments.values()).filter(c => c.postId === postId);
    postComments.forEach(comment => comments.delete(comment.id));
    
    const postLikes = Array.from(likes.values()).filter(l => l.targetType === 'post' && l.targetId === postId);
    postLikes.forEach(like => likes.delete(like.id));

    // Delete post
    posts.delete(postId);

    // Update user's post count
    const user = getUser(userId);
    if (user && user.posts_count !== undefined && user.posts_count > 0) {
      user.posts_count--;
    }

    res.json({
      success: true,
      message: 'Post deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete post',
      details: error.message 
    });
  }
});

// Pin/Unpin post
router.patch('/:postId/pin', async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId, isPinned } = req.body;

    if (!posts.has(postId)) {
      return res.status(404).json({ 
        success: false, 
        error: 'Post not found' 
      });
    }

    const post = posts.get(postId);

    if (post.userId !== userId) {
      return res.status(403).json({ 
        success: false, 
        error: 'Not authorized to pin this post' 
      });
    }

    post.isPinned = isPinned;
    post.updatedAt = new Date();

    res.json({
      success: true,
      post: enrichPost(post, userId),
      message: isPinned ? 'Post pinned successfully' : 'Post unpinned successfully'
    });
  } catch (error) {
    console.error('Error pinning post:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to pin post',
      details: error.message 
    });
  }
});

// ============= LIKE ENDPOINTS =============

// Like/Unlike a post or comment
router.post('/:targetType/:targetId/like', async (req, res) => {
  try {
    const { targetType, targetId } = req.params; // targetType: 'post' or 'comment'
    const { userId, reactionType = 'like' } = req.body;

    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'User ID is required' 
      });
    }

    // Check if target exists
    const targetMap = targetType === 'post' ? posts : comments;
    if (!targetMap.has(targetId)) {
      return res.status(404).json({ 
        success: false, 
        error: `${targetType} not found` 
      });
    }

    const target = targetMap.get(targetId);

    // Check if already liked
    const existingLikeKey = `${userId}-${targetType}-${targetId}`;
    let like = null;
    
    for (const [key, value] of likes.entries()) {
      if (value.userId === userId && value.targetType === targetType && value.targetId === targetId) {
        like = value;
        break;
      }
    }

    if (like) {
      // Update reaction type or remove like
      if (like.reactionType === reactionType) {
        // Remove like
        likes.delete(like.id);
        target.likes = target.likes.filter(id => id !== userId);
        target.likesCount = Math.max(0, target.likesCount - 1);
        
        return res.json({
          success: true,
          liked: false,
          likesCount: target.likesCount,
          message: 'Like removed'
        });
      } else {
        // Update reaction type
        like.reactionType = reactionType;
        
        return res.json({
          success: true,
          liked: true,
          reactionType,
          likesCount: target.likesCount,
          message: 'Reaction updated'
        });
      }
    } else {
      // Add new like
      like = new Like({
        userId,
        targetType,
        targetId,
        reactionType
      });
      
      likes.set(like.id, like);
      
      if (!target.likes.includes(userId)) {
        target.likes.push(userId);
        target.likesCount++;
      }

      res.json({
        success: true,
        liked: true,
        reactionType,
        likesCount: target.likesCount,
        message: 'Like added'
      });

      // Notify the post/comment owner (don't await — fire and forget)
      if (targetType === 'post' && target.userId && String(target.userId) !== String(userId)) {
        const liker = getUser(userId) || {};
        const likerName = liker.displayName || liker.username || 'Someone';
        const reactionEmoji = { like: '\uD83D\uDC4D', love: '\u2764\uFE0F', haha: '\uD83D\uDE02', wow: '\uD83D\uDE2E', sad: '\uD83D\uDE22', angry: '\uD83D\uDE20' }[reactionType] || '\uD83D\uDC4D';
        const snippet = target.content ? target.content.slice(0, 60) + (target.content.length > 60 ? '\u2026' : '') : 'your post';
        createNotification(
          String(target.userId),
          'post_like',
          `${likerName} liked your post`,
          `${reactionEmoji} "${snippet}"`,
          { likerId: userId, likerName, likerAvatar: liker.avatar || null, postId: targetId, reactionType }
        ).catch(err => console.error('Failed to create like notification:', err));
      }
    }
  } catch (error) {
    console.error('Error toggling like:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to toggle like',
      details: error.message 
    });
  }
});

// Get likes for a post or comment
router.get('/:targetType/:targetId/likes', async (req, res) => {
  try {
    const { targetType, targetId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    // Get all likes for target
    let targetLikes = Array.from(likes.values()).filter(
      like => like.targetType === targetType && like.targetId === targetId
    );

    // Sort by date
    targetLikes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Paginate
    const paginatedLikes = targetLikes.slice(skip, skip + limitNum);
    
    // Enrich with user data
    const enrichedLikes = paginatedLikes.map(like => {
      const user = getUser(like.userId);
      return {
        ...like.toJSON(),
        user: {
          id: user.id,
          username: user.username,
          displayName: user.displayName || user.name || user.username,
          avatar: user.avatar
        }
      };
    });

    res.json({
      success: true,
      likes: enrichedLikes,
      pagination: {
        page: parseInt(page),
        limit: limitNum,
        total: targetLikes.length,
        pages: Math.ceil(targetLikes.length / limitNum),
        hasMore: skip + limitNum < targetLikes.length
      }
    });
  } catch (error) {
    console.error('Error fetching likes:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch likes',
      details: error.message 
    });
  }
});

// ============= COMMENT ENDPOINTS =============

// Add comment to post
router.post('/:postId/comments', async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId, content, media, parentCommentId } = req.body;

    if (!userId || !content) {
      return res.status(400).json({ 
        success: false, 
        error: 'User ID and content are required' 
      });
    }

    if (!posts.has(postId)) {
      return res.status(404).json({ 
        success: false, 
        error: 'Post not found' 
      });
    }

    // Create comment
    const comment = new Comment({
      postId,
      userId,
      content,
      media,
      parentCommentId
    });

    comments.set(comment.id, comment);

    // Update post comment count
    const post = posts.get(postId);
    post.commentsCount++;
    if (!post.comments.includes(comment.id)) {
      post.comments.push(comment.id);
    }

    // If it's a reply, update parent comment
    if (parentCommentId && comments.has(parentCommentId)) {
      const parentComment = comments.get(parentCommentId);
      parentComment.repliesCount++;
      if (!parentComment.replies.includes(comment.id)) {
        parentComment.replies.push(comment.id);
      }
    }

    res.json({
      success: true,
      comment: enrichComment(comment, userId),
      message: 'Comment added successfully'
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to add comment',
      details: error.message 
    });
  }
});

// Get comments for a post
router.get('/:postId/comments', async (req, res) => {
  try {
    const { postId } = req.params;
    const { page = 1, limit = 20, userId } = req.query;

    if (!posts.has(postId)) {
      return res.status(404).json({ 
        success: false, 
        error: 'Post not found' 
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    // Get all top-level comments for post (no parent)
    let postComments = Array.from(comments.values()).filter(
      comment => comment.postId === postId && !comment.parentCommentId && !comment.isDeleted
    );

    // Sort by date
    postComments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Paginate
    const paginatedComments = postComments.slice(skip, skip + limitNum);
    
    // Enrich with user data and get replies
    const enrichedComments = paginatedComments.map(comment => {
      const enriched = enrichComment(comment, userId);
      
      // Get first few replies
      const replies = Array.from(comments.values())
        .filter(c => c.parentCommentId === comment.id && !c.isDeleted)
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
        .slice(0, 3)
        .map(reply => enrichComment(reply, userId));
      
      enriched.replies = replies;
      
      return enriched;
    });

    res.json({
      success: true,
      comments: enrichedComments,
      pagination: {
        page: parseInt(page),
        limit: limitNum,
        total: postComments.length,
        pages: Math.ceil(postComments.length / limitNum),
        hasMore: skip + limitNum < postComments.length
      }
    });
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch comments',
      details: error.message 
    });
  }
});

// Get replies for a comment
router.get('/comments/:commentId/replies', async (req, res) => {
  try {
    const { commentId } = req.params;
    const { page = 1, limit = 10, userId } = req.query;

    if (!comments.has(commentId)) {
      return res.status(404).json({ 
        success: false, 
        error: 'Comment not found' 
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    // Get all replies for comment
    let replies = Array.from(comments.values()).filter(
      comment => comment.parentCommentId === commentId && !comment.isDeleted
    );

    // Sort by date
    replies.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    // Paginate
    const paginatedReplies = replies.slice(skip, skip + limitNum);
    const enrichedReplies = paginatedReplies.map(reply => enrichComment(reply, userId));

    res.json({
      success: true,
      replies: enrichedReplies,
      pagination: {
        page: parseInt(page),
        limit: limitNum,
        total: replies.length,
        pages: Math.ceil(replies.length / limitNum),
        hasMore: skip + limitNum < replies.length
      }
    });
  } catch (error) {
    console.error('Error fetching replies:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch replies',
      details: error.message 
    });
  }
});

// Update comment
router.put('/comments/:commentId', async (req, res) => {
  try {
    const { commentId } = req.params;
    const { userId, content, media } = req.body;

    if (!comments.has(commentId)) {
      return res.status(404).json({ 
        success: false, 
        error: 'Comment not found' 
      });
    }

    const comment = comments.get(commentId);

    if (comment.userId !== userId) {
      return res.status(403).json({ 
        success: false, 
        error: 'Not authorized to update this comment' 
      });
    }

    if (content !== undefined) comment.content = content;
    if (media !== undefined) comment.media = media;
    comment.isEdited = true;
    comment.updatedAt = new Date();

    res.json({
      success: true,
      comment: enrichComment(comment, userId),
      message: 'Comment updated successfully'
    });
  } catch (error) {
    console.error('Error updating comment:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update comment',
      details: error.message 
    });
  }
});

// Delete comment
router.delete('/comments/:commentId', async (req, res) => {
  try {
    const { commentId } = req.params;
    const { userId } = req.body;

    if (!comments.has(commentId)) {
      return res.status(404).json({ 
        success: false, 
        error: 'Comment not found' 
      });
    }

    const comment = comments.get(commentId);

    if (comment.userId !== userId) {
      return res.status(403).json({ 
        success: false, 
        error: 'Not authorized to delete this comment' 
      });
    }

    // Soft delete
    comment.isDeleted = true;
    comment.content = '[Deleted]';
    comment.updatedAt = new Date();

    // Update post comment count
    if (posts.has(comment.postId)) {
      const post = posts.get(comment.postId);
      post.commentsCount = Math.max(0, post.commentsCount - 1);
    }

    // Update parent comment reply count
    if (comment.parentCommentId && comments.has(comment.parentCommentId)) {
      const parentComment = comments.get(comment.parentCommentId);
      parentComment.repliesCount = Math.max(0, parentComment.repliesCount - 1);
    }

    res.json({
      success: true,
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete comment',
      details: error.message 
    });
  }
});

// ============= SEARCH ENDPOINT =============

// Search posts
router.get('/search', async (req, res) => {
  try {
    const { q, page = 1, limit = 10, userId } = req.query;

    if (!q) {
      return res.status(400).json({ 
        success: false, 
        error: 'Search query is required' 
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    const searchQuery = q.toLowerCase();

    // Search in posts
    let searchResults = Array.from(posts.values()).filter(post => {
      return (
        post.content.toLowerCase().includes(searchQuery) ||
        post.tags.some(tag => tag.toLowerCase().includes(searchQuery)) ||
        post.location?.toLowerCase().includes(searchQuery)
      );
    });

    // Sort by relevance (simple: more matches = more relevant)
    searchResults.sort((a, b) => {
      const aMatches = (a.content.toLowerCase().match(new RegExp(searchQuery, 'g')) || []).length;
      const bMatches = (b.content.toLowerCase().match(new RegExp(searchQuery, 'g')) || []).length;
      return bMatches - aMatches;
    });

    // Paginate
    const paginatedResults = searchResults.slice(skip, skip + limitNum);
    const enrichedResults = paginatedResults.map(post => enrichPost(post, userId));

    res.json({
      success: true,
      posts: enrichedResults,
      query: q,
      pagination: {
        page: parseInt(page),
        limit: limitNum,
        total: searchResults.length,
        pages: Math.ceil(searchResults.length / limitNum),
        hasMore: skip + limitNum < searchResults.length
      }
    });
  } catch (error) {
    console.error('Error searching posts:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to search posts',
      details: error.message 
    });
  }
});

// ============= SEED/DEVELOPMENT ENDPOINT =============

// Seed database with sample posts (development only)
router.post('/seed', async (req, res) => {
  try {
    const { userId = '1', count = 10 } = req.body;

    const samplePosts = [
      {
        content: "Just launched my new project! 🚀 Check it out and let me know what you think.",
        type: 'text',
        visibility: 'public',
        tags: ['launch', 'project', 'excited'],
        feeling: 'excited'
      },
      {
        content: "Beautiful sunset at the beach today 🌅",
        type: 'text',
        visibility: 'public',
        tags: ['sunset', 'beach', 'nature'],
        feeling: 'blessed'
      },
      {
        content: "Working on some new features for the app. Can't wait to share them with you all! 💻",
        type: 'text',
        visibility: 'public',
        tags: ['coding', 'development', 'work'],
        activity: 'working'
      },
      {
        content: "Coffee and code - the perfect combination ☕️",
        type: 'text',
        visibility: 'public',
        tags: ['coffee', 'coding', 'lifestyle']
      },
      {
        content: "Just finished reading an amazing book! Highly recommend 'The Pragmatic Programmer' 📚",
        type: 'text',
        visibility: 'public',
        tags: ['books', 'reading', 'recommendations'],
        feeling: 'inspired'
      },
      {
        content: "Weekend vibes! Time to relax and recharge 😎",
        type: 'text',
        visibility: 'public',
        tags: ['weekend', 'relaxation', 'vibes'],
        feeling: 'relaxed'
      },
      {
        content: "Excited to announce that I'll be speaking at the tech conference next month! 🎤",
        type: 'text',
        visibility: 'public',
        tags: ['conference', 'speaking', 'tech'],
        feeling: 'excited'
      },
      {
        content: "Life is too short to not pursue your dreams. Keep pushing forward! 💪",
        type: 'text',
        visibility: 'public',
        tags: ['motivation', 'inspiration', 'dreams'],
        feeling: 'motivated'
      },
      {
        content: "Trying out a new recipe tonight. Wish me luck! 🍝",
        type: 'text',
        visibility: 'public',
        tags: ['cooking', 'food', 'recipe'],
        activity: 'cooking'
      },
      {
        content: "Grateful for all the support from this amazing community! Thank you all! 🙏",
        type: 'text',
        visibility: 'public',
        tags: ['grateful', 'community', 'thankyou'],
        feeling: 'grateful'
      },
      {
        content: "Just deployed a major update! 🎉 Let me know if you experience any issues.",
        type: 'text',
        visibility: 'public',
        tags: ['update', 'deployment', 'tech']
      },
      {
        content: "Morning workout done! Starting the day right 💪🏃‍♂️",
        type: 'text',
        visibility: 'public',
        tags: ['fitness', 'workout', 'morning'],
        activity: 'exercising'
      },
      {
        content: "The best time to start was yesterday. The next best time is now. ⏰",
        type: 'text',
        visibility: 'public',
        tags: ['motivation', 'quotes', 'inspiration']
      },
      {
        content: "Learning something new every day keeps the mind sharp! 🧠",
        type: 'text',
        visibility: 'public',
        tags: ['learning', 'growth', 'education'],
        feeling: 'curious'
      },
      {
        content: "Who else is excited for the weekend? 🎉",
        type: 'text',
        visibility: 'public',
        tags: ['weekend', 'excited', 'plans'],
        feeling: 'excited'
      }
    ];

    const createdPosts = [];
    const postsToCreate = Math.min(count, samplePosts.length);

    for (let i = 0; i < postsToCreate; i++) {
      const postData = {
        userId,
        ...samplePosts[i],
        // Vary the timestamps to make it more realistic
        createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) // Within last 7 days
      };

      const post = new Post(postData);
      posts.set(post.id, post);

      // Add some random likes
      const likeCount = Math.floor(Math.random() * 20);
      for (let j = 0; j < likeCount; j++) {
        const likeUserId = `user${Math.floor(Math.random() * 10) + 1}`;
        if (!post.likes.includes(likeUserId)) {
          post.likes.push(likeUserId);
          post.likesCount++;
        }
      }

      // Add some random comments
      const commentCount = Math.floor(Math.random() * 5);
      for (let j = 0; j < commentCount; j++) {
        const comment = new Comment({
          postId: post.id,
          userId: `user${Math.floor(Math.random() * 10) + 1}`,
          content: [
            'Great post!',
            'Thanks for sharing!',
            'This is awesome!',
            'Love this!',
            'Interesting perspective!',
            'Couldn\'t agree more!',
            'Well said!',
            'This made my day!'
          ][Math.floor(Math.random() * 8)]
        });
        comments.set(comment.id, comment);
        post.comments.push(comment.id);
        post.commentsCount++;
      }

      createdPosts.push(enrichPost(post, userId));
    }

    res.json({
      success: true,
      message: `Created ${createdPosts.length} sample posts`,
      posts: createdPosts,
      totalPosts: posts.size
    });
  } catch (error) {
    console.error('Error seeding posts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to seed posts',
      details: error.message
    });
  }
});

// Get stats (development only)
router.get('/stats', async (req, res) => {
  try {
    res.json({
      success: true,
      stats: {
        totalPosts: posts.size,
        totalComments: comments.size,
        totalLikes: likes.size
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get stats'
    });
  }
});

module.exports = router;
