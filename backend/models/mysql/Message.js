const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/mysql');

// Message Model for MySQL
const MySQLMessage = sequelize.define('Message', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  conversationId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  messageType: {
    type: DataTypes.STRING(20),
    defaultValue: 'text',
    validate: {
      isIn: [['text', 'image', 'video', 'audio', 'file', 'gif']]
    }
  },
  attachments: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  reactions: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  mentions: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  replyTo: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'messages',
      key: 'id'
    }
  },
  edited: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  editedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  deleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  deletedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  readBy: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  deliveredTo: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {}
  }
}, {
  tableName: 'messages',
  indexes: [
    { fields: ['userId'] },
    { fields: ['conversationId'] },
    { fields: ['createdAt'] },
    { fields: ['messageType'] },
    { fields: ['deleted'] }
  ]
});

module.exports = MySQLMessage;