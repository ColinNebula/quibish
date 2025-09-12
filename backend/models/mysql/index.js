const { sequelize } = require('../../config/mysql');
const MySQLUser = require('./User');
const MySQLMessage = require('./Message');
const MySQLConversation = require('./Conversation');
const MySQLMedia = require('./Media');

// Define relationships
MySQLUser.hasMany(MySQLMessage, {
  foreignKey: 'userId',
  as: 'messages'
});

MySQLMessage.belongsTo(MySQLUser, {
  foreignKey: 'userId',
  as: 'user'
});

MySQLConversation.hasMany(MySQLMessage, {
  foreignKey: 'conversationId',
  as: 'messages'
});

MySQLMessage.belongsTo(MySQLConversation, {
  foreignKey: 'conversationId',
  as: 'conversation'
});

MySQLUser.hasMany(MySQLConversation, {
  foreignKey: 'createdBy',
  as: 'createdConversations'
});

MySQLConversation.belongsTo(MySQLUser, {
  foreignKey: 'createdBy',
  as: 'creator'
});

// Media relationships
MySQLUser.hasMany(MySQLMedia, {
  foreignKey: 'uploadedBy',
  as: 'uploadedMedia'
});

MySQLMedia.belongsTo(MySQLUser, {
  foreignKey: 'uploadedBy',
  as: 'uploader'
});

MySQLMessage.hasMany(MySQLMedia, {
  foreignKey: 'messageId',
  as: 'attachments'
});

MySQLMedia.belongsTo(MySQLMessage, {
  foreignKey: 'messageId',
  as: 'message'
});

// Self-referencing relationship for reply messages
MySQLMessage.hasMany(MySQLMessage, {
  foreignKey: 'replyTo',
  as: 'replies'
});

MySQLMessage.belongsTo(MySQLMessage, {
  foreignKey: 'replyTo',
  as: 'parentMessage'
});

// Export models and sequelize instance
module.exports = {
  sequelize,
  MySQLUser,
  MySQLMessage,
  MySQLConversation,
  MySQLMedia
};