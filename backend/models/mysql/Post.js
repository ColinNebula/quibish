const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/mysql');

// Post Model for MySQL
const MySQLPost = sequelize.define('Post', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  content: {
    type: DataTypes.TEXT('long'),
    allowNull: true
  },
  type: {
    type: DataTypes.STRING(20),
    defaultValue: 'text',
    validate: {
      isIn: [['text', 'image', 'video', 'link', 'shared']]
    }
  },
  media: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  visibility: {
    type: DataTypes.STRING(20),
    defaultValue: 'public',
    validate: {
      isIn: [['public', 'friends', 'private']]
    }
  },
  likesCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  commentsCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  sharesCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  views: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  tags: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  mentions: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  location: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  feeling: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  activity: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  sharedPostId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'posts',
      key: 'id'
    }
  },
  link: {
    type: DataTypes.JSON,
    allowNull: true
  },
  engagementScore: {
    type: DataTypes.FLOAT,
    defaultValue: 0
  },
  isEdited: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  isPinned: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  isArchived: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'posts',
  timestamps: true,
  indexes: [
    { fields: ['userId'] },
    { fields: ['createdAt'] },
    { fields: ['visibility'] },
    { fields: ['engagementScore'] }
  ]
});

// Associations will be set up in the index file
module.exports = MySQLPost;
