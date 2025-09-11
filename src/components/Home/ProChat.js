import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import UserProfileModal from '../UserProfile/UserProfileModal';
import SettingsModal from './SettingsModal';
import VideoCall from './VideoCall';
import GifPicker from '../GifPicker/GifPicker';
import NewChatModal from '../NewChat/NewChatModal';
import FeedbackModal from './FeedbackModal';
import HelpModal from './HelpModal';
import SmartTextContent from './SmartTextContent';
import MessageActions from './MessageActions';
import NativeCamera from '../NativeFeatures/NativeCamera';
import NativeContactPicker from '../NativeFeatures/NativeContactPicker';
import ContactManager from '../Contacts/ContactManager';
import messageService from '../../services/messageService';
import encryptedMessageService from '../../services/encryptedMessageService';
import enhancedVoiceCallService from '../../services/enhancedVoiceCallService';
import globalVoiceCallService from '../../services/globalVoiceCallService';
import GlobalUsers from '../Voice/GlobalUsers';
import connectionService from '../../services/connectionService';
import nativeDeviceFeaturesService from '../../services/nativeDeviceFeaturesService';
import { feedbackService } from '../../services/feedbackService';
import { contactService } from '../../services/contactService';
import PropTypes from 'prop-types';

// CSS imports
import './ProLayout.css';
import './ProMessages.css';
import '../../styles/DynamicBackground.css';
import './ProSidebar.css';
import './ProHeader.css';
import './ProChat.css';
import './ResponsiveFix.css';
import './EncryptionStyles.css';

