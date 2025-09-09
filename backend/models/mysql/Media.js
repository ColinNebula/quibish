const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/mysql');

// Media/Attachment Model for MySQL
const MySQLMedia = sequelize.define('Media', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  filename: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  originalName: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  mimeType: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  size: {
    type: DataTypes.BIGINT,
    allowNull: false
  },
  path: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  url: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  uploadedBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  messageId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'messages',
      key: 'id'
    }
  },
  isAvatar: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  mediaType: {
    type: DataTypes.STRING(20),
    allowNull: false,
    validate: {
      isIn: [['image', 'video', 'audio', 'document', 'other']]
    }
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {}
  },
  thumbnailPath: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  thumbnailUrl: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  processed: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  deleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  deletedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'media',
  indexes: [
    { fields: ['uploaded_by'] },
    { fields: ['message_id'] },
    { fields: ['media_type'] },
    { fields: ['is_avatar'] },
    { fields: ['deleted'] },
    { fields: ['created_at'] }
  ]
});

module.exports = MySQLMedia;