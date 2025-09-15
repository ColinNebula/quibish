import React, { useState, useRef, useEffect, useCallback } from 'react';
import './Home.css';
import './TypingIndicator.css';
import './storageButton.css';
import { messageService, photoService, authService, translationService } from '../../services/apiClient';
import userDataService from '../../services/userDataService';
import enhancedWebSocketService from '../../services/enhancedWebSocketService';
import Profile from '../Profile';
import Settings from '../Settings';
import MediaPlayer from '../MediaPlayer';
import ConnectionMonitor from '../ConnectionMonitor/ConnectionMonitor';
import EnhancedConnectionMonitor from '../EnhancedConnectionMonitor';
import Storage from '../Storage';

const Home = ({ user, onLogout }) => {

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [photos, setPhotos] = useState([]);
  const [likedPhotos, setLikedPhotos] = useState(new Set());
  const [photoLikes, setPhotoLikes] = useState({});
  const [likeInProgress, setLikeInProgress] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showStorage, setShowStorage] = useState(false);
  const [userData, setUserData] = useState(user);
  const [isRecording, setIsRecording] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [isConnected, setIsConnected] = useState(enhancedWebSocketService.isConnected());
  const [connectionQuality, setConnectionQuality] = useState(enhancedWebSocketService.getConnectionQuality());
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [offlineMode, setOfflineMode] = useState(enhancedWebSocketService.isOfflineMode());
  const [pendingMessages, setPendingMessages] = useState([]);
  const [pollData, setPollData] = useState({ question: '', options: ['', ''], isOpen: false });
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(Date.now());
  const [replyingTo, setReplyingTo] = useState(null);
  const [appSettings, setAppSettings] = useState({
    theme: 'light',
    fontSize: 'medium',
    messageGrouping: true,
    autoPlayMedia: true,
    soundEffects: true,
    notifications: true,
    statusDisplay: true,
    alwaysShowTimestamps: false,
    messageTranslation: false
  });
  const [showConnectionDetails, setShowConnectionDetails] = useState(false);
  const [useEnhancedConnectionMonitor, setUseEnhancedConnectionMonitor] = useState(true);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const typingTimeoutRef = useRef(null);
  const inputRef = useRef(null);
  const searchInputRef = useRef(null);
  const lastSentTypingRef = useRef(Date.now());
  const emojiPickerRef = useRef(null);
  const connectionTimeoutRef = useRef(null);
  const reconnectIntervalRef = useRef(null);

  // Initialize WebSocket connection via the enhanced service
  useEffect(() => {
    // Set up WebSocket connection
    enhancedWebSocketService.initialize({
      url: messageService.getSocketUrl(),
      reconnectOptions: {
        maxAttempts: 10,
        initialDelay: 1000,
        maxDelay: 30000
      },
      heartbeatInterval: 30000,
      offlineSupport: true,
      debug: true
    });
    
    // Set up event listeners
    const connectionStateListener = enhancedWebSocketService.addConnectionStateListener(
      handleConnectionStateChange
    );
    
    const messageListener = enhancedWebSocketService.addMessageListener(
      handleIncomingMessage
    );

    // Load messages from local storage in case we're offline
    loadCachedMessages();
    
    // Clean up on component unmount
    return () => {
      connectionStateListener();
      messageListener();
    };
  }, []);
  
  // Handle connection state changes
  const handleConnectionStateChange = (connected, details) => {
    setIsConnected(connected);
    setConnectionQuality(details.quality);
    setReconnectAttempts(details.reconnectAttempts || 0);
    setOfflineMode(details.offlineMode);
    
    if (connected && details.wasReconnect) {
      // We just reconnected after being offline
      syncOfflineMessages();
    }
  };
  
  // Handle incoming messages from WebSocket
  const handleIncomingMessage = (message) => {
    if (message.type === 'typing') {
      handleTypingIndicator(message);
      return;
    }
    
    if (message.type === 'message' || message.type === 'media') {
      // Add the new message to our state
      setMessages(prev => [...prev, message]);
      // Store in local cache
      userDataService.cacheMessage(message);
      return;
    }
    
    // Handle other message types
    switch (message.type) {
      case 'poll':
        // Handle poll update
        break;
      case 'reaction':
        // Handle reaction to message
        handleReaction(message);
        break;
      default:
        console.log('Unhandled message type:', message.type);
    }
  };
  
  // Load cached messages from storage
  const loadCachedMessages = async () => {
    try {
      const cachedMessages = await userDataService.getCachedMessages();
      if (cachedMessages && cachedMessages.length > 0) {
        setMessages(cachedMessages);
      }
    } catch (error) {
      console.error('Failed to load cached messages:', error);
    }
  };
  
  // Sync offline messages when reconnecting
  const syncOfflineMessages = async () => {
    try {
      const pendingMsgs = await userDataService.getPendingMessages();
      
      if (pendingMsgs.length > 0) {
        console.log(`Syncing ${pendingMsgs.length} offline messages`);
        
        // Send each pending message
        for (const msg of pendingMsgs) {
          await enhancedWebSocketService.send(msg);
        }
        
        // Clear pending messages
        await userDataService.clearPendingMessages();
        setPendingMessages([]);
      }
      
      // Update last sync time
      setLastSyncTime(Date.now());
    } catch (error) {
      console.error('Failed to sync offline messages:', error);
    }
  };

  // Send a message
  const sendMessage = async () => {
    if (!input.trim()) return;
    
    const messageData = {
      id: `msg_${Date.now()}`,
      type: 'message',
      content: input.trim(),
      sender: userData.id || 'user',
      senderName: userData.name || 'You',
      timestamp: new Date().toISOString(),
      status: isConnected ? 'sent' : 'pending'
    };
    
    // Add reply data if replying
    if (replyingTo) {
      messageData.replyTo = {
        id: replyingTo.id,
        content: replyingTo.content,
        sender: replyingTo.sender
      };
      
      // Clear reply state
      setReplyingTo(null);
    }
    
    // Add to local state immediately
    setMessages(prev => [...prev, messageData]);
    
    // Clear input
    setInput('');
    
    // Try to send via WebSocket
    if (isConnected) {
      try {
        await enhancedWebSocketService.send(messageData);
        
        // Cache the sent message
        userDataService.cacheMessage(messageData);
      } catch (error) {
        console.error('Failed to send message:', error);
        
        // Store as pending message
        storeMessageOffline(messageData);
      }
    } else {
      // Store message for later sending
      storeMessageOffline(messageData);
    }
  };
  
  // Store message offline for later sending
  const storeMessageOffline = async (message) => {
    try {
      // Mark as pending
      const pendingMsg = {...message, status: 'pending'};
      
      // Store in userDataService
      await userDataService.storePendingMessage(pendingMsg);
      
      // Update local state
      setPendingMessages(prev => [...prev, pendingMsg]);
    } catch (error) {
      console.error('Failed to store message offline:', error);
    }
  };

  // Handle file upload through the enhanced service
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploading(true);
    
    try {
      // Process based on file type
      let fileData;
      let thumbnailUrl = null;
      
      if (file.type.startsWith('image/')) {
        fileData = await getImageDataUrl(file);
      } else if (file.type.startsWith('video/')) {
        fileData = await getVideoDataUrl(file);
        thumbnailUrl = await generateVideoThumbnail(file);
      } else {
        // For other file types
        fileData = {
          name: file.name,
          size: file.size,
          type: file.type
        };
      }
      
      // Store media in user data service
      const mediaId = `media_${Date.now()}`;
      await userDataService.storeMedia({
        id: mediaId,
        data: fileData,
        thumbnail: thumbnailUrl,
        name: file.name,
        type: file.type,
        size: file.size,
        timestamp: new Date().toISOString()
      });
      
      // Create message with media reference
      const messageData = {
        id: `msg_${Date.now()}`,
        type: 'media',
        mediaId: mediaId,
        mediaType: file.type.split('/')[0], // 'image', 'video', etc.
        fileName: file.name,
        fileSize: file.size,
        sender: userData.id || 'user',
        senderName: userData.name || 'You',
        timestamp: new Date().toISOString(),
        status: isConnected ? 'sent' : 'pending'
      };
      
      // Add to messages immediately
      setMessages(prev => [...prev, messageData]);
      
      // Try to send if connected
      if (isConnected) {
        await enhancedWebSocketService.send(messageData);
      } else {
        // Store for later sending
        storeMessageOffline(messageData);
      }
    } catch (error) {
      console.error('Error handling file upload:', error);
      setError('Failed to upload file. Please try again.');
    } finally {
      setUploading(false);
      e.target.value = ''; // Reset input
    }
  };

  // Get image data URL
  const getImageDataUrl = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
    });
  };

  // Get video data URL
  const getVideoDataUrl = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
    });
  };

  // Generate video thumbnail
  const generateVideoThumbnail = (videoFile) => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      video.onloadedmetadata = () => {
        video.currentTime = 1; // Seek to 1 second
      };
      
      video.oncanplay = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        try {
          const thumbnail = canvas.toDataURL('image/jpeg', 0.5);
          resolve(thumbnail);
        } catch (err) {
          reject(err);
        }
      };
      
      video.onerror = (err) => {
        reject(err);
      };
      
      video.src = URL.createObjectURL(videoFile);
    });
  };

  // Render connection status UI based on user preference
  const renderConnectionStatus = () => {
    if (useEnhancedConnectionMonitor) {
      return (
        <EnhancedConnectionMonitor 
          expanded={showConnectionDetails}
          onStatusChange={(connected, details) => {
            // This is redundant as we already handle this via the listener
            // but keeping it here for completeness
            setIsConnected(connected);
            setConnectionQuality(details.quality);
            setOfflineMode(details.offlineMode);
          }}
        />
      );
    } else {
      return (
        <ConnectionMonitor
          isConnected={isConnected}
          connectionQuality={connectionQuality}
          reconnectAttempts={reconnectAttempts}
          offlineMode={offlineMode}
          pendingMessages={pendingMessages.length}
          lastSyncTime={lastSyncTime}
          onReconnect={() => enhancedWebSocketService.reconnect()}
          onToggleOfflineMode={() => {
            const newMode = enhancedWebSocketService.setOfflineMode(!offlineMode);
            setOfflineMode(newMode);
          }}
        />
      );
    }
  };

  // Rest of your component methods and rendering logic...
  // (keeping other existing methods)

  return (
    <div className="home-container">
      {/* Connection status UI */}
      {appSettings.statusDisplay && renderConnectionStatus()}
      
      {/* Rest of your UI rendering */}
      {/* ... (existing UI code) */}
    </div>
  );
};

export default Home;
