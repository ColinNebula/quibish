import React, { useState, useEffect, useRef } from 'react';
import MessageBubble, { TypingIndicator, MessageGroup } from './MessageBubble';
import './MessageThread.css';

const MessageThread = ({ 
  messages = [], 
  currentUserId, 
  onSendMessage,
  onReaction,
  typingUsers = [],
  isLoading = false
}) => {
  const [newMessage, setNewMessage] = useState('');
  const [quotedMessage, setQuotedMessage] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Sample messages for demonstration
  const sampleMessages = [
    {
      id: '1',
      senderId: 'user1',
      sender: { name: 'Alice Johnson', avatar: 'https://ui-avatars.com/api/?name=Alice+Johnson&background=8b5cf6&color=fff' },
      type: 'text',
      text: 'Hey everyone! 👋 How\'s the project coming along?',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      status: 'read',
      reactions: [
        { emoji: '👋', count: 3, isCurrentUser: false },
        { emoji: '🔥', count: 1, isCurrentUser: true }
      ]
    },
    {
      id: '2',
      senderId: currentUserId,
      type: 'text',
      text: 'Going great! Just finished the new message UI components. Check out these cool features:',
      timestamp: new Date(Date.now() - 3300000).toISOString(),
      status: 'read'
    },
    {
      id: '3',
      senderId: currentUserId,
      type: 'text',
      text: '• Enhanced glassmorphism effects\n• Message reactions and status indicators\n• Improved typography and spacing\n• Link previews and file attachments',
      timestamp: new Date(Date.now() - 3200000).toISOString(),
      status: 'read',
      reactions: [
        { emoji: '🎉', count: 2, isCurrentUser: false },
        { emoji: '👏', count: 4, isCurrentUser: true }
      ]
    },
    {
      id: '4',
      senderId: 'user2',
      sender: { name: 'Bob Smith', avatar: 'https://ui-avatars.com/api/?name=Bob+Smith&background=f59e0b&color=fff' },
      type: 'text',
      text: 'Wow, this looks amazing! The new design is so much better.',
      timestamp: new Date(Date.now() - 3000000).toISOString(),
      status: 'delivered',
      quotedMessage: {
        sender: 'You',
        text: '• Enhanced glassmorphism effects...'
      }
    },
    {
      id: '5',
      senderId: 'user1',
      sender: { name: 'Alice Johnson', avatar: 'https://ui-avatars.com/api/?name=Alice+Johnson&background=8b5cf6&color=fff' },
      type: 'image',
      image: {
        url: 'https://picsum.photos/300/200?random=1',
        alt: 'Project screenshot'
      },
      text: 'Here\'s a screenshot of the new interface!',
      timestamp: new Date(Date.now() - 2800000).toISOString(),
      status: 'read'
    },
    {
      id: '6',
      senderId: currentUserId,
      type: 'text',
      text: 'Perfect! The new message grouping and status indicators are working beautifully 💫',
      timestamp: new Date(Date.now() - 2400000).toISOString(),
      status: 'read',
      linkPreview: {
        title: 'Quibish Chat App - Enhanced UI',
        description: 'Experience the next generation of chat interfaces with glassmorphism effects, smooth animations, and intuitive interactions.',
        url: 'https://quibish.app',
        image: 'https://picsum.photos/400/200?random=2'
      }
    },
    {
      id: '7',
      senderId: 'user3',
      sender: { name: 'Carol Davis', avatar: 'https://ui-avatars.com/api/?name=Carol+Davis&background=10b981&color=fff' },
      type: 'file',
      file: {
        name: 'ui-design-specs.pdf',
        size: '2.4 MB',
        url: '#'
      },
      text: 'I\'ve attached the complete design specifications document.',
      timestamp: new Date(Date.now() - 2000000).toISOString(),
      status: 'delivered'
    },
    {
      id: '8',
      senderId: 'user2',
      sender: { name: 'Bob Smith', avatar: 'https://ui-avatars.com/api/?name=Bob+Smith&background=f59e0b&color=fff' },
      type: 'text',
      text: 'Thanks Carol! 📄',
      timestamp: new Date(Date.now() - 1900000).toISOString(),
      status: 'read'
    },
    {
      id: '9',
      senderId: 'user2',
      sender: { name: 'Bob Smith', avatar: 'https://ui-avatars.com/api/?name=Bob+Smith&background=f59e0b&color=fff' },
      type: 'text',
      text: 'The animations and micro-interactions feel so smooth now.',
      timestamp: new Date(Date.now() - 1800000).toISOString(),
      status: 'read'
    },
    {
      id: '10',
      senderId: currentUserId,
      type: 'text',
      text: 'Absolutely! The seasonal themes and particle effects add such a nice touch ✨',
      timestamp: new Date(Date.now() - 600000).toISOString(),
      status: 'delivered',
      reactions: [
        { emoji: '✨', count: 5, isCurrentUser: false },
        { emoji: '😍', count: 2, isCurrentUser: true }
      ]
    }
  ];

  const allMessages = messages.length > 0 ? messages : sampleMessages;

  useEffect(() => {
    scrollToBottom();
  }, [allMessages, typingUsers]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const message = {
      id: Date.now().toString(),
      senderId: currentUserId,
      type: 'text',
      text: newMessage,
      timestamp: new Date().toISOString(),
      status: 'sending',
      quotedMessage: quotedMessage
    };

    if (onSendMessage) {
      onSendMessage(message);
    }

    setNewMessage('');
    setQuotedMessage(null);
    inputRef.current?.focus();
  };

  const handleReaction = (messageId, emoji) => {
    if (onReaction) {
      onReaction(messageId, emoji);
    }
  };

  const handleQuoteMessage = (message) => {
    setQuotedMessage({
      sender: message.senderId === currentUserId ? 'You' : message.sender?.name,
      text: message.text?.substring(0, 100) + (message.text?.length > 100 ? '...' : '')
    });
    inputRef.current?.focus();
  };

  const handleImageClick = (image) => {
    // Open image in lightbox/modal
    console.log('Opening image:', image);
  };

  const emojiList = ['😀', '😂', '😍', '🤔', '👍', '👎', '❤️', '🔥', '🎉', '✨'];

  return (
    <div className="message-thread">
      <div className="messages-container">
        {isLoading ? (
          <div className="loading-messages">
            <div className="message-skeleton"></div>
            <div className="message-skeleton"></div>
            <div className="message-skeleton"></div>
          </div>
        ) : (
          <MessageGroup
            messages={allMessages}
            currentUserId={currentUserId}
            onReaction={handleReaction}
            onQuote={handleQuoteMessage}
            onImageClick={handleImageClick}
          />
        )}

        {/* Typing indicator */}
        <TypingIndicator users={typingUsers} visible={typingUsers.length > 0} />

        <div ref={messagesEndRef} />
      </div>

      {/* Message input */}
      <div className="message-input-container">
        {quotedMessage && (
          <div className="quoted-message-preview">
            <div className="quote-line"></div>
            <div className="quote-content">
              <div className="quote-sender">{quotedMessage.sender}</div>
              <div className="quote-text">{quotedMessage.text}</div>
            </div>
            <button 
              className="remove-quote"
              onClick={() => setQuotedMessage(null)}
            >
              ×
            </button>
          </div>
        )}

        <form onSubmit={handleSendMessage} className="message-input-form">
          <div className="input-wrapper">
            <button 
              type="button"
              className="emoji-button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            >
              😀
            </button>

            <input
              ref={inputRef}
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="message-input"
            />

            <button 
              type="submit"
              className="send-button"
              disabled={!newMessage.trim()}
            >
              <span className="send-icon">→</span>
            </button>
          </div>

          {showEmojiPicker && (
            <div className="emoji-picker">
              {emojiList.map((emoji, index) => (
                <button
                  key={index}
                  type="button"
                  className="emoji-option"
                  onClick={() => {
                    setNewMessage(prev => prev + emoji);
                    setShowEmojiPicker(false);
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default MessageThread;