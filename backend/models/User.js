const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
  id: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, default: '' },
  displayName: { type: String, default: '' },
  bio: { type: String, default: '' },
  phone: { type: String, default: '' },
  location: { type: String, default: '' },
  company: { type: String, default: '' },
  jobTitle: { type: String, default: '' },
  website: { type: String, default: '' },
  avatar: { type: String, default: null },
  avatarColor: { type: String, default: '#000000' },
  status: { type: String, default: 'online' },
  statusMessage: { type: String, default: '' },
  socialLinks: {
    twitter: { type: String, default: '' },
    linkedin: { type: String, default: '' },
    github: { type: String, default: '' },
    instagram: { type: String, default: '' },
    facebook: { type: String, default: '' },
    youtube: { type: String, default: '' },
    website: { type: String, default: '' }
  },
  theme: { type: String, default: 'light' },
  language: { type: String, default: 'en' },
  timezone: { type: String, default: 'UTC' },
  notifications: {
    email: { type: Boolean, default: true },
    push: { type: Boolean, default: true },
    desktop: { type: Boolean, default: true },
    sound: { type: Boolean, default: true },
    mentions: { type: Boolean, default: true },
    directMessages: { type: Boolean, default: true },
    groupMessages: { type: Boolean, default: true },
    marketing: { type: Boolean, default: false }
  },
  privacy: {
    profileVisibility: { type: String, default: 'public' },
    lastSeenVisibility: { type: String, default: 'everyone' },
    onlineStatusVisibility: { type: String, default: 'everyone' },
    phoneVisibility: { type: String, default: 'contacts' },
    emailVisibility: { type: String, default: 'contacts' },
    locationVisibility: { type: String, default: 'contacts' }
  },
  role: { type: String, default: 'user' },
  isOnline: { type: Boolean, default: false },
  lastActive: { type: Date, default: Date.now },
  twoFactorAuth: {
    enabled: { type: Boolean, default: false },
    secret: { type: String, default: null },
    method: { type: String, enum: ['totp', 'sms'], default: 'totp' },
    backupCodes: [{ 
      code: { type: String, required: true },
      used: { type: Boolean, default: false },
      createdAt: { type: Date, default: Date.now }
    }],
    lastUsed: { type: Date, default: null },
    setupAt: { type: Date, default: null }
  },
  userMedia: {
    photos: [{ 
      url: String, 
      name: String, 
      size: Number, 
      type: String, 
      uploadedAt: Date 
    }],
    videos: [{ 
      url: String, 
      name: String, 
      size: Number, 
      type: String, 
      duration: Number,
      thumbnail: String,
      uploadedAt: Date 
    }],
    gifs: [{ 
      url: String, 
      name: String, 
      size: Number, 
      type: String, 
      uploadedAt: Date 
    }]
  },
  viewHistory: [{ 
    contentId: String,
    contentType: String,
    name: String,
    url: String,
    timestamp: Date
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);