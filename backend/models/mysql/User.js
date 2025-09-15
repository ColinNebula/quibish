const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/mysql');

// User Model for MySQL
const MySQLUser = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  displayName: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  bio: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  location: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  company: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  jobTitle: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  website: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  avatar: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  avatarColor: {
    type: DataTypes.STRING(7),
    defaultValue: '#000000'
  },
  status: {
    type: DataTypes.STRING(20),
    defaultValue: 'online'
  },
  statusMessage: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  socialLinks: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {}
  },
  theme: {
    type: DataTypes.STRING(20),
    defaultValue: 'light'
  },
  language: {
    type: DataTypes.STRING(10),
    defaultValue: 'en'
  },
  timezone: {
    type: DataTypes.STRING(50),
    defaultValue: 'UTC'
  },
  notifications: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {}
  },
  privacy: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {}
  },
  role: {
    type: DataTypes.STRING(20),
    defaultValue: 'user'
  },
  isOnline: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  lastActive: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  twoFactorAuth: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {}
  },
  userMedia: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {}
  },
  viewHistory: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  }
}, {
  tableName: 'users',
  indexes: [
    { fields: ['username'] },
    { fields: ['email'] },
    { fields: ['is_online'] },
    { fields: ['status'] }
  ]
});

module.exports = MySQLUser;