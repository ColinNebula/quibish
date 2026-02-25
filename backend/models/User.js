// User model (placeholder for in-memory storage)
// This is used with the in-memory storage system

class User {
  constructor(data) {
    this.id = data.id;
    this.username = data.username;
    this.email = data.email;
    this.password = data.password;
    this.name = data.name;
    this.displayName = data.displayName || data.name;
    this.avatar = data.avatar || null;
    this.status = data.status || 'offline';
    this.role = data.role || 'user';
    this.bio = data.bio || null;
    this.headline = data.headline || null;
    this.cover_photo = data.cover_photo || null;
    this.location = data.location || null;
    this.website = data.website || null;
    this.company = data.company || null;
    this.jobTitle = data.jobTitle || null;
    this.interests = data.interests || [];
    this.friends_count = data.friends_count || 0;
    this.posts_count = data.posts_count || 0;
    this.followers_count = data.followers_count || 0;
    this.following_count = data.following_count || 0;
    this.profile_views_count = data.profile_views_count || 0;
    this.is_verified = data.is_verified || false;
    this.badges = data.badges || [];
    this.account_type = data.account_type || 'personal';
    this.date_of_birth = data.date_of_birth || null;
    this.gender = data.gender || null;
    this.relationship_status = data.relationship_status || null;
    this.twoFactorAuth = data.twoFactorAuth || {
      enabled: false,
      secret: null,
      method: 'totp',
      backupCodes: [],
      lastUsed: null,
      setupAt: null
    };
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  toJSON() {
    const obj = { ...this };
    delete obj.password; // Don't include password in JSON
    return obj;
  }
}

module.exports = User;