const ProChat = ({ 
  user = { id: 'user1', name: 'Current User', avatar: null },
  conversations = [],
  currentConversation = null,
  onLogout = () => {},
  darkMode = false,
  onToggleDarkMode = () => {}
}) => {
  // Basic state
  const [isConnected] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState(conversations[0]?.id || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  
  // Enhanced input state
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [lightboxModal, setLightboxModal] = useState({ 
    open: false, 
    imageUrl: null, 
    imageName: null,
    zoom: 1,
    pan: { x: 0, y: 0 },
    isDragging: false,
    currentIndex: 0,
    images: [],
    isLoading: false
  });
  
  // Video lightbox state
  const [videoLightboxModal, setVideoLightboxModal] = useState({
    open: false,
    videoUrl: null,
    videoName: null,
    poster: null,
    type: null
  });

  // GIF picker state
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // Native features state
  const [showNativeCamera, setShowNativeCamera] = useState(false);
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [nativeCameraMode, setNativeCameraMode] = useState('photo'); // 'photo' or 'video'

  // Contact manager state
  const [showContactManager, setShowContactManager] = useState(false);

  // Encryption state
  const [encryptionEnabled, setEncryptionEnabled] = useState(false);
  const [encryptionStatus, setEncryptionStatus] = useState({ enabled: false });
  const [defaultEncryption, setDefaultEncryption] = useState(true);

  // Upload progress state
  // eslint-disable-next-line no-unused-vars
  const [uploadProgress, setUploadProgress] = useState({
    isUploading: false,
    fileName: '',
    progress: 0,
    fileSize: 0,
    uploadedSize: 0
  });
  
  // Refs
  const fileInputRef = useRef(null);
  const mobileCameraPhotoRef = useRef(null);
  const mobileCameraVideoRef = useRef(null);
  const mobileGalleryRef = useRef(null);
  const recordingTimerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  // Chat messages state - loaded from database
  const [chatMessages, setChatMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [messagesError, setMessagesError] = useState(null);
  
  // Reaction system state - moved here to be available for functions
  const [selectedMessageId, setSelectedMessageId] = useState(null);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  
  // Computed value for current conversation based on selectedConversation
  const currentSelectedConversation = selectedConversation 
    ? conversations.find(conv => conv.id === selectedConversation) || null
    : null;
  
  // Load messages from database on component mount
  useEffect(() => {
    const loadMessages = async () => {
      try {
        setMessagesLoading(true);
        setMessagesError(null);
        
        // Initialize encryption service first
        try {
          const encryptionInit = await encryptedMessageService.initializeEncryption(user.id);
          setEncryptionEnabled(encryptionInit);
          
          if (encryptionInit) {
            const status = encryptedMessageService.getEncryptionStatus();
            setEncryptionStatus(status);
            console.log('🔒 Encryption initialized for ProChat');
          }
        } catch (encryptError) {
          console.warn('⚠️ Encryption initialization failed:', encryptError);
          setEncryptionEnabled(false);
        }
        
        // Load messages using encrypted service
        const messages = await encryptedMessageService.getMessages({ limit: 50 });
        
        if (Array.isArray(messages)) {
          setChatMessages(messages);
        } else {
          console.warn('Invalid messages format received:', messages);
          setChatMessages([]);
        }
      } catch (error) {
        console.error('Failed to load messages:', error);
        setMessagesError('Failed to load messages');
        
        // Try to load from localStorage as fallback
        try {
          const cachedMessages = messageService.loadMessagesFromStorage();
          if (Array.isArray(cachedMessages) && cachedMessages.length > 0) {
            setChatMessages(cachedMessages);
            console.log('Loaded messages from local storage');
          }
        } catch (storageError) {
          console.error('Failed to load from storage:', storageError);
        }
      } finally {
        setMessagesLoading(false);
      }
    };

    loadMessages();
  }, [user.id]);

  // Auto-scroll to bottom function
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: 'smooth',
        block: 'end'
      });
    }
  }, []);

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, scrollToBottom]);

  // Initialize connection monitoring
  useEffect(() => {
    const updateConnectionStatus = () => {
      setConnectionStatus(connectionService.getConnectionStatus());
    };

    // Initial status
    updateConnectionStatus();

    // Update every 10 seconds
    const interval = setInterval(updateConnectionStatus, 10000);

    return () => clearInterval(interval);
  }, []);

  // Auto-collapse sidebar on mobile screens (but preserve content)
  useEffect(() => {
    const handleResize = () => {
      // Only auto-collapse on very small screens (like phone portrait)
      if (window.innerWidth <= 480) {
        setSidebarCollapsed(true);
      } else if (window.innerWidth > 768) {
        // Auto-expand on larger screens
        setSidebarCollapsed(false);
      }
      // For tablets (481-768px), maintain current state
    };

    // Set initial state
    handleResize();
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Manage body scroll lock when emoji picker is open on mobile
  useEffect(() => {
    const isMobile = window.innerWidth <= 480;
    if (isMobile) {
      if (showEmojiPicker || showReactionPicker) {
        // Add class to body to prevent scrolling
        document.body.classList.add('emoji-picker-open');
        // Store original overflow style
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        
        return () => {
          // Cleanup: restore original overflow and remove class
          document.body.classList.remove('emoji-picker-open');
          document.body.style.overflow = originalOverflow;
        };
      }
    }
  }, [showEmojiPicker, showReactionPicker]);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => !prev);
  }, []);

  // Close sidebar when clicking outside on mobile
  const handleOverlayClick = useCallback(() => {
    if (window.innerWidth <= 480) {
      setSidebarCollapsed(true);
    }
  }, []);

  const handleConversationSelect = useCallback(async (conversationId) => {
    setSelectedConversation(conversationId);
    
    // Load messages for the selected conversation
    try {
      setMessagesLoading(true);
      setMessagesError(null);
      
      console.log('Loading messages for conversation:', conversationId);
      
      // Load messages from the message service for this conversation
      const conversationMessages = await messageService.getMessages({ 
        conversationId: conversationId,
        limit: 50 
      });
      
      if (Array.isArray(conversationMessages)) {
        setChatMessages(conversationMessages);
        console.log('Loaded conversation messages:', conversationMessages.length);
        
        // Scroll to bottom after loading messages
        setTimeout(() => {
          scrollToBottom();
        }, 100);
      } else {
        console.warn('Invalid conversation messages format received:', conversationMessages);
        setChatMessages([]);
      }
    } catch (error) {
      console.error('Failed to load conversation messages:', error);
      setMessagesError('Failed to load conversation messages');
      
      // Try to load from localStorage as fallback
      try {
        const cachedMessages = messageService.loadMessagesFromStorage(conversationId);
        if (Array.isArray(cachedMessages) && cachedMessages.length > 0) {
          setChatMessages(cachedMessages);
          console.log('Loaded conversation messages from cache');
        } else {
          setChatMessages([]);
        }
      } catch (storageError) {
        console.error('Error loading conversation messages from storage:', storageError);
        setChatMessages([]);
      }
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  const handleSearchChange = useCallback((e) => {
    setSearchQuery(e.target.value);
  }, []);

  const handleFilterChange = useCallback((filter) => {
    setActiveFilter(filter);
  }, []);

  const handleNewChat = useCallback(() => {
    setNewChatModal(true);
  }, []);

  const handleCreateGroup = useCallback(() => {
    // TODO: Implement create group functionality
    console.log('Create group clicked');
  }, []);

  const handleCreateChat = useCallback(async (conversation) => {
    try {
      console.log('New chat created:', conversation);
      
      // In a real app, the conversation is already created by the API
      // Format it for the UI
      const newConversation = {
        id: conversation.id || `conv_${Date.now()}`,
        name: conversation.name || conversation.participants?.find(p => p.id !== user.id)?.name || 'New Chat',
        type: conversation.type,
        participants: conversation.participants,
        lastMessage: {
          text: 'Chat created',
          timestamp: conversation.createdAt || new Date().toISOString(),
          user: { name: 'System' }
        },
        unreadCount: 0,
        isOnline: true,
        avatar: conversation.type === 'group' 
          ? null 
          : conversation.participants?.find(p => p.id !== user.id)?.avatar
      };

      console.log('Formatted conversation:', newConversation);
      
      // Here you would typically:
      // 1. Add to conversations state if you have one
      // 2. Navigate to the new chat
      // 3. Refresh conversation list
      
      // For now, we'll just select this conversation if we have a way to do it
      setSelectedConversation(newConversation.id);
      
      // You could also trigger a callback to parent component
      // if (onConversationCreated) {
      //   onConversationCreated(newConversation);
      // }
      
    } catch (error) {
      console.error('Failed to handle new chat:', error);
      throw error; // Re-throw so modal can handle the error
    }
  }, [user]);

  const handleQuickSettings = useCallback(() => {
    setSettingsModal({ open: true, section: 'profile' });
  }, []);

  // Enhanced input functions
  const handleFileChange = useCallback((e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      Array.from(files).forEach(file => {
        console.log('Processing file:', file.name, file.type); // Debug log
        
        if (file.type.startsWith('image/')) {
          // Handle image files
          const reader = new FileReader();
          reader.onload = (event) => {
            console.log('Image loaded, creating message with URL:', event.target.result?.substring(0, 50) + '...'); // Debug log
            const newMessage = {
              id: Date.now() + Math.random(),
              text: `� ${file.name}`,
              user: user,
              timestamp: new Date().toISOString(),
              reactions: [],
              file: {
                name: file.name,
                size: file.size,
                type: file.type,
                url: event.target.result
              }
            };
            setChatMessages(prev => [...prev, newMessage]);
            // Auto-scroll to the new message
            setTimeout(() => {
              scrollToBottom();
            }, 100);
          };
          reader.onerror = (error) => {
            console.error('Error reading file:', error);
          };
          reader.readAsDataURL(file);
        } else {
          // Handle non-image files
          const newMessage = {
            id: Date.now() + Math.random(),
            text: `📎 ${file.name} (${(file.size / 1024).toFixed(1)} KB)`,
            user: user,
            timestamp: new Date().toISOString(),
            reactions: [],
            file: {
              name: file.name,
              size: file.size,
              type: file.type,
              url: URL.createObjectURL(file) // Create object URL for download
            }
          };
          setChatMessages(prev => [...prev, newMessage]);
          // Auto-scroll to the new message
          setTimeout(() => {
            scrollToBottom();
          }, 100);
        }
      });
      
      // Reset file input
      e.target.value = '';
    }
  }, [user, scrollToBottom]);

  // Mobile device detection
  const isMobileDevice = useCallback(() => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }, []);

  // GIF picker handlers
  const handleShowGifPicker = useCallback(() => {
    setShowGifPicker(true);
  }, []);

  const handleGifUpload = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/gif';
    input.multiple = true;
    input.onchange = (e) => {
      handleFileChange(e);
    };
    input.click();
  }, [handleFileChange]);

  const handleGifSelect = useCallback((gif) => {
    // Create a message with the selected GIF
    const newMessage = {
      id: Date.now() + Math.random(),
      text: `🎭 ${gif.name}`,
      user: user,
      timestamp: new Date().toISOString(),
      reactions: [],
      file: {
        name: gif.name || 'selected.gif',
        size: gif.size || 0,
        type: 'image/gif',
        url: gif.url,
        isGif: true
      }
    };
    
    // Add the GIF message to chat
    setChatMessages(prev => [...prev, newMessage]);
    setShowGifPicker(false);
    
    // Auto-scroll to the new message
    setTimeout(() => {
      scrollToBottom();
    }, 100);
  }, [user, setChatMessages, scrollToBottom]);

  const handleCloseGifPicker = useCallback(() => {
    setShowGifPicker(false);
  }, []);

  const handleMobileUploadMenu = useCallback(() => {
    // Mobile upload menu removed for memory optimization
  }, []);

  // Native Features Handlers
  const handleOpenNativeCamera = useCallback((mode = 'photo') => {
    setNativeCameraMode(mode);
    setShowNativeCamera(true);
    // Mobile upload menu removed for memory optimization
  }, []);

  const handleCloseNativeCamera = useCallback(() => {
    setShowNativeCamera(false);
  }, []);

  const handleCameraCapture = useCallback(async (blob, type, metadata) => {
    try {
      // Create a file from the blob
      const file = new File([blob], `${type}-${Date.now()}.${type === 'photo' ? 'jpg' : 'mp4'}`, {
        type: blob.type
      });

      // Handle file upload (reuse existing file upload logic)
      await handleFileChange({ target: { files: [file] } });
      
      // Close camera
      setShowNativeCamera(false);
      
      // Add success message
      handleSendMessage({
        text: `📸 ${type === 'photo' ? 'Photo' : 'Video'} captured from camera`,
        type: 'system',
        metadata: metadata
      });
    } catch (error) {
      console.error('Failed to handle camera capture:', error);
      // Add error message
      handleSendMessage({
        text: '❌ Failed to upload captured media',
        type: 'system'
      });
    }
  }, []);

  const handleOpenContactPicker = useCallback(() => {
    setShowContactPicker(true);
    // Mobile upload menu removed for memory optimization
  }, []);

  const handleCloseContactPicker = useCallback(() => {
    setShowContactPicker(false);
  }, []);

  const handleContactSelect = useCallback((contacts) => {
    try {
      // Format contacts for sharing
      const contactText = contacts.map(contact => {
        const parts = [];
        if (contact.name) parts.push(contact.name);
        if (contact.phone) parts.push(`📱 ${contact.phone}`);
        if (contact.email) parts.push(`📧 ${contact.email}`);
        return parts.join('\n');
      }).join('\n\n');

      // Send contact information as message
      handleSendMessage({
        text: `👥 Shared Contact${contacts.length > 1 ? 's' : ''}:\n\n${contactText}`,
        type: 'contact',
        metadata: { contacts, shared: true }
      });

      // Close contact picker
      setShowContactPicker(false);
    } catch (error) {
      console.error('Failed to share contacts:', error);
      handleSendMessage({
        text: '❌ Failed to share contacts',
        type: 'system'
      });
    }
  }, []);

  // Handle avatar image loading errors
  const handleAvatarError = useCallback(() => {
    setAvatarError(true);
  }, []);

  // Global call state - must be declared before callbacks that use it
  const [globalCall, setGlobalCall] = useState(null);

  // Handle global voice call start
  const handleStartGlobalCall = useCallback((call) => {
    setGlobalCall(call);
    setVoiceCallState({
      active: true,
      withUser: {
        name: call.targetUser.name,
        avatar: call.targetUser.avatar,
        id: call.targetUser.id
      },
      minimized: false,
      audioOnly: true,
      callInstance: call
    });

    // Add global call message to chat
    const callMessage = {
      id: call.id,
      text: `🌍 Global voice call ${call.type === 'outgoing' ? 'to' : 'from'} ${call.targetUser.name}`,
      user: 'System',
      timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
      type: 'global_voice_call',
      callStatus: call.status,
      isSystemMessage: true
    };

    setChatMessages(prev => [...prev, callMessage]);
  }, []);

  // Handle ending global voice call
  const handleEndGlobalCall = useCallback(() => {
    if (globalCall) {
      globalVoiceCallService.endCall();
      setGlobalCall(null);
      setVoiceCallState(prev => ({ ...prev, active: false }));

      // Add call ended message
      const endMessage = {
        id: `end_${Date.now()}`,
        text: `📞 Global call ended`,
        user: 'System',
        timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        type: 'system',
        isSystemMessage: true
      };

      setChatMessages(prev => [...prev, endMessage]);
    }
  }, [globalCall]);

  // Handle more menu toggle
  const handleMoreMenuToggle = useCallback(() => {
    setShowMoreMenu(prev => !prev);
  }, []);

  // Handle export chat
  const handleExportChat = useCallback(() => {
    const chatData = {
      conversation: currentSelectedConversation?.name || 'Chat Export',
      messages: chatMessages,
      exportDate: new Date().toISOString(),
      totalMessages: chatMessages.length
    };
    
    const dataStr = JSON.stringify(chatData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `chat-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setShowMoreMenu(false);
    
    // Show success message
    const exportMessage = {
      id: `export_${Date.now()}`,
      text: '📥 Chat exported successfully',
      user: 'System',
      timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
      type: 'system',
      isSystemMessage: true
    };
    setChatMessages(prev => [...prev, exportMessage]);
  }, [chatMessages, currentSelectedConversation]);

  // Handle mute notifications
  const handleMuteNotifications = useCallback(() => {
    const currentlyMuted = localStorage.getItem('notificationsMuted') === 'true';
    const newMutedState = !currentlyMuted;
    
    localStorage.setItem('notificationsMuted', newMutedState.toString());
    
    setShowMoreMenu(false);
    
    // Show status message
    const muteMessage = {
      id: `mute_${Date.now()}`,
      text: `🔔 Notifications ${newMutedState ? 'muted' : 'unmuted'}`,
      user: 'System',
      timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
      type: 'system',
      isSystemMessage: true
    };
    setChatMessages(prev => [...prev, muteMessage]);
  }, []);

  // Handle clear chat
  const handleClearChat = useCallback(() => {
    const confirmed = window.confirm('Are you sure you want to clear this chat? This action cannot be undone.');
    if (confirmed) {
      setChatMessages([]);
      setShowMoreMenu(false);
      
      // Show clear message
      const clearMessage = {
        id: `clear_${Date.now()}`,
        text: '🧹 Chat cleared',
        user: 'System',
        timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        type: 'system',
        isSystemMessage: true
      };
      setChatMessages([clearMessage]);
    }
  }, []);

  // Handle contact manager
  const handleOpenContactManager = useCallback(() => {
    setShowContactManager(true);
    setShowMoreMenu(false);
  }, []);

  // Handle contact selection for starting a chat
  const handleContactToChat = useCallback(async (contact) => {
    try {
      // Create a new chat message to indicate starting chat with contact
      const chatMessage = {
        id: `contact_chat_${Date.now()}`,
        text: `💬 Starting chat with ${contact.name}`,
        user: 'System',
        timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        type: 'system',
        isSystemMessage: true,
        contactId: contact.id
      };
      
      setChatMessages(prev => [...prev, chatMessage]);
      
      // Close contact manager
      setShowContactManager(false);
      
      // Update contact analytics
      await contactService.updateContactInteraction(contact.id, 'chat_started');
      
    } catch (error) {
      console.error('Error starting chat with contact:', error);
    }
  }, []);

  // Handle contact call
  const handleContactCall = useCallback(async (contact) => {
    try {
      // Use the enhanced voice call service to initiate call
      if (contact.phoneNumbers && contact.phoneNumbers.length > 0) {
        const primaryPhone = contact.phoneNumbers[0];
        
        // Create call message
        const callMessage = {
          id: `contact_call_${Date.now()}`,
          text: `📞 Calling ${contact.name} at ${primaryPhone.number}`,
          user: 'System',
          timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
          type: 'system',
          isSystemMessage: true,
          contactId: contact.id
        };
        
        setChatMessages(prev => [...prev, callMessage]);
        
        // Update contact analytics
        await contactService.updateContactInteraction(contact.id, 'call_made');
        
        // Close contact manager
        setShowContactManager(false);
        
      } else {
        alert('No phone number available for this contact');
      }
    } catch (error) {
      console.error('Error calling contact:', error);
    }
  }, []);

  // Handle search in chat
  const handleSearchInChat = useCallback(() => {
    const searchTerm = prompt('Search in chat:');
    if (searchTerm && searchTerm.trim()) {
      const matchingMessages = chatMessages.filter(msg => 
        msg.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
        msg.user.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      setShowMoreMenu(false);
      
      if (matchingMessages.length > 0) {
        const searchMessage = {
          id: `search_${Date.now()}`,
          text: `🔍 Found ${matchingMessages.length} message(s) containing "${searchTerm}"`,
          user: 'System',
          timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
          type: 'system',
          isSystemMessage: true,
          searchResults: matchingMessages
        };
        setChatMessages(prev => [...prev, searchMessage]);
      } else {
        const noResultsMessage = {
          id: `search_${Date.now()}`,
          text: `🔍 No messages found containing "${searchTerm}"`,
          user: 'System',
          timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
          type: 'system',
          isSystemMessage: true
        };
        setChatMessages(prev => [...prev, noResultsMessage]);
      }
    }
  }, [chatMessages]);

  // Handle print chat
  const handlePrintChat = useCallback(() => {
    const printContent = chatMessages.map(msg => 
      `[${msg.timestamp}] ${msg.user}: ${msg.text}`
    ).join('\n');
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Chat Print - ${currentSelectedConversation?.name || 'Chat'}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { border-bottom: 2px solid #ccc; margin-bottom: 20px; padding-bottom: 10px; }
            .message { margin-bottom: 10px; padding: 8px; border-left: 3px solid #007bff; }
            .timestamp { color: #666; font-size: 0.9em; }
            .user { font-weight: bold; color: #333; }
            .text { margin-top: 5px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Chat: ${currentSelectedConversation?.name || 'Conversation'}</h1>
            <p>Exported on: ${new Date().toLocaleString()}</p>
            <p>Total Messages: ${chatMessages.length}</p>
          </div>
          <div class="messages">
            ${chatMessages.map(msg => `
              <div class="message">
                <div class="timestamp">${msg.timestamp}</div>
                <div class="user">${msg.user}</div>
                <div class="text">${msg.text}</div>
              </div>
            `).join('')}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
    
    setShowMoreMenu(false);
  }, [chatMessages, currentSelectedConversation]);

  // Close more menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showMoreMenu && !event.target.closest('.header-menu')) {
        setShowMoreMenu(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMoreMenu]);

  // Handle adding reactions to messages
  const handleReactionAdd = useCallback(async (messageId, emoji) => {
    // Update local state immediately for responsive UI
    setChatMessages(prev => prev.map(message => {
      if (message.id === messageId) {
        const existingReaction = message.reactions.find(r => r.emoji === emoji);
        if (existingReaction) {
          // Toggle existing reaction
          return {
            ...message,
            reactions: message.reactions.map(r => 
              r.emoji === emoji 
                ? { ...r, count: r.count + 1 }
                : r
            )
          };
        } else {
          // Add new reaction
          return {
            ...message,
            reactions: [...message.reactions, { emoji, count: 1, userId: user.id }]
          };
        }
      }
      return message;
    }));

    // Try to sync with backend
    try {
      if (messageService.addReaction) {
        await messageService.addReaction(messageId, emoji);
      }
    } catch (error) {
      console.error('Failed to sync reaction with backend:', error);
      // Reaction already added to local state, so no rollback needed
    }
  }, [user.id]);

  const handleEmojiClick = useCallback((emoji) => {
    if (selectedMessageId) {
      // Add reaction to specific message
      handleReactionAdd(selectedMessageId, emoji);
    } else {
      // Add emoji to input text (existing functionality)
      setInputText(prev => prev + emoji);
    }
    setShowEmojiPicker(false);
    setShowReactionPicker(false);
    setSelectedMessageId(null);
  }, [selectedMessageId, handleReactionAdd]);

  // Handle message click for reactions
  const handleMessageClick = useCallback((messageId) => {
    setSelectedMessageId(messageId);
    setShowReactionPicker(true);
    setShowEmojiPicker(false);
  }, []);

  const formatRecordingTime = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const startRecording = useCallback(() => {
    setIsRecording(true);
    setRecordingDuration(0);
    setShowEmojiPicker(false);
    
    recordingTimerRef.current = setInterval(() => {
      setRecordingDuration(prev => prev + 1);
    }, 1000);
    
    console.log('Voice recording started');
  }, []);

  const stopRecording = useCallback((send = true) => {
    clearInterval(recordingTimerRef.current);
    setIsRecording(false);
    
    if (send && recordingDuration > 0) {
      const newMessage = {
        id: Date.now(),
        text: `🎤 Voice message (${formatRecordingTime(recordingDuration)})`,
        user: user,
        timestamp: new Date().toISOString(),
        reactions: [],
        type: 'voice',
        duration: recordingDuration
      };
      setChatMessages(prev => [...prev, newMessage]);
      // Auto-scroll to the new message
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    }
    
    setRecordingDuration(0);
  }, [recordingDuration, formatRecordingTime, user, scrollToBottom]);

  // Cleanup recording timer
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  // Filter conversations based on search and active filter
  const filteredConversations = useMemo(() => {
    let filtered = conversations;
    
    // Apply text search
    if (searchQuery.trim()) {
      filtered = filtered.filter(conv => 
        conv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Apply filter
    switch (activeFilter) {
      case 'unread':
        filtered = filtered.filter(conv => conv.unreadCount > 0);
        break;
      case 'groups':
        filtered = filtered.filter(conv => conv.name.includes('Team') || conv.name.includes('Group'));
        break;
      default:
        // 'all' - no additional filtering
        break;
    }
    
    return filtered;
  }, [conversations, searchQuery, activeFilter]);

  const getFilterCounts = useMemo(() => ({
    all: conversations.length,
    unread: conversations.filter(conv => conv.unreadCount > 0).length,
    groups: conversations.filter(conv => conv.name.includes('Team') || conv.name.includes('Group')).length
  }), [conversations]);

  const totalUnreadCount = useMemo(() => {
    return conversations.reduce((total, conv) => total + conv.unreadCount, 0);
  }, [conversations]);

  // chatMessages state already defined above

  const [inputText, setInputText] = useState('');

  // Enhanced features state
  const [profileModal, setProfileModal] = useState({ open: false, userId: null, username: null });
  const [settingsModal, setSettingsModal] = useState({ open: false, section: 'profile' });
  const [newChatModal, setNewChatModal] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState(false);
  const [helpModal, setHelpModal] = useState(false);
  const [videoCallState, setVideoCallState] = useState({ 
    active: false, 
    withUser: null, 
    minimized: false, 
    audioOnly: false 
  });
  const [voiceCallState, setVoiceCallState] = useState({ 
    active: false, 
    withUser: null, 
    minimized: false, 
    audioOnly: true 
  });
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [availableCallMethods, setAvailableCallMethods] = useState([]);
  const [showCallMethodSelector, setShowCallMethodSelector] = useState(false);
  
  // Reaction system state already defined above

  // Message input handlers
  const handleSendMessage = useCallback(async () => {
    if (!inputText.trim()) return;
    
    try {
      // Send message via encrypted service with conversation context
      const messageData = {
        text: inputText.trim(),
        conversationId: selectedConversation,
        user: user?.name || 'User'
      };
      
      // Get conversation participants for encryption
      const conversationParticipants = currentSelectedConversation?.participants || [];
      const recipientId = conversationParticipants.find(p => p !== user.id);
      
      // Send with encryption options
      const sentMessage = await encryptedMessageService.sendMessage(messageData, {
        encrypt: defaultEncryption && encryptionEnabled,
        recipientId: recipientId,
        conversationParticipants: conversationParticipants
      });
      
      // Add to local state immediately for responsive UI
      const newMessage = {
        id: sentMessage.id || Date.now(),
        text: inputText.trim(),
        user: user,
        timestamp: sentMessage.timestamp || new Date().toISOString(),
        reactions: sentMessage.reactions || [],
        conversationId: selectedConversation,
        isEncrypted: sentMessage.isEncrypted || false,
        encryptionStatus: sentMessage.encryptionStatus
      };
      
      setChatMessages(prev => [...prev, newMessage]);
      setInputText('');
      
      // Auto-scroll to the new message
      setTimeout(() => {
        scrollToBottom();
      }, 100);
      
    } catch (error) {
      console.error('Failed to send message:', error);
      
      // Still add to local state for offline persistence
      const fallbackMessage = {
        id: Date.now(),
        text: inputText.trim(),
        user: user,
        timestamp: new Date().toISOString(),
        reactions: [],
        pending: true, // Mark as pending/failed
        conversationId: selectedConversation
      };
      
      setChatMessages(prev => [...prev, fallbackMessage]);
      setInputText('');
      
      // Auto-scroll to the new message
      setTimeout(() => {
        scrollToBottom();
      }, 100);
      
      // Optionally show error message to user
      console.warn('Message sent offline, will sync when connection is restored');
    }
  }, [inputText, user, selectedConversation, scrollToBottom, currentSelectedConversation, defaultEncryption, encryptionEnabled]);

  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  // Modal handlers
  const handleViewUserProfile = useCallback((userId, username) => {
    setProfileModal({ open: true, userId, username });
  }, []);

  const handleCloseProfileModal = useCallback(() => {
    setProfileModal({ open: false, userId: null, username: null });
  }, []);

  const handleCloseSettingsModal = useCallback(() => {
    setSettingsModal({ open: false, section: 'profile' });
  }, []);

  // Feedback handler
  const handleFeedbackSubmit = useCallback(async (feedbackData) => {
    try {
      console.log('Feedback submitted:', feedbackData);
      
      // Format and validate feedback data
      const formattedData = feedbackService.formatFeedbackData(feedbackData);
      const validation = feedbackService.validateFeedback(formattedData);
      
      if (!validation.isValid) {
        throw new Error('Please check your feedback and try again.');
      }
      
      // Submit feedback via service
      const result = await feedbackService.submitFeedback(formattedData);
      
      console.log('✅ Feedback submitted successfully:', result);
      return result;
    } catch (error) {
      console.error('❌ Failed to submit feedback:', error);
      throw error;
    }
  }, []);

  // Lightbox handlers
  const getAllImages = useCallback(() => {
    return chatMessages
      .filter(msg => msg.file && msg.file.type.startsWith('image/'))
      .map(msg => ({
        url: msg.file.url,
        name: msg.file.name,
        messageId: msg.id
      }));
  }, [chatMessages]);

  const handleOpenLightbox = useCallback((imageUrl, imageName) => {
    const allImages = getAllImages();
    const currentIndex = allImages.findIndex(img => img.url === imageUrl);
    
    setLightboxModal({ 
      open: true, 
      imageUrl, 
      imageName,
      zoom: 1,
      pan: { x: 0, y: 0 },
      isDragging: false,
      currentIndex: Math.max(0, currentIndex),
      images: allImages
    });
  }, [getAllImages]);

  // Video lightbox handlers
  const handleOpenVideoLightbox = useCallback((videoUrl, videoName, poster, type) => {
    setVideoLightboxModal({
      open: true,
      videoUrl,
      videoName,
      poster,
      type
    });
  }, []);

  const handleCloseVideoLightbox = useCallback(() => {
    setVideoLightboxModal({
      open: false,
      videoUrl: null,
      videoName: null,
      poster: null,
      type: null
    });
  }, []);

  const handleNavigateImage = useCallback((direction) => {
    setLightboxModal(prev => {
      const newIndex = direction === 'next' 
        ? Math.min(prev.currentIndex + 1, prev.images.length - 1)
        : Math.max(prev.currentIndex - 1, 0);
      
      const newImage = prev.images[newIndex];
      if (newImage) {
        return {
          ...prev,
          currentIndex: newIndex,
          imageUrl: newImage.url,
          imageName: newImage.name,
          zoom: 1,
          pan: { x: 0, y: 0 },
          isLoading: true
        };
      }
      return prev;
    });
  }, []);

  const handleImageLoad = useCallback(() => {
    setLightboxModal(prev => ({
      ...prev,
      isLoading: false
    }));
  }, []);

  const handleImageError = useCallback(() => {
    setLightboxModal(prev => ({
      ...prev,
      isLoading: false
    }));
  }, []);

  const handleCloseLightbox = useCallback(() => {
    setLightboxModal({ 
      open: false, 
      imageUrl: null, 
      imageName: null,
      zoom: 1,
      pan: { x: 0, y: 0 },
      isDragging: false,
      currentIndex: 0,
      images: [],
      isLoading: false
    });
  }, []);

  const handleZoomIn = useCallback(() => {
    setLightboxModal(prev => ({
      ...prev,
      zoom: Math.min(prev.zoom * 1.2, 3)
    }));
  }, []);

  const handleZoomOut = useCallback(() => {
    setLightboxModal(prev => ({
      ...prev,
      zoom: Math.max(prev.zoom / 1.2, 0.5),
      pan: prev.zoom <= 1 ? { x: 0, y: 0 } : prev.pan
    }));
  }, []);

  const handleZoomReset = useCallback(() => {
    setLightboxModal(prev => ({
      ...prev,
      zoom: 1,
      pan: { x: 0, y: 0 }
    }));
  }, []);

  const handleMouseDown = useCallback((e) => {
    if (lightboxModal.zoom > 1) {
      setLightboxModal(prev => ({
        ...prev,
        isDragging: true
      }));
    }
  }, [lightboxModal.zoom]);

  const handleMouseMove = useCallback((e) => {
    if (lightboxModal.isDragging && lightboxModal.zoom > 1) {
      setLightboxModal(prev => ({
        ...prev,
        pan: {
          x: prev.pan.x + e.movementX,
          y: prev.pan.y + e.movementY
        }
      }));
    }
  }, [lightboxModal.isDragging, lightboxModal.zoom]);

  const handleMouseUp = useCallback(() => {
    setLightboxModal(prev => ({
      ...prev,
      isDragging: false
    }));
  }, []);

  // Keyboard navigation for lightbox
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (lightboxModal.open) {
        switch (event.key) {
          case 'Escape':
            handleCloseLightbox();
            break;
          case 'ArrowLeft':
            event.preventDefault();
            handleNavigateImage('prev');
            break;
          case 'ArrowRight':
            event.preventDefault();
            handleNavigateImage('next');
            break;
          case '+':
          case '=':
            event.preventDefault();
            handleZoomIn();
            break;
          case '-':
            event.preventDefault();
            handleZoomOut();
            break;
          case '0':
            event.preventDefault();
            handleZoomReset();
            break;
          default:
            // No action for other keys
            break;
        }
      } else if (videoLightboxModal.open) {
        switch (event.key) {
          case 'Escape':
            handleCloseVideoLightbox();
            break;
          default:
            // No action for other keys
            break;
        }
      }
    };

    const handleWheel = (event) => {
      if (lightboxModal.open) {
        event.preventDefault();
        if (event.deltaY < 0) {
          handleZoomIn();
        } else {
          handleZoomOut();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('wheel', handleWheel);
    };
  }, [lightboxModal.open, handleCloseLightbox, handleNavigateImage, handleZoomIn, handleZoomOut, handleZoomReset]);

  // Video call handlers
  const handleEndCall = useCallback(() => {
    setVideoCallState(prev => ({ ...prev, active: false }));
  }, []);

  const handleToggleMinimize = useCallback(() => {
    setVideoCallState(prev => ({ ...prev, minimized: !prev.minimized }));
  }, []);

  // Enhanced voice call handlers
  const handleStartVoiceCall = useCallback(async () => {
    const currentUser = currentSelectedConversation || currentConversation;
    if (!currentUser) return;

    try {
      // Get available call methods
      const methods = await enhancedVoiceCallService.getAvailableCallMethods(currentUser);
      setAvailableCallMethods(methods);
      
      // If multiple methods available, show selector
      if (methods.length > 1) {
        setShowCallMethodSelector(true);
        return;
      }
      
      // Start call with best method
      await startEnhancedVoiceCall(currentUser, 'auto');
    } catch (error) {
      console.error('Failed to start voice call:', error);
    }
  }, [currentSelectedConversation, currentConversation]);

  const startEnhancedVoiceCall = useCallback(async (targetUser, method = 'auto') => {
    try {
      const callInstance = await enhancedVoiceCallService.initiateEnhancedCall(targetUser, method);
      
      // Update voice call state
      setVoiceCallState({
        active: true,
        withUser: {
          name: targetUser.name,
          avatar: targetUser.avatar,
          phone: targetUser.phone
        },
        minimized: false,
        audioOnly: true,
        callInstance
      });

      // Add enhanced voice call message to chat
      const voiceCallMessage = {
        id: callInstance.callId,
        text: `📞 ${callInstance.method.description} with ${targetUser.name}`,
        user: 'You',
        timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        type: 'voice_call_enhanced',
        callStatus: callInstance.status,
        callMethod: callInstance.method,
        connectionQuality: callInstance.connectionStatus.quality,
        isSystemMessage: true
      };

      setChatMessages(prev => [...prev, voiceCallMessage]);
      setShowCallMethodSelector(false);
    } catch (error) {
      console.error('Failed to start enhanced voice call:', error);
    }
  }, []);

  const handleEndVoiceCall = useCallback(() => {
    setVoiceCallState(prev => ({ ...prev, active: false }));
  }, []);

  const handleToggleVoiceMinimize = useCallback(() => {
    setVoiceCallState(prev => ({ ...prev, minimized: !prev.minimized }));
  }, []);

  // Video call component
  const MemoizedVideoCall = useMemo(() => (
    <VideoCall 
      callState={videoCallState}
      onEndCall={handleEndCall}
      onToggleMinimize={handleToggleMinimize}
    />
  ), [videoCallState, handleEndCall, handleToggleMinimize]);

  // Voice call component (using VideoCall in audio-only mode)
  const MemoizedVoiceCall = useMemo(() => (
    <VideoCall 
      callState={voiceCallState}
      onEndCall={handleEndVoiceCall}
      onToggleMinimize={handleToggleVoiceMinimize}
    />
  ), [voiceCallState, handleEndVoiceCall, handleToggleVoiceMinimize]);

  // Enhanced smart content preview function
  const getSmartPreview = useCallback((message) => {
    const { text, file, reactions } = message;
    
    // Handle different content types
    if (file?.type.startsWith('image/')) {
      return `📸 Image: ${file.name}`;
    }
    if (file?.type.startsWith('video/')) {
      return `🎥 Video: ${file.name}`;
    }
    if (file?.type.startsWith('audio/')) {
      return `🎵 Audio: ${file.name}`;
    }
    if (file && !file.type.startsWith('image/') && !file.type.startsWith('video/') && !file.type.startsWith('audio/')) {
      return `📎 File: ${file.name}`;
    }
    
    // Handle text content
    if (text.includes('```')) {
      return `💻 Code snippet`;
    }
    if (text.match(/https?:\/\/[^\s]+/)) {
      return `🔗 ${text.substring(0, 60)}...`;
    }
    if (text.includes('@')) {
      const mentions = text.match(/@\w+/g);
      return `💬 ${text.replace(/@\w+/g, '@user')}${mentions?.length > 1 ? ` (+${mentions.length - 1} mentions)` : ''}`;
    }
    if (reactions?.length > 0) {
      return `${text.substring(0, 60)}... (${reactions.length} ${reactions.length === 1 ? 'reaction' : 'reactions'})`;
    }
    
    return text.length > 100 ? text.substring(0, 100) + '...' : text;
  }, []);

  // Advanced message categorization with multiple factors
  const getAdvancedMessageCategory = useCallback((message) => {
    const { text, file, user, reactions = [] } = message;
    const length = text.length;
    
    const categories = {
      length: length <= 50 ? 'short' : length <= 200 ? 'medium' : length <= 500 ? 'long' : 'very-long',
      type: file ? (file.type.startsWith('image/') ? 'image' : 
                   file.type.startsWith('video/') ? 'video' : 
                   file.type.startsWith('audio/') ? 'audio' : 'file') : 'text',
      priority: user.role === 'admin' ? 'high' : user.role === 'moderator' ? 'medium' : 'normal',
      hasMedia: !!file,
      hasReactions: reactions.length > 0,
      hasCode: text.includes('```') || text.includes('`'),
      hasLinks: /https?:\/\/[^\s]+/.test(text),
      hasMentions: /@\w+/.test(text),
      sentiment: text.includes('!') && text.includes('urgent') ? 'urgent' : 
                text.includes('?') ? 'question' : 
                /[😀😃😄😁😆😅😂🤣😊😇🙂😉😌😍🥰😘😗😙😚😋😛😝😜🤪🤨🧐🤓😎🤩🥳😏😒😞😔😟😕🙁☹️😣😖😫😩🥺😢😭😤😠😡🤬🤯😳🥵🥶😱😨😰😥😓🤗🤔🤭🤫🤥😶😐😑😬🙄😯😦😧😮😲🥱😴🤤😪😵🤐🥴🤢🤮🤧😷🤒🤕🤑🤠😈👿👹👺🤡💩👻💀☠️👽👾🤖🎃😺😸😹😻😼😽🙀😿😾]/.test(text) ? 'emoji' : 'neutral'
    };
    
    return categories;
  }, []);

  // Function to determine message length category for dynamic styling (enhanced)
  const getMessageLengthCategory = useCallback((text) => {
    const length = text.length;
    if (length <= 50) return 'short';
    if (length <= 200) return 'medium';
    if (length <= 500) return 'long';
    return 'very-long';
  }, []);

  return (
    <div className="pro-layout mobile-optimized smartphone-optimized">
      {/* Dynamic Animated Background */}
      <div className="dynamic-background">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
        <div className="gradient-orb orb-4"></div>
        <div className="gradient-orb orb-5"></div>
        <div className="floating-particles">
          {[...Array(20)].map((_, i) => (
            <div key={i} className={`particle particle-${i + 1}`}></div>
          ))}
        </div>
      </div>
      
      {/* Content Backdrop for Readability */}
      <div className="content-backdrop"></div>
      
      {/* Video Call Component */}
      {MemoizedVideoCall}
      
      {/* Voice Call Component */}
      {MemoizedVoiceCall}
      
      {/* Enhanced Sidebar */}
      <div className={`pro-sidebar enhanced-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        {/* Sidebar Header */}
        <div className="pro-sidebar-header">
          <div className="sidebar-logo">
            <div className="logo-icon" data-tooltip="Quibish Chat">
              💬
              {totalUnreadCount > 0 && (
                <div className="logo-unread-badge">{totalUnreadCount > 99 ? '99+' : totalUnreadCount}</div>
              )},
            </div>
            {!sidebarCollapsed && (
              <div className="logo-text">
                <h2>Quibish</h2>
                <span className="version">v2.0</span>
              </div>
            )}
          </div>
          <button onClick={toggleSidebar} className="sidebar-toggle-btn" title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            {sidebarCollapsed ? '⮞' : '⮜'}
          </button>
        </div>

        {/* User Profile Section */}
        <div className="sidebar-user-profile">
          <div 
            className={`user-avatar ${user?.role === 'admin' ? 'admin-user' : ''}`} 
            data-tooltip={user?.role === 'admin' ? `${user?.name || 'Admin'} (Administrator)` : user?.name || 'User Profile'}
          >
            <img 
              src={
                avatarError ? 
                  '/default-avatar.png' : 
                  user?.avatar || 
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=4f46e5&color=fff&size=80&bold=true&format=png`
              }
              alt={user?.name || 'User'}
              onError={(e) => {
                // Multiple fallback handling
                if (!avatarError) {
                  console.log('Avatar load failed, trying fallback:', e.target.src);
                  handleAvatarError();
                  // If it's already trying ui-avatars, fallback to default
                  if (e.target.src.includes('ui-avatars.com')) {
                    e.target.src = '/default-avatar.png';
                  }
                } else {
                  // Last resort - if even default fails, show a colored div
                  e.target.style.display = 'none';
                  const fallbackDiv = document.createElement('div');
                  fallbackDiv.className = 'avatar-fallback';
                  fallbackDiv.style.cssText = `
                    width: 40px; 
                    height: 40px; 
                    border-radius: 50%; 
                    background: linear-gradient(135deg, #4f46e5, #7c3aed); 
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    color: white; 
                    font-weight: bold;
                    font-size: 16px;
                  `;
                  fallbackDiv.textContent = (user?.name || 'U').charAt(0).toUpperCase();
                  e.target.parentNode.insertBefore(fallbackDiv, e.target);
                }
              }}
              onLoad={() => setAvatarError(false)}
            />
            <div className="status-indicator online"></div>
            {user?.role === 'admin' && (
              <div className="admin-badge" title="Administrator">
                👑
              </div>
            )}
          </div>
          {!sidebarCollapsed && (
            <div className="user-info">
              <h3 className="user-name">{user?.name || 'User'}</h3>
              <p className="user-status">Online</p>
            </div>
          )}
          {!sidebarCollapsed && (
            <div className="user-actions">
              <button className="action-btn" title="Settings" onClick={handleQuickSettings}>⚙️</button>
              <button className="action-btn" title="Profile" onClick={() => handleViewUserProfile(user?.id, user?.name)}>👤</button>
              <button className="action-btn logout-btn" title="Logout / Disconnect" onClick={onLogout}>🚪</button>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        {!sidebarCollapsed && (
          <div className="sidebar-quick-actions">
            <button className="quick-action-btn primary" onClick={handleNewChat}>
              <span className="icon">➕</span>
              <span className="text">New Chat</span>
            </button>
            <button className="quick-action-btn secondary" onClick={handleCreateGroup}>
              <span className="icon">👥</span>
              <span className="text">Create Group</span>
            </button>
          </div>
        )}

        {/* Search Bar */}
        {!sidebarCollapsed && (
          <div className="sidebar-search">
            <div className="search-container">
              <span className="search-icon">🔍</span>
              <input 
                type="text" 
                placeholder="Search conversations..."
                className="search-input"
                value={searchQuery}
                onChange={handleSearchChange}
              />
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        {!sidebarCollapsed && (
          <div className="sidebar-filters">
            <button 
              className={`filter-tab ${activeFilter === 'all' ? 'active' : ''}`}
              onClick={() => handleFilterChange('all')}
            >
              <span className="tab-text">All</span>
              <span className="tab-count">{getFilterCounts.all}</span>
            </button>
            <button 
              className={`filter-tab ${activeFilter === 'unread' ? 'active' : ''}`}
              onClick={() => handleFilterChange('unread')}
            >
              <span className="tab-text">Unread</span>
              <span className="tab-count">{getFilterCounts.unread}</span>
            </button>
            <button 
              className={`filter-tab ${activeFilter === 'groups' ? 'active' : ''}`}
              onClick={() => handleFilterChange('groups')}
            >
              <span className="tab-text">Groups</span>
              <span className="tab-count">{getFilterCounts.groups}</span>
            </button>
          </div>
        )}

        {/* Conversations List */}
        <div className="pro-sidebar-content">
          <div className="conversations-header">
            {!sidebarCollapsed && <h4>Recent Conversations</h4>}
          </div>
          <div className="conversations-list">
            {filteredConversations.map(conv => (
              <div 
                key={conv.id} 
                className={`conversation-item enhanced ${selectedConversation === conv.id ? 'active' : ''}`}
                onClick={() => handleConversationSelect(conv.id)}
              >
                <div className="conversation-avatar" data-tooltip={conv.name}>
                  <img 
                    src={conv.avatar || `https://ui-avatars.com/api/?name=${conv.name}&background=random&size=40`}
                    alt={conv.name}
                  />
                  {conv.isOnline && <div className="online-dot"></div>}
                  {conv.unreadCount > 0 && <div className="unread-badge">{conv.unreadCount}</div>}
                </div>
                {!sidebarCollapsed && (
                  <div className="conversation-details">
                    <div className="conversation-header">
                      <h5 className="conversation-name">{conv.name}</h5>
                      <span className="conversation-time">{conv.lastMessageTime || '2m'}</span>
                    </div>
                    <div className="conversation-preview">
                      <p className="last-message">{conv.lastMessage || 'Hey there! How are you doing?'}</p>
                      <div className="conversation-meta">
                        {conv.isPinned && <span className="pin-icon">📌</span>}
                        {conv.isMuted && <span className="mute-icon">🔇</span>}
                        {conv.messageStatus && <span className={`message-status ${conv.messageStatus}`}>✓</span>}
                      </div>
                    </div>
                  </div>
                )}
                {sidebarCollapsed && conv.unreadCount > 0 && (
                  <div className="collapsed-unread-indicator"></div>
                )}
              </div>
            ))}
          </div>

          {/* Global Voice Calls */}
          {!sidebarCollapsed && (
            <GlobalUsers 
              onStartCall={handleStartGlobalCall}
              currentCall={globalCall}
            />
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="sidebar-footer">
          {!sidebarCollapsed && (
            <div className="footer-stats">
              <div className="stat-item">
                <span className="stat-label">Active</span>
                <span className="stat-value">12</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Total</span>
                <span className="stat-value">156</span>
              </div>
            </div>
          )}
          <div className="footer-actions">
            <button 
              className="footer-btn" 
              title="Profile" 
              onClick={() => handleViewUserProfile(user?.id, user?.name)}
              data-mobile-action="profile"
            >
              👤
            </button>
            <button 
              className="footer-btn" 
              title="Settings" 
              onClick={handleQuickSettings}
              data-mobile-action="settings"
            >
              ⚙️
            </button>
            <button 
              className="footer-btn logout-btn" 
              title="Logout" 
              onClick={onLogout}
              data-mobile-action="logout"
            >
              🚪
            </button>
            {!sidebarCollapsed && (
              <button className="footer-btn" title="Help" onClick={() => setHelpModal(true)}>❓</button>
            )}
            {!sidebarCollapsed && (
              <button className="footer-btn" title="Feedback" onClick={() => setFeedbackModal(true)}>💬</button>
            )}
          </div>
        </div>
      </div>

      {/* Sidebar Backdrop Overlay for Mobile */}
      {!sidebarCollapsed && (
        <div 
          className="pro-sidebar-overlay" 
          onClick={handleOverlayClick}
          aria-hidden="true"
        />
      )}

      {/* Main Chat Area */}
      <div className={`pro-main ${sidebarCollapsed ? 'collapsed' : ''}`}>
        {/* Enhanced Header */}
        <div className="pro-header enhanced-chat-header">
          <div className="header-left">
            <div className="conversation-avatar">
              <img 
                src={currentSelectedConversation?.avatar || currentConversation?.avatar || `https://images.unsplash.com/photo-1516726817505-f5ed825624d8?w=40&h=40&fit=crop&crop=face`}
                alt={currentSelectedConversation?.name || currentConversation?.name || 'Chat'}
              />
              <div className={`online-indicator ${isConnected ? 'online' : 'offline'}`}></div>
            </div>
            <div className="conversation-info">
              <h3 className="conversation-title">
                {currentSelectedConversation?.name || currentConversation?.name || (selectedConversation ? 'Loading conversation...' : 'Select a conversation')}
              </h3>
              <div className="conversation-status">
                <span className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
                  {isConnected ? '● Online' : '● Disconnected'}
                </span>
                <span className="participant-count">
                  {currentSelectedConversation?.participants || currentConversation?.participants || (currentSelectedConversation ? 2 : 0)} participants
                </span>
              </div>
            </div>
          </div>
          
          <div className="header-center">
            <div className="header-search">
              <input 
                type="text" 
                placeholder="Search messages..." 
                className="search-input"
              />
              <button className="search-btn">🔍</button>
            </div>
          </div>
          
          <div className="header-actions">
            <button className="action-btn video-call-btn" title="Start video call">
              📹
            </button>
            <button 
              className="action-btn voice-call-btn" 
              title={`Start voice call (${connectionStatus?.quality || 'checking'} connection)`}
              onClick={handleStartVoiceCall}
            >
              📞
              {connectionStatus && (
                <span 
                  className="connection-indicator"
                  style={{color: connectionStatus.color}}
                >
                  {connectionStatus.icon}
                </span>
              )}
            </button>
            <button className="action-btn info-btn" title="Chat info">
              ℹ️
            </button>
            <button onClick={onToggleDarkMode} className="action-btn theme-toggle" title="Toggle theme">
              {darkMode ? '☀️' : '🌙'}
            </button>
            <button onClick={onLogout} className="action-btn logout-btn" title="Logout / Disconnect">
              🚪
            </button>
            <div className="header-menu">
              <button 
                className="action-btn menu-btn" 
                title="More options"
                onClick={handleMoreMenuToggle}
              >
                ⋮
              </button>
              {showMoreMenu && (
                <div className="dropdown-menu active">
                  <div className="dropdown-header">
                    <span>More Options</span>
                    <button 
                      className="close-dropdown" 
                      onClick={() => setShowMoreMenu(false)}
                    >
                      ×
                    </button>
                  </div>
                  
                  <button className="dropdown-item" onClick={handleSearchInChat}>
                    <span className="dropdown-icon">🔍</span>
                    Search in Chat
                  </button>
                  
                  <button className="dropdown-item" onClick={handleOpenContactManager}>
                    <span className="dropdown-icon">👥</span>
                    Contacts
                  </button>
                  
                  <button className="dropdown-item" onClick={handleExportChat}>
                    <span className="dropdown-icon">📥</span>
                    Export Chat
                  </button>
                  
                  <button className="dropdown-item" onClick={handlePrintChat}>
                    <span className="dropdown-icon">🖨️</span>
                    Print Chat
                  </button>
                  
                  <button className="dropdown-item" onClick={handleMuteNotifications}>
                    <span className="dropdown-icon">
                      {localStorage.getItem('notificationsMuted') === 'true' ? '🔔' : '🔕'}
                    </span>
                    {localStorage.getItem('notificationsMuted') === 'true' ? 'Unmute' : 'Mute'} Notifications
                  </button>
                  
                  <button className="dropdown-item" onClick={handleClearChat}>
                    <span className="dropdown-icon">🗑️</span>
                    Clear Chat
                  </button>
                  
                  <hr className="dropdown-divider" />
                  
                  <button className="dropdown-item" onClick={handleQuickSettings}>
                    <span className="dropdown-icon">⚙️</span>
                    Settings
                  </button>
                  
                  <button className="dropdown-item" onClick={() => setHelpModal(true)}>
                    <span className="dropdown-icon">❓</span>
                    Help & Support
                  </button>
                  
                  <button className="dropdown-item" onClick={() => setFeedbackModal(true)}>
                    <span className="dropdown-icon">💬</span>
                    Send Feedback
                  </button>
                  
                  <hr className="dropdown-divider" />
                  
                  <button onClick={onLogout} className="dropdown-item logout-item">
                    <span className="dropdown-icon">🚪</span>
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="pro-message-list mobile-optimized pull-to-refresh" ref={messagesContainerRef}>
          {messagesLoading && (
            <div className="message-loading-indicator">
              <div className="loading-spinner"></div>
              <span>Loading messages...</span>
            </div>
          )}
          
          {messagesError && !messagesLoading && (
            <div className="message-error-indicator">
              <span>⚠️ {messagesError}</span>
              <button 
                className="retry-button"
                onClick={() => window.location.reload()}
              >
                Retry
              </button>
            </div>
          )}
          
          {!messagesLoading && !messagesError && chatMessages.length === 0 && (
            <div className="no-messages-indicator">
              {selectedConversation ? (
                <>
                  <span>💬 No messages yet in this conversation</span>
                  <p>Be the first to send a message!</p>
                </>
              ) : (
                <>
                  <span>👈 Select a conversation to view messages</span>
                  <p>Choose a conversation from the sidebar to start chatting.</p>
                </>
              )}
            </div>
          )}
          
          {chatMessages.map(message => (
            <div key={message.id} className="pro-message-blurb" data-message-id={message.id}>
              <div className="message-avatar">
                <img 
                  src={message.user.avatar || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=32&h=32&fit=crop&crop=face`}
                  alt={message.user.name}
                  onClick={() => handleViewUserProfile(message.user.id, message.user.name)}
                />
              </div>
              <div className="message-content" onClick={() => handleMessageClick(message.id)}>
                <div className="message-header">
                  <span className="user-name">{message.user.name}</span>
                  {/* Encryption Status Indicator */}
                  {message.isEncrypted && (
                    <span 
                      className={`encryption-indicator ${message.encryptionStatus}`} 
                      title={`Message is encrypted (${message.encryptionStatus})`}
                    >
                      {message.encryptionStatus === 'decrypted' ? '🔓' : 
                       message.encryptionStatus === 'failed' ? '⚠️' : 
                       message.encryptionStatus === 'sent' ? '🔒' : '🔐'}
                    </span>
                  )}
                </div>
                
                {/* Enhanced Message Text with Smart Content */}
                <div 
                  className="message-text" 
                  data-length={getMessageLengthCategory(message.text)}
                  data-content-type={getAdvancedMessageCategory(message).type}
                  data-has-code={getAdvancedMessageCategory(message).hasCode}
                  data-has-links={getAdvancedMessageCategory(message).hasLinks}
                  data-has-mentions={getAdvancedMessageCategory(message).hasMentions}
                  data-sentiment={getAdvancedMessageCategory(message).sentiment}
                >
                  <SmartTextContent 
                    text={message.text}
                    maxLength={300}
                    showWordCount={message.text.length > 500}
                    enableSmartBreaks={true}
                    className="message-smart-text"
                  />
                </div>
                
                {/* File/Image Display */}
                {message.file && (
                  <div className="message-attachment">
                    {message.file.type.startsWith('image/') ? (
                      <div className={`image-attachment ${message.file.isGif ? 'gif-attachment' : ''}`}>
                        {message.file.isGif && (
                          <div className="gif-badge">
                            <span className="gif-label">GIF</span>
                          </div>
                        )}
                        <img 
                          src={message.file.url} 
                          alt={message.file.name}
                          className={`attached-image ${message.file.isGif ? 'gif-image' : ''}`}
                          onClick={() => {
                            // Open image in lightbox/modal
                            handleOpenLightbox(message.file.url, message.file.name);
                          }}
                          style={{
                            maxWidth: message.file.isGif ? '350px' : '300px',
                            maxHeight: message.file.isGif ? '250px' : '200px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            objectFit: 'cover'
                          }}
                        />
                        <div className={`image-caption ${message.file.isGif ? 'gif-caption' : ''}`}>
                          {message.file.isGif && '🎭 '}
                          {message.file.name} ({(message.file.size / 1024).toFixed(1)} KB)
                          {message.file.isGif && (
                            <span className="gif-info"> • Animated GIF</span>
                          )}
                        </div>
                      </div>
                    ) : message.file.type.startsWith('video/') ? (
                      <div className="video-attachment">
                        <div className="video-container">
                          <video 
                            src={message.file.url}
                            poster={message.file.thumbnail}
                            controls
                            preload="metadata"
                            muted={false}
                            playsInline
                            webkit-playsinline="true"
                            onClick={() => {
                              // Open video in spotlight/lightbox mode
                              handleOpenVideoLightbox(
                                message.file.url, 
                                message.file.name,
                                message.file.thumbnail,
                                message.file.type
                              );
                            }}
                            onError={(e) => {
                              console.error('Video playback error:', e);
                              console.log('Video details:', {
                                src: message.file.url,
                                type: message.file.type,
                                poster: message.file.thumbnail ? 'Has thumbnail' : 'No thumbnail',
                                error: e.target.error
                              });
                            }}
                            onLoadedMetadata={(e) => {
                              console.log('Video loaded for playback:', {
                                duration: e.target.duration,
                                videoWidth: e.target.videoWidth,
                                videoHeight: e.target.videoHeight,
                                readyState: e.target.readyState
                              });
                            }}
                            onLoadStart={() => console.log('Video load started')}
                            onCanPlay={() => console.log('Video can play')}
                            onCanPlayThrough={() => console.log('Video can play through')}
                            style={{
                              maxWidth: '400px',
                              maxHeight: '300px',
                              borderRadius: '8px',
                              width: '100%',
                              height: 'auto',
                              cursor: 'pointer'
                            }}
                          >
                            <source src={message.file.url} type={message.file.type} />
                            Your browser does not support the video tag.
                          </video>
                          {message.file.duration && (
                            <div className="video-duration-badge">
                              {message.file.duration}
                            </div>
                          )}
                        </div>
                        <div className="video-caption">
                          🎥 {message.file.name} 
                          {message.file.size && ` (${(message.file.size / (1024 * 1024)).toFixed(1)} MB)`}
                          {message.file.width && message.file.height && ` • ${message.file.width}×${message.file.height}`}
                        </div>
                      </div>
                    ) : (
                      <div className="file-attachment">
                        <div className="file-icon">📄</div>
                        <div className="file-info">
                          <div className="file-name">{message.file.name}</div>
                          <div className="file-size">{(message.file.size / 1024).toFixed(1)} KB</div>
                        </div>
                        <button 
                          className="download-btn"
                          onClick={() => {
                            // Trigger download
                            const link = document.createElement('a');
                            link.href = message.file.url;
                            link.download = message.file.name;
                            link.click();
                          }}
                        >
                          Download
                        </button>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Voice Message Display */}
                {message.type === 'voice' && (
                  <div className="voice-message">
                    <div className="voice-icon">🎤</div>
                    <div className="voice-duration">{formatRecordingTime(message.duration || 0)}</div>
                    <button className="play-voice-btn">▶️</button>
                  </div>
                )}
                
                {/* Voice Call Message Display */}
                {message.type === 'voice_call' && (
                  <div className="voice-call-message">
                    <div className="voice-call-icon">📞</div>
                    <div className="voice-call-info">
                      <div className="voice-call-text">{message.text}</div>
                      <div className="voice-call-status">
                        Status: {message.callStatus}
                      </div>
                    </div>
                    <div className="voice-call-controls">
                      {message.callStatus === 'connecting' && (
                        <button 
                          className="voice-call-btn-small end-call"
                          onClick={() => handleEndVoiceCall()}
                          title="End call"
                        >
                          End
                        </button>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Enhanced Voice Call Message Display */}
                {message.type === 'voice_call_enhanced' && (
                  <div className="voice-call-enhanced-message">
                    <div className="voice-call-enhanced-header">
                      <div className="voice-call-method-icon">{message.callMethod?.icon || '📞'}</div>
                      <div className="voice-call-enhanced-info">
                        <div className="voice-call-enhanced-text">{message.text}</div>
                        <div className="voice-call-method-description">
                          {message.callMethod?.description}
                        </div>
                        <div className="voice-call-quality-info">
                          <span className="connection-quality" style={{color: connectionService.getConnectionStatus().color}}>
                            {message.callMethod?.estimated_quality} {message.connectionQuality}
                          </span>
                          {message.callMethod?.latency && (
                            <span className="latency-info">• {Math.round(message.callMethod.latency)}ms</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="voice-call-enhanced-controls">
                      <div className="call-status-indicator">
                        <div className={`status-dot ${message.callStatus}`}></div>
                        <span className="status-text">{message.callStatus}</span>
                      </div>
                      {(message.callStatus === 'connecting' || message.callStatus === 'connected') && (
                        <button 
                          className="voice-call-btn-small end-call-enhanced"
                          onClick={() => handleEndVoiceCall()}
                          title="End call"
                        >
                          End Call
                        </button>
                      )}
                    </div>
                    {message.callMethod?.note && (
                      <div className="call-method-note">
                        ℹ️ {message.callMethod.note}
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Message Timestamp with Reactions */}
              <div className="message-timestamp-with-reactions">
                <div className="message-timestamp">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </div>
                {message.reactions && message.reactions.length > 0 && (
                  <div className="message-reactions-inline">
                    {message.reactions.map((reaction, index) => (
                      <button
                        key={index}
                        className="reaction-bubble-inline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReactionAdd(message.id, reaction.emoji);
                        }}
                        title={`${reaction.emoji} ${reaction.count}`}
                      >
                        <span className="reaction-emoji">{reaction.emoji}</span>
                        <span className="reaction-count">{reaction.count}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Context-Aware Message Actions */}
              <MessageActions
                message={message}
                currentUser={user}
                onReply={(messageId) => console.log('Reply to:', messageId)}
                onReact={handleReactionAdd}
                onEdit={(messageId) => console.log('Edit message:', messageId)}
                onDelete={(messageId) => console.log('Delete message:', messageId)}
                onTranslate={(messageId) => console.log('Translate message:', messageId)}
              />
            </div>
          ))}
          {/* Auto-scroll anchor element */}
          <div ref={messagesEndRef} />
        </div>

        {/* Enhanced Input Area with Voice and File Upload */}
        <div className="pro-chat-input-container enhanced mobile-input-bar keyboard-avoiding">
          <div className="input-wrapper enhanced touch-target">
            {/* Voice Recording Interface */}
            {isRecording && (
              <div className="recording-interface">
                <div className="recording-indicator">
                  <div className="recording-dot"></div>
                  <span>Recording... {formatRecordingTime(recordingDuration)}</span>
                </div>
                <div className="recording-actions">
                  <button 
                    className="recording-btn cancel"
                    onClick={() => stopRecording(false)}
                    type="button"
                  >
                    Cancel
                  </button>
                  <button 
                    className="recording-btn send"
                    onClick={() => stopRecording(true)}
                    type="button"
                  >
                    Send
                  </button>
                </div>
              </div>
            )}

            {/* Regular Input Interface */}
            {!isRecording && (
              <>
                {/* File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,image/gif,video/*,audio/*,.pdf,.doc,.docx,.txt"
                  style={{ display: 'none' }}
                  multiple
                  onChange={handleFileChange}
                />

                {/* Mobile Camera Input - Photo */}
                <input
                  ref={mobileCameraPhotoRef}
                  id="mobile-camera-photo"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />

                {/* Mobile Camera Input - Video */}
                <input
                  ref={mobileCameraVideoRef}
                  id="mobile-camera-video"
                  type="file"
                  accept="video/*"
                  capture="environment"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />

                {/* Mobile Gallery Input */}
                <input
                  ref={mobileGalleryRef}
                  id="mobile-gallery"
                  type="file"
                  accept="image/*,video/*,image/gif"
                  style={{ display: 'none' }}
                  multiple
                  onChange={handleFileChange}
                />

                {/* Top Row - Action Icons */}
                <div className="input-actions-row">
                  {/* File Attachment Button */}
                  <button 
                    className="input-btn attachment-btn mobile-action-button touch-target touch-ripple haptic-light"
                    onClick={isMobileDevice() ? handleMobileUploadMenu : () => fileInputRef.current?.click()}
                    type="button"
                    title={isMobileDevice() ? "Upload menu" : "Attach files"}
                  >
                    📎
                  </button>

                  {/* GIF Picker Button */}
                  <button 
                    className="input-btn gif-btn mobile-action-button touch-target touch-ripple haptic-light"
                    onClick={handleShowGifPicker}
                    type="button"
                    title="Choose GIF"
                  >
                    🎭
                  </button>

                  {/* GIF Upload Button (secondary) */}
                  <button 
                    className="input-btn gif-upload-btn"
                    onClick={handleGifUpload}
                    type="button"
                    title="Upload your own GIF"
                  >
                    📤
                  </button>

                  {/* Voice Input Button */}
                  <button 
                    className="input-btn voice-btn mobile-action-button touch-target touch-ripple haptic-light"
                    onClick={startRecording}
                    type="button"
                    title="Voice message"
                  >
                    🎤
                  </button>

                  {/* Native Camera Button (Mobile) */}
                  {nativeDeviceFeaturesService.isSupported('camera') && (
                    <button 
                      className="input-btn camera-btn mobile-action-button touch-target touch-ripple haptic-light"
                      onClick={() => handleOpenNativeCamera('photo')}
                      type="button"
                      title="Take photo/video"
                    >
                      📷
                    </button>
                  )}

                  {/* Contact Picker Button (Mobile) */}
                  {nativeDeviceFeaturesService.isSupported('contacts') && (
                    <button 
                      className="input-btn contact-btn mobile-action-button touch-target touch-ripple haptic-light"
                      onClick={handleOpenContactPicker}
                      type="button"
                      title="Share contacts"
                    >
                      👥
                    </button>
                  )}

                  {/* Emoji Button */}
                  <button 
                    className="input-btn emoji-btn mobile-action-button touch-target touch-ripple haptic-light"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    type="button"
                    title="Add emoji"
                  >
                    😊
                  </button>

                  {/* Encryption Toggle */}
                  {encryptionEnabled && (
                    <button 
                      className={`input-btn encryption-btn mobile-action-button touch-target touch-ripple haptic-light ${defaultEncryption ? 'active' : ''}`}
                      onClick={() => setDefaultEncryption(!defaultEncryption)}
                      type="button"
                      title={defaultEncryption ? "Encryption enabled" : "Encryption disabled"}
                    >
                      {defaultEncryption ? '🔒' : '🔓'}
                    </button>
                  )}
                </div>

                {/* Bottom Row - Message Input and Send */}
                <div className="message-input-row">
                  {/* Text Input */}
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message..."
                    className="message-input enhanced mobile-message-input touch-target"
                    rows="1"
                    autoComplete="off"
                    autoCorrect="on"
                    autoCapitalize="sentences"
                    spellCheck="true"
                    inputMode="text"
                    aria-label="Type your message"
                    data-testid="message-input"
                  />

                  {/* Send Button */}
                  <button 
                    onClick={handleSendMessage}
                    disabled={!inputText.trim()}
                    className="send-button enhanced mobile-action-button touch-target touch-ripple haptic-light"
                    type="button"
                    aria-label="Send message"
                    title="Send message"
                    data-testid="send-button"
                  >
                    <span className="send-icon" aria-hidden="true">➤</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Emoji Picker */}
          {showEmojiPicker && (
            <div className="emoji-picker-overlay" onClick={() => setShowEmojiPicker(false)}>
              <div className="emoji-picker" onClick={(e) => e.stopPropagation()}>
                <div className="emoji-picker-header">
                  <span>Choose an emoji</span>
                  <button 
                    className="emoji-close"
                    onClick={() => setShowEmojiPicker(false)}
                  >
                    ✕
                  </button>
                </div>
                <div className="emoji-grid">
                  {['😊', '😂', '🥰', '😍', '🤔', '😮', '😅', '👍', '👎', '❤️', '🔥', '🎉', '👏', '🙌', '✨', '💯', '🚀', '💡', '🎯', '✅', '❌', '⚡', '🌟', '🤝', '💪', '🌈', '☀️', '🌙', '⭐', '💝', '🎈'].map(emoji => (
                    <button
                      key={emoji}
                      className="emoji-item"
                      onClick={() => handleEmojiClick(emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Reaction Picker for Messages */}
          {showReactionPicker && selectedMessageId && (
            <div className="emoji-picker-overlay" onClick={() => {
              setShowReactionPicker(false);
              setSelectedMessageId(null);
            }}>
              <div className="emoji-picker" onClick={(e) => e.stopPropagation()}>
                <div className="emoji-picker-header">
                  <span>Add Reaction</span>
                  <button 
                    className="emoji-close"
                    onClick={() => {
                      setShowReactionPicker(false);
                      setSelectedMessageId(null);
                    }}
                  >
                    ✕
                  </button>
                </div>
                <div className="emoji-grid">
                  {['😊', '😂', '🥰', '😍', '🤔', '😮', '😅', '👍', '👎', '❤️', '🔥', '🎉', '👏', '🙌', '✨', '💯', '🚀', '💡', '🎯', '✅', '❌', '⚡', '🌟', '🤝', '💪', '🌈', '☀️', '🌙', '⭐', '💝', '🎈'].map(emoji => (
                    <button
                      key={emoji}
                      className="emoji-item"
                      onClick={() => handleEmojiClick(emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Profile Modal */}
      {profileModal.open && (
        <UserProfileModal 
          userId={profileModal.userId}
          username={profileModal.username}
          onClose={handleCloseProfileModal}
        />
      )}

      {/* Settings Modal */}
      {settingsModal.open && (
        <SettingsModal 
          isOpen={settingsModal.open}
          onClose={handleCloseSettingsModal}
          initialSection={settingsModal.section}
          user={user}
          onSaveProfile={(updatedUser) => {
            // Handle profile updates if needed
            console.log('Profile updated:', updatedUser);
          }}
          darkMode={darkMode}
        />
      )}

      {/* Lightbox Modal */}
      {lightboxModal.open && (
        <div className="pro-lightbox-overlay" onClick={handleCloseLightbox}>
          <div className="pro-lightbox-content" onClick={(e) => e.stopPropagation()}>
            <div className="pro-lightbox-header">
              <div className="pro-lightbox-info">
                <div className="pro-lightbox-title">{lightboxModal.imageName}</div>
                <div className="pro-lightbox-meta">
                  <span className="pro-lightbox-zoom-info">
                    {Math.round(lightboxModal.zoom * 100)}%
                  </span>
                  {lightboxModal.images.length > 1 && (
                    <span className="pro-lightbox-counter">
                      {lightboxModal.currentIndex + 1} / {lightboxModal.images.length}
                    </span>
                  )}
                </div>
              </div>
              <div className="pro-lightbox-controls">
                <button 
                  className="pro-lightbox-btn" 
                  onClick={handleZoomOut}
                  title="Zoom out (-)"
                >
                  🔍-
                </button>
                <button 
                  className="pro-lightbox-btn" 
                  onClick={handleZoomReset}
                  title="Reset zoom (0)"
                >
                  ⊡
                </button>
                <button 
                  className="pro-lightbox-btn" 
                  onClick={handleZoomIn}
                  title="Zoom in (+)"
                >
                  🔍+
                </button>
                <button 
                  className="pro-lightbox-btn pro-lightbox-download" 
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = lightboxModal.imageUrl;
                    link.download = lightboxModal.imageName;
                    link.click();
                  }}
                  title="Download image"
                >
                  💾
                </button>
              </div>
              <button className="pro-lightbox-close" onClick={handleCloseLightbox}>
                ×
              </button>
            </div>
            <div 
              className="pro-lightbox-image-container"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              style={{
                cursor: lightboxModal.zoom > 1 ? (lightboxModal.isDragging ? 'grabbing' : 'grab') : 'zoom-in'
              }}
            >
              {/* Navigation Arrows */}
              {lightboxModal.images.length > 1 && (
                <>
                  <button 
                    className="pro-lightbox-nav pro-lightbox-nav-prev"
                    onClick={() => handleNavigateImage('prev')}
                    disabled={lightboxModal.currentIndex === 0}
                    title="Previous image (←)"
                  >
                    ←
                  </button>
                  <button 
                    className="pro-lightbox-nav pro-lightbox-nav-next"
                    onClick={() => handleNavigateImage('next')}
                    disabled={lightboxModal.currentIndex === lightboxModal.images.length - 1}
                    title="Next image (→)"
                  >
                    →
                  </button>
                </>
              )}
              
              <img 
                src={lightboxModal.imageUrl} 
                alt={lightboxModal.imageName}
                className={`pro-lightbox-image ${lightboxModal.isLoading ? 'loading' : 'loaded'}`}
                style={{
                  transform: `scale(${lightboxModal.zoom}) translate(${lightboxModal.pan.x}px, ${lightboxModal.pan.y}px)`,
                  transition: lightboxModal.isDragging ? 'none' : 'transform 0.3s ease',
                  opacity: lightboxModal.isLoading ? 0.3 : 1
                }}
                onLoad={handleImageLoad}
                onError={handleImageError}
                onDoubleClick={() => {
                  if (lightboxModal.zoom === 1) {
                    handleZoomIn();
                  } else {
                    handleZoomReset();
                  }
                }}
                draggable={false}
              />
              
              {/* Loading Indicator */}
              {lightboxModal.isLoading && (
                <div className="pro-lightbox-loading">
                  <div className="pro-lightbox-spinner"></div>
                  <span>Loading...</span>
                </div>
              )}
            </div>
            <div className="pro-lightbox-help">
              <span>ESC to close • Arrow keys to navigate • Mouse wheel to zoom • Drag to pan • Double-click to zoom</span>
            </div>
          </div>
        </div>
      )}

      {/* Video Lightbox Modal */}
      {videoLightboxModal.open && (
        <div className="pro-lightbox-overlay" onClick={handleCloseVideoLightbox}>
          <div className="pro-lightbox-content" onClick={(e) => e.stopPropagation()}>
            <div className="pro-lightbox-header">
              <div className="pro-lightbox-info">
                <div className="pro-lightbox-title">
                  <h3>{videoLightboxModal.videoName}</h3>
                </div>
              </div>
              <div className="pro-lightbox-controls">
                <button 
                  className="pro-lightbox-btn pro-lightbox-download" 
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = videoLightboxModal.videoUrl;
                    link.download = videoLightboxModal.videoName;
                    link.click();
                  }}
                  title="Download video"
                >
                  💾
                </button>
              </div>
              <button className="pro-lightbox-close" onClick={handleCloseVideoLightbox}>
                ×
              </button>
            </div>
            <div className="pro-lightbox-video-container">
              <video 
                src={videoLightboxModal.videoUrl}
                poster={videoLightboxModal.poster}
                controls
                autoPlay
                playsInline
                className="pro-lightbox-video"
                style={{
                  maxWidth: '100%',
                  maxHeight: '80vh',
                  width: 'auto',
                  height: 'auto'
                }}
              >
                <source src={videoLightboxModal.videoUrl} type={videoLightboxModal.type} />
                Your browser does not support the video tag.
              </video>
            </div>
            <div className="pro-lightbox-help">
              <span>ESC to close • Click outside to close • Download available</span>
            </div>
          </div>
        </div>
      )}

      {/* GIF Picker Modal */}
      <GifPicker
        isOpen={showGifPicker}
        onGifSelect={handleGifSelect}
        onClose={handleCloseGifPicker}
      />

      {/* New Chat Modal */}
      <NewChatModal
        isOpen={newChatModal}
        onClose={() => setNewChatModal(false)}
        onCreateChat={handleCreateChat}
        currentUser={user}
        darkMode={darkMode}
      />

      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={feedbackModal}
        onClose={() => setFeedbackModal(false)}
        onSubmit={handleFeedbackSubmit}
      />

      {/* Help Modal */}
      <HelpModal
        isOpen={helpModal}
        onClose={() => setHelpModal(false)}
      />

      {/* Call Method Selector Modal */}
      {showCallMethodSelector && (
        <div className="call-method-selector-overlay">
          <div className="call-method-selector-modal">
            <div className="call-method-header">
              <h3>Choose Call Method</h3>
              <button 
                className="close-btn"
                onClick={() => setShowCallMethodSelector(false)}
              >
                ×
              </button>
            </div>
            <div className="call-method-list">
              {availableCallMethods.map((method, index) => (
                <div 
                  key={index}
                  className={`call-method-option ${method.quality}`}
                  onClick={() => {
                    const currentUser = currentSelectedConversation || currentConversation;
                    startEnhancedVoiceCall(currentUser, method.type);
                  }}
                >
                  <div className="method-icon">{method.icon}</div>
                  <div className="method-info">
                    <div className="method-title">{method.description}</div>
                    <div className="method-quality">{method.estimated_quality}</div>
                    {method.targetPhone && (
                      <div className="method-phone">📱 {method.targetPhone}</div>
                    )}
                    {method.note && (
                      <div className="method-note">{method.note}</div>
                    )}
                    {method.estimatedLatency && (
                      <div className="method-latency">⚡ {Math.round(method.estimatedLatency)}ms</div>
                    )}
                  </div>
                  <div className="method-quality-badge">
                    {method.quality}
                  </div>
                </div>
              ))}
            </div>
            <div className="connection-info">
              <div className="current-connection">
                📶 Current: {connectionService.getConnectionStatus().quality} 
                ({connectionService.getConnectionStatus().type})
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Native Camera Component */}
      {showNativeCamera && (
        <NativeCamera
          mode={nativeCameraMode}
          onCapture={handleCameraCapture}
          onClose={handleCloseNativeCamera}
        />
      )}

      {/* Native Contact Picker Component */}
      {showContactPicker && (
        <NativeContactPicker
          onContactSelect={handleContactSelect}
          onClose={handleCloseContactPicker}
        />
      )}

      {/* Contact Manager Component */}
      {showContactManager && (
        <ContactManager
          isOpen={showContactManager}
          onClose={() => setShowContactManager(false)}
          onStartChat={handleContactToChat}
          onStartCall={handleContactCall}
          currentUser={user}
          darkMode={darkMode}
        />
      )}
    </div>
  );
};

// PropTypes
ProChat.propTypes = {
  user: PropTypes.object,
  conversations: PropTypes.array,
  currentConversation: PropTypes.object,
  onLogout: PropTypes.func,
  darkMode: PropTypes.bool,
  onToggleDarkMode: PropTypes.func
};

export default ProChat;