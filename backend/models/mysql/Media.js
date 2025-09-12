const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Media = sequelize.define('Media', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    filename: {
      type: DataTypes.STRING,
      allowNull: false
    },
    originalName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    mimeType: {
      type: DataTypes.STRING,
      allowNull: false
    },
    size: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    url: {
      type: DataTypes.STRING,
      allowNull: false
    },
    type: {
      type: DataTypes.ENUM('image', 'video', 'audio', 'document', 'other'),
      allowNull: false,
      defaultValue: 'other'
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    messageId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Messages',
        key: 'id'
      }
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {}
    },
    isPrivate: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    thumbnailUrl: {
      type: DataTypes.STRING,
      allowNull: true
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Duration in seconds for audio/video files'
    },
    resolution: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Resolution for images/videos (e.g., "1920x1080")'
    }
  }, {
    tableName: 'media',
    timestamps: true,
    indexes: [
      {
        fields: ['userId']
      },
      {
        fields: ['messageId']
      },
      {
        fields: ['type']
      },
      {
        fields: ['createdAt']
      }
    ]
  });

  Media.associate = (models) => {
    // Association with User
    Media.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });

    // Association with Message (optional)
    Media.belongsTo(models.Message, {
      foreignKey: 'messageId',
      as: 'message'
    });
  };

  return Media;
};