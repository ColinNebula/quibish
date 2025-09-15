const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/mysql');

// Conversation Model for MySQL
const MySQLConversation = sequelize.define('Conversation', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  type: {
    type: DataTypes.STRING(20),
    defaultValue: 'direct',
    validate: {
      isIn: [['direct', 'group', 'channel']]
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  avatar: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  participants: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: []
  },
  admins: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  settings: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {}
  },
  lastMessageId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'messages',
      key: 'id'
    }
  },
  lastMessageAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {}
  }
}, {
  tableName: 'conversations',
  indexes: [
    { fields: ['type'] },
    { fields: ['createdBy'] },
    { fields: ['lastMessageAt'] },
    { fields: ['isActive'] }
  ]
});

module.exports = MySQLConversation;