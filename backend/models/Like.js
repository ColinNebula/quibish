// Like model for in-memory storage
class Like {
  constructor(data) {
    this.id = data.id || Date.now() + Math.random().toString(36).substr(2, 9);
    this.userId = data.userId; // User who liked
    this.targetType = data.targetType; // 'post' or 'comment'
    this.targetId = data.targetId; // Post ID or Comment ID
    this.reactionType = data.reactionType || 'like'; // like, love, haha, wow, sad, angry
    this.createdAt = data.createdAt || new Date();
  }

  toJSON() {
    return { ...this };
  }
}

module.exports = Like;
