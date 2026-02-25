// Comment model for in-memory storage
class Comment {
  constructor(data) {
    this.id = data.id || Date.now() + Math.random().toString(36).substr(2, 9);
    this.postId = data.postId; // Parent post ID
    this.userId = data.userId; // Commenter ID
    this.parentCommentId = data.parentCommentId || null; // For nested replies
    this.content = data.content || '';
    this.media = data.media || null; // Optional media attachment {type, url}
    
    // Engagement
    this.likes = data.likes || [];
    this.likesCount = data.likesCount || 0;
    this.replies = data.replies || [];
    this.repliesCount = data.repliesCount || 0;
    
    // Status
    this.isEdited = data.isEdited || false;
    this.isDeleted = data.isDeleted || false;
    
    // Timestamps
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  toJSON() {
    return { ...this };
  }
}

module.exports = Comment;
