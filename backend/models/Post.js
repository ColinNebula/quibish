// Post model for in-memory storage
class Post {
  constructor(data) {
    this.id = data.id || Date.now() + Math.random().toString(36).substr(2, 9);
    this.userId = data.userId; // Author ID
    this.content = data.content || '';
    this.type = data.type || 'text'; // text, image, video, link, shared
    this.media = data.media || []; // Array of media objects {type, url, thumbnail}
    this.visibility = data.visibility || 'public'; // public, friends, private
    this.likes = data.likes || [];
    this.likesCount = data.likesCount || 0;
    this.comments = data.comments || [];
    this.commentsCount = data.commentsCount || 0;
    this.shares = data.shares || [];
    this.sharesCount = data.sharesCount || 0;
    this.views = data.views || 0;
    this.tags = data.tags || []; // Array of hashtags
    this.mentions = data.mentions || []; // Array of mentioned user IDs
    this.location = data.location || null;
    this.feeling = data.feeling || null; // e.g., "happy", "excited"
    this.activity = data.activity || null; // e.g., "watching", "eating"
    
    // For shared posts
    this.sharedPostId = data.sharedPostId || null;
    this.sharedPost = data.sharedPost || null;
    
    // For link posts
    this.link = data.link || null; // {url, title, description, image}
    
    // Engagement metrics
    this.engagementScore = data.engagementScore || 0;
    
    // Status
    this.isEdited = data.isEdited || false;
    this.isPinned = data.isPinned || false;
    this.isArchived = data.isArchived || false;
    
    // Timestamps
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  toJSON() {
    return { ...this };
  }

  // Calculate engagement score
  calculateEngagementScore() {
    this.engagementScore = (this.likesCount * 1) + 
                          (this.commentsCount * 2) + 
                          (this.sharesCount * 3) + 
                          (this.views * 0.1);
    return this.engagementScore;
  }
}

module.exports = Post;
