// EnhancedHomeRender.js - Modern UI rendering for Home component
// This is a template for updating your Home component's render function

// Import at the top of your Home component
import './EnhancedHome.css';
import { IoSend, IoImage, IoMic, IoAttach, IoEllipsisHorizontal } from 'react-icons/io5';
import { MdEmojiEmotions, MdOutlineSchedule } from 'react-icons/md';

// Replace your render function with this enhanced version
// Make sure to adapt it to your existing state variables and methods

// Inside your Home component:
return (
  <div className="enhanced-app-container">
    {/* Enhanced Header */}
    <header className="enhanced-header">
      <div className="enhanced-title">
        Quibish
      </div>
      
      <div className="enhanced-connection-status 
        ${offlineMode ? 'offline' : 
          isConnected ? 
            connectionQuality === 'good' ? 'connected' : 
            connectionQuality === 'poor' ? 'poor-connection' : 'critical-connection'
          : 'disconnected'
        }"
        onClick={offlineMode ? toggleOfflineMode : isConnected ? null : manualReconnect}
        title={
          offlineMode ? 'Offline Mode - Click to try reconnecting' : 
          isConnected ? 
            connectionQuality === 'good' ? 'Strong Connection' : 
            connectionQuality === 'poor' ? 'Poor Connection' : 'Unstable Connection'
          : reconnectAttempts > 0 ? `Reconnecting (Attempt ${reconnectAttempts})` : 'Disconnected'
        }
      >
        <span className={`enhanced-connection-indicator 
          ${offlineMode ? 'offline' : 
            isConnected ? 
              connectionQuality === 'good' ? 'connected' : 
              connectionQuality === 'poor' ? 'poor-connection' : 'critical-connection'
            : 'disconnected'
          }`}></span>
        <span className="enhanced-connection-text">
          {offlineMode ? 'Offline Mode' : 
           isConnected ? 
            connectionQuality === 'good' ? 'Connected' : 
            connectionQuality === 'poor' ? 'Poor Connection' : 'Unstable'
           : reconnectAttempts > 0 ? `Reconnecting...` : 'Disconnected'
          }
          {pendingMessages.length > 0 && ` (${pendingMessages.length})`}
        </span>
      </div>
      
      <div className="enhanced-user-info">
        <div className="enhanced-user-profile" onClick={() => setShowProfile(true)}>
          {userData?.avatar ? (
            <img src={userData.avatar} alt="Avatar" className="enhanced-user-avatar" />
          ) : (
            <div className="enhanced-avatar-placeholder">
              {userData?.username?.substring(0, 1).toUpperCase() || 'G'}
            </div>
          )}
          <span className="enhanced-welcome-message">
            {userData?.displayName || userData?.username || 'Guest'}
          </span>
        </div>
        
        <div className="enhanced-header-actions">
          <button className="enhanced-action-button" onClick={() => setShowStorage(true)} title="My Storage">
            📁
          </button>
          <button className="enhanced-action-button" onClick={() => setShowSettings(true)} title="Settings">
            ⚙️
          </button>
          <button className="enhanced-logout-button" onClick={onLogout}>Logout</button>
        </div>
      </div>
    </header>

    {/* Enhanced Connection Monitor */}
    {appSettings.statusDisplay && 
      <EnhancedConnectionMonitor
        expanded={showConnectionDetails}
        onStatusChange={(connected, details) => {
          setIsConnected(connected);
          setConnectionQuality(details.quality);
          setOfflineMode(details.offlineMode);
        }}
      />
    }

    {/* Status Updates Bar - Keep your existing code or enhance it */}
    <div className="status-updates-bar">
      {/* Your existing status updates code */}
    </div>

    {/* Enhanced Messages Container */}
    <div className="enhanced-messages-container">
      {/* Error message if something goes wrong */}
      {error && (
        <div className="error-message">
          <span>{error}</span>
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}
      
      {/* Show loading state */}
      {loading && (
        <div className="loading-messages">
          <div className="loading-indicator"></div>
          <span>Loading messages...</span>
        </div>
      )}
      
      {/* No messages state */}
      {!loading && !error && groupedMessages.length === 0 && (
        <div className="no-messages">
          <span>No messages to display. Start a conversation!</span>
        </div>
      )}
      
      {/* Typing indicators */}
      {typingUsers.length > 0 && (
        <div className="typing-indicator">
          <div className="typing-animation">
            <span className="typing-dot"></span>
            <span className="typing-dot"></span>
            <span className="typing-dot"></span>
          </div>
          <div className="typing-text">
            {typingUsers.length === 1 ? (
              <span>{typingUsers[0]} is typing...</span>
            ) : (
              <span>{typingUsers.join(', ')} are typing...</span>
            )}
            {/* Keep your typing timer component */}
          </div>
        </div>
      )}
      
      {/* Message Groups */}
      {!loading && groupedMessages.filter(Boolean).map(group => (
        <div 
          key={group.id} 
          className={`enhanced-message-group ${group.sender === (userData?.username || 'me') ? 'own-messages' : ''}`}
        >
          <div className="enhanced-message-group-header">
            <span className="enhanced-message-sender">{group.sender}</span>
            {/* Optionally show timestamp for the group */}
            {group.messages[0]?.timestamp && (
              <span className="enhanced-message-timestamp">
                {new Date(group.messages[0].timestamp).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </span>
            )}
          </div>
          
          <div className="enhanced-message-group-content">
            {group.messages.map(msg => (
              <div 
                key={msg.id} 
                data-message-id={msg.id}
                className={`enhanced-message ${msg.type}-message ${group.sender === (userData?.username || 'me') ? 'me' : ''}`}
              >
                {/* Reply preview if this message is replying to another */}
                {msg.replyTo && (
                  <div className="enhanced-reply-preview">
                    <div className="enhanced-reply-sender">{msg.replyTo.sender}</div>
                    <div className="enhanced-reply-text">
                      {msg.replyTo.type === 'text' && msg.replyTo.text}
                      {msg.replyTo.type === 'photo' && '📷 Photo'}
                      {msg.replyTo.type === 'voice' && '🎤 Voice message'}
                      {msg.replyTo.type === 'file' && `📎 ${msg.replyTo.fileName || 'File'}`}
                    </div>
                  </div>
                )}
              
                {/* Different message types */}
                {msg.type === 'text' && (
                  <div className="enhanced-message-content">
                    <span className="enhanced-message-text">
                      {searchTerm && searchResults.includes(msg.id)
                        ? highlightSearchTerm(msg.text, searchTerm)
                        : msg.text}
                    </span>
                  </div>
                )}
                
                {/* Keep your existing media rendering code for photos, videos, etc. */}
                
                {/* Message reactions */}
                {msg.reactions && msg.reactions.length > 0 && (
                  <div className="enhanced-message-reactions">
                    {/* Group identical reactions and show count */}
                    {Object.entries(
                      msg.reactions.reduce((acc, r) => {
                        acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                        return acc;
                      }, {})
                    ).map(([emoji, count]) => (
                      <div 
                        key={emoji} 
                        className={`enhanced-reaction reaction-${emoji.codePointAt(0).toString(16)}`}
                        onClick={() => toggleReaction(msg.id, emoji)}
                        title={`${count} ${count === 1 ? 'reaction' : 'reactions'}`}
                      >
                        <span className="reaction-emoji">{emoji}</span>
                        {count > 1 && <span className="reaction-count">{count}</span>}
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Enhanced message actions */}
                <div className="enhanced-message-actions">
                  <button onClick={() => toggleReaction(msg.id, '👍')} className="enhanced-reaction-btn">👍</button>
                  <button onClick={() => toggleReaction(msg.id, '❤️')} className="enhanced-reaction-btn">❤️</button>
                  <button onClick={() => toggleReaction(msg.id, '😂')} className="enhanced-reaction-btn">😂</button>
                  <button onClick={() => replyToMessage(msg)} className="enhanced-action-btn">↩️</button>
                  <button onClick={() => forwardMessage(msg)} className="enhanced-action-btn">↪️</button>
                  <button 
                    className="enhanced-action-btn"
                    onClick={() => {
                      // Show dropdown with more options
                      // You can implement your own dropdown logic here
                    }}
                  >
                    •••
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
    
    {/* Enhanced Message Input */}
    <div className="enhanced-input-container">
      {/* Reply Bar */}
      {replyingTo && (
        <div className="enhanced-reply-bar">
          <div className="enhanced-reply-info">
            <div className="enhanced-reply-header">
              <span className="enhanced-reply-to-label">Replying to </span>
              <span className="enhanced-reply-sender">{replyingTo.sender}</span>
            </div>
            <div className="enhanced-reply-content">
              {replyingTo.type === 'text' && replyingTo.text}
              {replyingTo.type === 'photo' && '📷 Photo'}
              {replyingTo.type === 'voice' && '🎤 Voice message'}
              {replyingTo.type === 'file' && `📎 ${replyingTo.fileName || 'File'}`}
            </div>
          </div>
          <button className="enhanced-cancel-reply" onClick={cancelReply}>✖</button>
        </div>
      )}
      
      {/* Voice Recording UI */}
      {isRecording && (
        <div className="enhanced-recording-bar">
          <div className="enhanced-recording-indicator">
            <span className="enhanced-recording-pulse"></span>
            Recording...
          </div>
          <div className="enhanced-recording-actions">
            <button className="enhanced-record-button enhanced-cancel-recording" onClick={cancelRecording}>
              Cancel
            </button>
            <button className="enhanced-record-button enhanced-stop-recording" onClick={stopRecording}>
              Send Voice Message
            </button>
          </div>
        </div>
      )}
      
      {/* Input Row */}
      <div className="enhanced-input-row">
        {/* Additional buttons on the left if needed */}
        {!isRecording && (
          <button 
            className="enhanced-action-icon-button"
            onMouseDown={startRecording}
            disabled={loading || uploading}
            title="Hold to record voice message"
          >
            <IoMic />
          </button>
        )}
        
        <div className="enhanced-input-wrapper">
          <input
            type="text"
            placeholder={isRecording ? "Recording..." : "Type a message..."}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            ref={inputRef}
            className="enhanced-message-input"
            disabled={isRecording}
          />
        </div>
        
        <div className="enhanced-input-actions">
          <button 
            onClick={() => setShowEmojiPicker(!showEmojiPicker)} 
            className="enhanced-action-icon-button"
            disabled={loading || uploading || isRecording}
            title="Add emoji"
          >
            <MdEmojiEmotions />
          </button>
          
          <button 
            onClick={() => fileInputRef.current.click()} 
            className="enhanced-action-icon-button"
            disabled={loading || uploading || isRecording}
            title="Attach file"
          >
            <IoAttach />
          </button>
          
          <button 
            onClick={() => {
              // Check if we're on a mobile device
              const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
              
              if (isMobile) {
                // On mobile, show camera/gallery options
                setShowMediaOptions(true);
              } else {
                // On desktop, just open file picker
                fileInputRef.current.accept = "image/*,video/*";
                fileInputRef.current.click();
              }
            }} 
            className="enhanced-action-icon-button"
            disabled={loading || uploading || isRecording}
            title="Send a photo or video"
          >
            <IoImage />
          </button>
          
          {input.trim() !== '' && (
            <button 
              onClick={() => setShowScheduler(true)} 
              className="enhanced-action-icon-button"
              disabled={loading || uploading || isRecording}
              title="Schedule message"
            >
              <MdOutlineSchedule />
            </button>
          )}
          
          <button 
            onClick={sendMessage} 
            className="enhanced-send-button"
            disabled={loading || uploading || isRecording || input.trim() === ''}
            title="Send message"
          >
            <IoSend />
          </button>
        </div>
      </div>
    </div>
    
    {/* File inputs - keep hidden */}
    <input
      type="file"
      accept="*/*"
      multiple
      style={{ display: 'none' }}
      ref={fileInputRef}
      onChange={handleFileUpload}
    />
    
    <input
      type="file"
      accept="image/*,video/*"
      capture="user"
      style={{ display: 'none' }}
      id="cameraInput"
      onChange={handleFileUpload}
    />
    
    <input
      type="file"
      accept="image/*,video/*"
      multiple
      style={{ display: 'none' }}
      id="galleryInput"
      onChange={handleFileUpload}
    />
    
    {/* Keep your existing modals (Profile, Settings, etc) */}
    {showProfile && (
      <div className="modal-overlay">
        <Profile 
          user={userData} 
          onClose={() => setShowProfile(false)}
          onUpdate={(updatedUser) => {
            setUserData(updatedUser);
            setShowProfile(false);
          }}
        />
      </div>
    )}
    
    {/* Other modals - keep your existing code */}
  </div>
);
