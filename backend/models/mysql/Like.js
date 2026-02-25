const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/mysql');

// Like Model for MySQL
const MySQLLike = sequelize.define('Like', {
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
  targetType: {
    type: DataTypes.STRING(20),
    allowNull: false,
    validate: {
      isIn: [['post', 'comment']]
    }
  },
  targetId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  reactionType: {
    type: DataTypes.STRING(20),
    defaultValue: 'like',
    validate: {
      isIn: [['like', 'love', 'haha', 'wow', 'sad', 'angry']]
    }
  }
}, {
  tableName: 'likes',
  timestamps: true,
  updatedAt: false,
  indexes: [
    { fields: ['userId'] },
    { fields: ['targetType', 'targetId'] },
    { unique: true, fields: ['userId', 'targetType', 'targetId'] }
  ]
});

module.exports = MySQLLike;
