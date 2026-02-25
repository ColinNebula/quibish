import React, { useState, useCallback, useMemo, useRef, useEffect, useLayoutEffect } from 'react';
import ReactDOM from 'react-dom';
import { useAuth } from '../../context/AuthContext';
import persistentStorageService from '../../services/persistentStorageService';
import UserProfileModal from '../UserProfile/UserProfileModal';
import SettingsModal from './SettingsModal';
// import VideoCall from './VideoCall'; // Temporarily disabled
import GifPicker from '../GifPicker/GifPicker';
import NewChatModal from '../NewChat/NewChatModal';  
import FeedbackModal from './FeedbackModal';
import HelpModal from './HelpModal';
import NativeCamera from '../Camera/NativeCamera';
import NativeContactPicker from '../Contacts/NativeContactPicker';
import ContactManager from '../Contacts/ContactManager';
import UserSearchModal from '../Search/UserSearchModal';
import AdvancedSearchModal from '../Search/AdvancedSearchModal';
import SmartRepliesPanel from '../AI/SmartRepliesPanel';
import AIEnhancementPanel from '../AI/AIEnhancementPanel';
import InternationalDialer from '../Dialer/InternationalDialer';
import ThreadView from '../Thread/ThreadView';
import ThreadIndicator from '../Thread/ThreadIndicator';
import DonationModal from '../Donation/DonationModal';
import DonationPrompt from '../Donation/DonationPrompt';
import NotificationSettings from '../NotificationSettings/NotificationSettings';
import VoiceRecorder, { VoiceMessagePlayer } from '../VoiceRecorder';
import FileSharePanel from '../FileSharePanel';
import FilePreview from '../FilePreview';
import VideoCallPanel from '../VideoCallPanel';
import messageService from '../../services/messageService';
import searchService from '../../services/searchService';
import aiService from '../../services/aiService';
import messageThreadService from '../../services/messageThreadService';
import encryptedMessageService from '../../services/encryptedMessageService';
import enhancedVoiceCallService from '../../services/enhancedVoiceCallService';
import enhancedVideoCallService from '../../services/enhancedVideoCallService';
import connectionService from '../../services/connectionService';
import { buildApiUrl } from '../../config/api';
import nativeDeviceFeaturesService from '../../services/nativeDeviceFeaturesService';
import pushNotificationService from '../../services/pushNotificationService';
import { feedbackService } from '../../services/feedbackService';
import { contactService } from '../../services/contactService';
import { conversationService } from '../../services/conversationService';
import realtimeService from '../../services/realtimeService';

// All service implementations are now properly imported above

import PropTypes from 'prop-types';

// CSS imports
import './ProLayout.css';
import './ProMessages.css';
import '../../styles/DynamicBackground.css';
import './ProSidebar.css';
import './ProHeader.css';
import './ProChat.css';
import './SearchHighlight.css';
import './ResponsiveFix.css';
import './EncryptionStyles.css';
import './ProChatThreading.css';
import '../../styles/sidebar-simplified.css';
import '../../styles/input-click-fix.css';
import './NewsFeedModal.css';
import NotificationCenter from '../NotificationCenter/NotificationCenter';
import NotificationButton from '../NotificationCenter/NotificationButton';
import NotificationPermissionPrompt from '../NotificationPermissionPrompt';
import notificationService from '../../services/notificationService';
import { NewsFeed } from '../Social';

const ProChat = ({ 
  user: propUser = { id: 'user1', name: 'Current User', avatar: null },
  conversations: initialConversations = [],
  currentConversation = null,
  onLogout = () => {},
  darkMode = false,
  onToggleDarkMode = () => {}
}) => {
  // Get authenticated user from context
  const { user: authUser, updateUser, isAuthenticated } = useAuth();
  
  // Use authenticated user if available, otherwise fall back to prop user
  const user = authUser || propUser;
  
  // Ensure user data is saved to persistent storage
  useEffect(() => {
    if (user && user.id) {
      persistentStorageService.updateUserData(user);
      console.log('💾 User data synced to persistent storage');
    }
  }, [user]);

  // ── Real-time service: connect/disconnect lifecycle ──
  useEffect(() => {
    if (!user?.id) return;

    realtimeService.connect(user.id, user.name || user.username || 'User');

    // Attach the notification service to the shared WS so it can receive
    // real-time message & post notifications without a second connection.
    notificationService.attachRealtime(realtimeService);

    const offConnect = realtimeService.on('connect', () => setIsConnected(true));
    const offDisconnect = realtimeService.on('disconnect', () => setIsConnected(false));

    // Incoming message from another user
    const offMessage = realtimeService.on('message', (msg) => {
      setChatMessages(prev => {
        // Deduplicate by id
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, {
          id: msg.id,
          text: msg.text,
          user: { id: msg.senderId, name: msg.senderName },
          timestamp: msg.timestamp,
          reactions: [],
          conversationId: msg.conversationId
        }];
      });
    });

    // Presence updates
    const offPresence = realtimeService.on('presence', (data) => {
      setConversations(prev => prev.map(c => {
        if (String(c.id) === String(data.userId) || c.participants?.includes?.(data.userId)) {
          return { ...c, isOnline: data.online };
        }
        return c;
      }));
    });

    // Typing indicator
    const offTyping = realtimeService.on('typing', ({ fromUsername }) => {
      setTypingUser(fromUsername);
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => setTypingUser(null), 3000);
    });

    return () => {
      offConnect();
      offDisconnect();
      offMessage();
      offPresence();
      offTyping();
      clearTimeout(typingTimerRef.current);
      realtimeService.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Basic state — real-time connection status
  const [isConnected, setIsConnected] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    // Initialize sidebar based on screen size
    if (typeof window !== 'undefined') {
      return window.innerWidth <= 768; // Collapsed on mobile by default
    }
    return false;
  });
  
  // Conversation management
  const [conversations, setConversations] = useState(() => {
    // Initialize conversations from service or use provided ones
    const serviceConversations = conversationService.getAllConversations();
    if (serviceConversations.length > 0) {
      return serviceConversations;
    } else if (initialConversations.length > 0) {
      return initialConversations;
    } else {
      // Initialize with default conversations for new users
      conversationService.initializeDefaultConversations();
      return conversationService.getAllConversations();
    }
  });
  
  const [selectedConversation, setSelectedConversation] = useState(conversations[0]?.id || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState('conversations'); // 'conversations' or 'users'
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  
  // Enhanced sidebar state
  const [sortBy, setSortBy] = useState('recent'); // 'recent', 'unread', 'alphabetical', 'custom'
  const [groupByDate, setGroupByDate] = useState(true);
  const [draggedConversation, setDraggedConversation] = useState(null);
  const [contextMenuState, setContextMenuState] = useState({ visible: false, x: 0, y: 0, conversation: null });
  const [batchSelectMode, setBatchSelectMode] = useState(false);
  const [selectedConversations, setSelectedConversations] = useState(new Set());
  const [hoveredConversation, setHoveredConversation] = useState(null);
  
  // Enhanced input state
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  
  // Notification system state
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  // Mobile global voice modal removed - using internet-based calling only
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
  
  // Advanced search state
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);
  
  // International dialer state
  const [showCallOptions, setShowCallOptions] = useState(false);
  const [showInternationalDialer, setShowInternationalDialer] = useState(false);

  // Donation modal state
  const [showDonationModal, setShowDonationModal] = useState(false);

  // AI Features state
  const [showSmartReplies, setShowSmartReplies] = useState(false);
  const [smartReplies, setSmartReplies] = useState([]);
  const [showAIEnhancement, setShowAIEnhancement] = useState(false);
  const [currentMessageForAI, setCurrentMessageForAI] = useState('');

  // Threading state
  const [activeThread, setActiveThread] = useState(null);
  const [showThreadView, setShowThreadView] = useState(false);
  const [threads, setThreads] = useState(new Map());

  // File Sharing state
  const [showFileShare, setShowFileShare] = useState(false);
  const [showFilePreview, setShowFilePreview] = useState(false);
  const [selectedFileId, setSelectedFileId] = useState(null);

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

  // Touch gesture state for mobile sidebar
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  
  // Refs
  const fileInputRef = useRef(null);
  const mobileCameraPhotoRef = useRef(null);
  const mobileCameraVideoRef = useRef(null);
  const mobileGalleryRef = useRef(null);
  const messagesEndRef = useRef(null);
  const sidebarRef = useRef(null);
  const messagesContainerRef = useRef(null);

  // Inject definitive mobile layout fix at runtime — sits after ALL webpack CSS so it unconditionally wins the cascade
  useLayoutEffect(() => {
    const id = 'quibish-layout-fix';
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement('style');
      el.id = id;
      document.head.appendChild(el);
    }
    el.textContent = [
      '@media screen and (max-width: 768px) {',
      '  html body .pro-layout { height: 100vh !important; height: 100dvh !important; display: flex !important; flex-direction: column !important; overflow: hidden !important; padding: 0 !important; gap: 0 !important; }',
      '  html body .pro-main { flex: 1 1 0% !important; min-height: 0 !important; height: auto !important; max-height: none !important; display: flex !important; flex-direction: column !important; overflow: hidden !important; padding: 0 !important; margin: 0 !important; gap: 0 !important; }',
      '  html body .pro-main .enhanced-chat-header, html body .pro-main .pro-header { flex: 0 0 auto !important; position: relative !important; top: auto !important; height: auto !important; min-height: calc(env(safe-area-inset-top, 0px) + 56px) !important; max-height: none !important; padding: calc(env(safe-area-inset-top, 0px) + 8px) 12px 8px !important; margin: 0 !important; border-radius: 0 !important; box-shadow: none !important; background: #ffffff !important; }',
      '  html body .pro-main .pro-content { flex: 1 1 0% !important; min-height: 0 !important; height: auto !important; max-height: none !important; display: flex !important; flex-direction: column !important; overflow: hidden !important; padding: 0 !important; margin: 0 !important; border-radius: 0 !important; box-shadow: none !important; border: none !important; backdrop-filter: none !important; background: #f5f5f5 !important; gap: 0 !important; }',
      '  html body .pro-main .pro-message-list { flex: 1 1 0% !important; min-height: 0 !important; height: 0 !important; max-height: none !important; overflow-y: auto !important; overflow-x: hidden !important; padding: 12px 16px 20px !important; box-sizing: border-box !important; margin: 0 !important; border-radius: 0 !important; background: #f5f5f5 !important; }',
      '  html body .pro-main .pro-chat-input-container { flex: 0 0 auto !important; position: relative !important; bottom: auto !important; left: auto !important; right: auto !important; margin: 0 !important; padding-bottom: max(8px, env(safe-area-inset-bottom, 0px)) !important; }',
      '}'
    ].join('\n');
  }, []);

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
        
        // Try to load from persistent storage as fallback
        try {
          const cachedMessages = persistentStorageService.getMessages();
          if (Array.isArray(cachedMessages) && cachedMessages.length > 0) {
            setChatMessages(cachedMessages);
            console.log('📱 Loaded messages from persistent storage');
          }
        } catch (storageError) {
          console.error('❌ Failed to load from persistent storage:', storageError);
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

  // Initialize push notifications and presence detection
  useEffect(() => {
    const initializeNotifications = async () => {
      try {
        console.log('🔔 Initializing notification system...');
        
        // Initialize push notification service
        const notificationInit = await pushNotificationService.initialize(user.id);
        
        if (notificationInit) {
          console.log('✅ Push notification service initialized');
          
          // Setup presence detection
          pushNotificationService.setupPresenceDetection();
          
          // Update user as online on backend
          try {
            await fetch(buildApiUrl('/notifications/presence'), {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                userId: user.id,
                isOnline: true,
                lastSeen: new Date().toISOString()
              })
            });
            console.log('✅ User presence set to online');
          } catch (presenceError) {
            console.warn('⚠️ Failed to update presence:', presenceError);
          }
        }
      } catch (error) {
        console.error('❌ Failed to initialize notifications:', error);
      }
    };

    if (user?.id) {
      initializeNotifications();
    }

    // Cleanup on unmount
    return () => {
      // Update user as offline
      if (user?.id) {
        fetch(buildApiUrl('/notifications/presence'), {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            userId: user.id,
            isOnline: false,
            lastSeen: new Date().toISOString()
          })
        }).catch(error => {
          console.warn('⚠️ Failed to update offline presence:', error);
        });
      }
    };
  }, [user?.id]);

  // Initialize search index on mount
  useEffect(() => {
    const initializeSearchIndex = async () => {
      try {
        console.log('🔍 Initializing search index...');
        
        // Build search index from existing messages
        const messages = persistentStorageService.getMessages();
        await searchService.buildSearchIndex(messages);
        
        console.log('✅ Search index built successfully');
        
        // Notify service worker to build background index
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          try {
            navigator.serviceWorker.controller.postMessage({
              type: 'INDEX_MESSAGES'
            });
          } catch (error) {
            console.warn('SW message failed:', error);
          }
        }
      } catch (error) {
        console.error('❌ Failed to initialize search index:', error);
      }
    };

    initializeSearchIndex();
  }, []);

  // Handle notification quick reply URL parameters
  useEffect(() => {
    const handleNotificationAction = () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const action = urlParams.get('action');
        const conversationId = urlParams.get('conversation');
        const messageId = urlParams.get('message');

        if (action === 'reply' && conversationId) {
          console.log('📬 Opening conversation from notification:', conversationId);
          
          // Find and select the conversation
          const conversation = conversations.find(c => c.id === conversationId);
          if (conversation) {
            setSelectedConversation(conversationId);
            
            // Expand sidebar on mobile if needed to show the conversation
            if (window.innerWidth <= 768) {
              setSidebarCollapsed(false);
            }
            
            // Focus the message input after a short delay
            setTimeout(() => {
              const messageInput = document.querySelector('.pro-message-input');
              if (messageInput) {
                messageInput.focus();
                messageInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                console.log('✅ Quick reply ready - input focused');
              }
            }, 500);

            // If messageId is provided, scroll to that message
            if (messageId) {
              setTimeout(() => {
                const messageElement = document.getElementById(`message-${messageId}`);
                if (messageElement) {
                  messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  console.log('✅ Scrolled to message:', messageId);
                }
              }, 700);
            }
          } else {
            console.warn('⚠️ Conversation not found:', conversationId);
          }

          // Clean up URL parameters
          const newUrl = window.location.pathname;
          window.history.replaceState({}, document.title, newUrl);
        } else if (conversationId && !action) {
          // Just open conversation (from "Open Chat" action)
          console.log('💬 Opening conversation:', conversationId);
          const conversation = conversations.find(c => c.id === conversationId);
          if (conversation) {
            setSelectedConversation(conversationId);
            
            // Expand sidebar on mobile
            if (window.innerWidth <= 768) {
              setSidebarCollapsed(false);
            }
          }

          // Clean up URL parameters
          const newUrl = window.location.pathname;
          window.history.replaceState({}, document.title, newUrl);
        }
      } catch (error) {
        console.error('❌ Error handling notification action:', error);
      }
    };

    // Run on mount
    handleNotificationAction();

    // Listen for service worker messages (when notification clicked while app is open)
    const handleServiceWorkerMessage = (event) => {
      if (event.data && event.data.type === 'NOTIFICATION_CLICK') {
        const { action, conversationId, messageId } = event.data;
        
        if (action === 'reply' && conversationId) {
          const conversation = conversations.find(c => c.id === conversationId);
          if (conversation) {
            setSelectedConversation(conversationId);
            
            setTimeout(() => {
              const messageInput = document.querySelector('.pro-message-input');
              if (messageInput) {
                messageInput.focus();
              }
            }, 300);
          }
        } else if (conversationId) {
          setSelectedConversation(conversationId);
        }
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
      
      return () => {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      };
    }
  }, [conversations]);

  // Add keyboard shortcuts (including Ctrl+F for search)
  useEffect(() => {
    const handleKeyboardShortcuts = (e) => {
      // Ctrl+F or Cmd+F - Open advanced search
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setShowAdvancedSearch(true);
      }
      
      // Escape - Close modals
      if (e.key === 'Escape') {
        if (showAdvancedSearch) {
          setShowAdvancedSearch(false);
        } else if (showMoreMenu) {
          setShowMoreMenu(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyboardShortcuts);
    return () => window.removeEventListener('keydown', handleKeyboardShortcuts);
  }, [showAdvancedSearch, showMoreMenu]);

  // Auto-collapse sidebar on mobile screens (but preserve content)
  useEffect(() => {
    const handleResize = () => {
      // Only auto-collapse on mobile screens (≤768px) - sidebar becomes overlay
      if (window.innerWidth <= 768) {
        setSidebarCollapsed(true);
        // Mobile global voice modal removed
      } else if (window.innerWidth > 768) {
        // Auto-expand on larger screens (desktop view)
        setSidebarCollapsed(false);
      }
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

  // Touch gesture handlers for mobile sidebar
  const handleTouchStart = useCallback((e) => {
    if (window.innerWidth <= 768) {
      setTouchEnd(null);
      setTouchStart(e.targetTouches[0].clientX);
    }
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (window.innerWidth <= 768) {
      setTouchEnd(e.targetTouches[0].clientX);
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;
    
    // On mobile, swipe left to close sidebar, swipe right to open
    if (window.innerWidth <= 768) {
      if (isLeftSwipe && !sidebarCollapsed) {
        setSidebarCollapsed(true);
      } else if (isRightSwipe && sidebarCollapsed) {
        setSidebarCollapsed(false);
      }
    }
    
    // Reset touch state
    setTouchStart(null);
    setTouchEnd(null);
  }, [touchStart, touchEnd, sidebarCollapsed]);

  // Close sidebar when clicking outside on mobile
  const handleOverlayClick = useCallback(() => {
    if (window.innerWidth <= 480) {
      setSidebarCollapsed(true);
    }
  }, []);

  const handleConversationSelect = useCallback(async (conversationId) => {
    if (!conversationId) {
      console.warn('Invalid conversation ID provided');
      return;
    }

    // Check if the conversation exists
    const conversation = conversations.find(conv => conv.id === conversationId);
    if (!conversation) {
      console.warn('Conversation not found:', conversationId);
      setMessagesError('Conversation not found');
      return;
    }

    setSelectedConversation(conversationId);
    
    // Load messages for the selected conversation
    try {
      setMessagesLoading(true);
      setMessagesError(null);
      
      console.log('Loading messages for conversation:', conversation.name, conversationId);
      
      // Load messages from the message service for this conversation
      const conversationMessages = await messageService.getMessages({ 
        conversationId: conversationId,
        limit: 50 
      });
      
      if (Array.isArray(conversationMessages)) {
        setChatMessages(conversationMessages);
        console.log('Loaded conversation messages:', conversationMessages.length);
        
        // Mark conversation as read if it had unread messages
        if (conversation.unreadCount > 0) {
          console.log('Marked conversation as read:', conversation.name);
        }
        
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
      
      // Auto-collapse sidebar on mobile after selection
      if (window.innerWidth <= 768) {
        setSidebarCollapsed(true);
      }
    }
  }, [conversations, messageService, scrollToBottom]);

  const handleSearchChange = useCallback((e) => {
    try {
      const value = e?.target?.value || '';
      setSearchQuery(value);
    } catch (error) {
      console.error('Error handling search change:', error);
      setSearchQuery('');
    }
  }, []);

  // Handle search mode toggle
  const handleToggleSearchMode = useCallback(() => {
    const newMode = searchMode === 'conversations' ? 'users' : 'conversations';
    setSearchMode(newMode);
    setSearchQuery(''); // Clear search when switching modes
    
    if (newMode === 'users') {
      setShowUserSearch(true);
    }
  }, [searchMode]);

  // Handle user search
  const handleUserSearchClick = useCallback(() => {
    setSearchMode('users');
    setShowUserSearch(true);
    if (window.innerWidth <= 768) setSidebarCollapsed(true);
  }, []);

  // Handle user selection from search
  const handleUserSelect = useCallback(async (selectedUser) => {
    console.log('User selected for chat:', selectedUser);
    
    try {
      // Create or find existing conversation with the selected user
      const result = conversationService.createConversationWithUser(selectedUser, user.id);
      
      if (result.success) {
        // Update conversations state
        const updatedConversations = conversationService.getAllConversations();
        setConversations(updatedConversations);
        
        // Select the conversation (new or existing)
        setSelectedConversation(result.conversation.id);
        
        // Close the user search modal
        setShowUserSearch(false);
        
        // Show feedback to user
        if (result.isNew) {
          console.log(`✅ Started new chat with ${selectedUser.name || selectedUser.username}`);
          // You could show a toast notification here
        } else {
          console.log(`✅ Opened existing chat with ${selectedUser.name || selectedUser.username}`);
        }
        
        // Scroll to top of conversation
        setTimeout(() => {
          const conversationContainer = document.querySelector('.pro-chat-container');
          if (conversationContainer) {
            conversationContainer.scrollTop = 0;
          }
        }, 100);
        
        return Promise.resolve(result);
        
      } else {
        console.error('Failed to create conversation:', result.error);
        return Promise.reject(new Error('Failed to start chat. Please try again.'));
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
      return Promise.reject(error);
    }
  }, [user.id]);

  // Sync with conversation service updates
  useEffect(() => {
    const handleConversationUpdate = (updatedConversations) => {
      setConversations(updatedConversations);
    };

    // Subscribe to conversation service updates
    conversationService.subscribe(handleConversationUpdate);

    return () => {
      // Cleanup subscription on unmount
      conversationService.subscribe(null);
    };
  }, []);

  // Update conversation service when conversations change
  useEffect(() => {
    if (conversations.length > 0) {
      conversationService.conversations = conversations;
      conversationService.saveConversationsToStorage();
    }
  }, [conversations]);

  // Enhanced sidebar handlers
  const handleDragStart = useCallback((e, conversation) => {
    setDraggedConversation(conversation);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', conversation.id);
    e.currentTarget.classList.add('dragging');
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback((e, targetConversation) => {
    e.preventDefault();
    if (!draggedConversation || draggedConversation.id === targetConversation.id) return;

    const draggedIndex = conversations.findIndex(c => c.id === draggedConversation.id);
    const targetIndex = conversations.findIndex(c => c.id === targetConversation.id);

    const newConversations = [...conversations];
    newConversations.splice(draggedIndex, 1);
    newConversations.splice(targetIndex, 0, draggedConversation);

    setConversations(newConversations);
    setDraggedConversation(null);
    
    // Save custom order
    setSortBy('custom');
  }, [draggedConversation, conversations]);

  const handleDragEnd = useCallback((e) => {
    e.currentTarget.classList.remove('dragging');
    setDraggedConversation(null);
  }, []);

  const handleContextMenu = useCallback((e, conversation) => {
    e.preventDefault();
    setContextMenuState({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      conversation
    });
  }, []);

  const handleCloseContextMenu = useCallback(() => {
    setContextMenuState({ visible: false, x: 0, y: 0, conversation: null });
  }, []);

  const handlePinConversation = useCallback((conversationId) => {
    setConversations(prev => prev.map(conv => 
      conv.id === conversationId 
        ? { ...conv, isPinned: !conv.isPinned }
        : conv
    ));
    handleCloseContextMenu();
  }, [handleCloseContextMenu]);

  const handleMuteConversation = useCallback((conversationId) => {
    setConversations(prev => prev.map(conv => 
      conv.id === conversationId 
        ? { ...conv, isMuted: !conv.isMuted }
        : conv
    ));
    handleCloseContextMenu();
  }, [handleCloseContextMenu]);

  const handleArchiveConversation = useCallback((conversationId) => {
    setConversations(prev => prev.map(conv => 
      conv.id === conversationId 
        ? { ...conv, isArchived: !conv.isArchived }
        : conv
    ));
    handleCloseContextMenu();
  }, [handleCloseContextMenu]);

  const handleDeleteConversation = useCallback((conversationId) => {
    if (window.confirm('Are you sure you want to delete this conversation?')) {
      setConversations(prev => prev.filter(conv => conv.id !== conversationId));
      if (selectedConversation === conversationId) {
        setSelectedConversation(conversations[0]?.id || null);
      }
    }
    handleCloseContextMenu();
  }, [selectedConversation, conversations, handleCloseContextMenu]);

  const handleMarkAsRead = useCallback((conversationId) => {
    setConversations(prev => prev.map(conv => 
      conv.id === conversationId 
        ? { ...conv, unreadCount: 0 }
        : conv
    ));
    handleCloseContextMenu();
  }, [handleCloseContextMenu]);

  const toggleBatchSelect = useCallback(() => {
    setBatchSelectMode(prev => !prev);
    setSelectedConversations(new Set());
  }, []);

  const handleBatchToggle = useCallback((conversationId) => {
    setSelectedConversations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(conversationId)) {
        newSet.delete(conversationId);
      } else {
        newSet.add(conversationId);
      }
      return newSet;
    });
  }, []);

  const handleBatchMarkRead = useCallback(() => {
    setConversations(prev => prev.map(conv => 
      selectedConversations.has(conv.id)
        ? { ...conv, unreadCount: 0 }
        : conv
    ));
    setSelectedConversations(new Set());
    setBatchSelectMode(false);
  }, [selectedConversations]);

  const handleBatchArchive = useCallback(() => {
    setConversations(prev => prev.map(conv => 
      selectedConversations.has(conv.id)
        ? { ...conv, isArchived: true }
        : conv
    ));
    setSelectedConversations(new Set());
    setBatchSelectMode(false);
  }, [selectedConversations]);

  const handleBatchDelete = useCallback(() => {
    if (window.confirm(`Delete ${selectedConversations.size} conversations?`)) {
      setConversations(prev => prev.filter(conv => !selectedConversations.has(conv.id)));
      setSelectedConversations(new Set());
      setBatchSelectMode(false);
    }
  }, [selectedConversations]);

  // Close context menu on click outside
  useEffect(() => {
    if (contextMenuState.visible) {
      const handleClick = () => handleCloseContextMenu();
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [contextMenuState.visible, handleCloseContextMenu]);

  const handleFilterChange = useCallback((filter) => {
    setActiveFilter(filter);
    if (window.innerWidth <= 768) setSidebarCollapsed(true);
  }, []);

  const handleNewChat = useCallback(() => {
    setNewChatModal(true);
    if (window.innerWidth <= 768) setSidebarCollapsed(true);
  }, []);

  const handleCreateGroup = useCallback(() => {
    // Open new chat modal in group mode
    setNewChatModal(true);
    console.log('Create group clicked - opening new chat modal');
  }, []);

  const handleCreateChat = useCallback(async (conversation) => {
    try {
      console.log('New chat created:', conversation);
      
      // In a real app, the conversation is already created by the API
      // Format it for the UI
      const newConversation = {
        id: conversation.id || `conv_${Date.now()}`,
        name: conversation?.name || conversation?.participants?.find(p => p?.id !== user?.id)?.name || 'New Chat',
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
          : conversation?.participants?.find(p => p?.id !== user?.id)?.avatar
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
    console.log('⚙️ Settings button clicked!');
    setSettingsModal({ open: true, section: 'general' });
    console.log('✅ Settings modal state set to open');
    // Collapse sidebar on mobile and tablet to avoid obstruction
    if (window.innerWidth <= 1024) {
      setSidebarCollapsed(true);
    }
  }, []);

  // Enhanced input functions with WebAssembly image optimization
  const handleFileChange = useCallback(async (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      for (const file of Array.from(files)) {
        console.log('Processing file:', file.name, file.type); // Debug log
        
        if (file.type.startsWith('image/')) {
          // Handle image files with WebAssembly optimization
          try {
            // Import image processor dynamically
            const imageProcessor = (await import('../../services/imageProcessorService')).default;
            
            // Optimize image for chat (max 1920x1080, 85% quality)
            const optimizedBlob = await imageProcessor.optimizeChatImage(file);
            
            // Show optimization stats
            const reduction = ((1 - optimizedBlob.size / file.size) * 100).toFixed(1);
            console.log(`📸 Image optimized: ${(file.size / 1024).toFixed(0)}KB → ${(optimizedBlob.size / 1024).toFixed(0)}KB (${reduction}% smaller)`);
            
            // Read optimized image
            const reader = new FileReader();
            reader.onload = (event) => {
              console.log('Optimized image loaded, creating message'); // Debug log
              const newMessage = {
                id: Date.now() + Math.random(),
                text: `📸 ${file.name} (optimized)`,
                user: user,
                timestamp: new Date().toISOString(),
                reactions: [],
                file: {
                  name: file.name,
                  size: optimizedBlob.size,
                  originalSize: file.size,
                  type: file.type,
                  url: event.target.result,
                  optimized: true
                }
              };
              setChatMessages(prev => [...prev, newMessage]);
              // Auto-scroll to the new message
              setTimeout(() => {
                scrollToBottom();
              }, 100);
            };
            reader.onerror = (error) => {
              console.error('Error reading optimized file:', error);
            };
            reader.readAsDataURL(optimizedBlob);
            
          } catch (error) {
            console.warn('Image optimization failed, using original:', error);
            // Fallback to original processing
            const reader = new FileReader();
            reader.onload = (event) => {
              const newMessage = {
                id: Date.now() + Math.random(),
                text: `📷 ${file.name}`,
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
              setTimeout(() => scrollToBottom(), 100);
            };
            reader.readAsDataURL(file);
          }
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
      }
      
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

  // Global call functionality removed - using internet-based calling only

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
    if (window.innerWidth <= 768) setSidebarCollapsed(true);
    document.body.classList.add('contact-manager-open');
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

  // Handle search in chat - Now uses Advanced Search Modal
  const handleSearchInChat = useCallback(() => {
    setShowAdvancedSearch(true);
    setShowMoreMenu(false);
  }, []);

  // Handle search result selection
  const handleSearchResultSelect = useCallback((result) => {
    console.log('Search result selected:', result);
    
    // Switch to the conversation containing the result
    if (result.conversationId && result.conversationId !== selectedConversation) {
      setSelectedConversation(result.conversationId);
    }
    
    // Highlight the message in the chat
    setHighlightedMessageId(result.messageId);
    
    // Scroll to the message after a short delay to allow rendering
    setTimeout(() => {
      const messageElement = document.getElementById(`message-${result.messageId}`);
      if (messageElement) {
        messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Remove highlight after 3 seconds
        setTimeout(() => {
          setHighlightedMessageId(null);
        }, 3000);
      }
    }, 300);
  }, [selectedConversation]);

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
      // Check if the click is outside the header menu container
      if (showMoreMenu && 
          !event.target.closest('.header-menu') && 
          !event.target.classList.contains('menu-btn') &&
          !event.target.classList.contains('action-btn')) {
        console.log('Closing menu due to outside click');
        setShowMoreMenu(false);
      }
    };
    
    // Use a small timeout to prevent immediate conflict with the button click
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 100);
    
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showMoreMenu]);

  // Handle adding reactions to messages
  const handleReactionAdd = useCallback(async (messageId, emoji) => {
    // Update local state immediately for responsive UI
    setChatMessages(prev => prev.map(message => {
      if (message.id === messageId) {
        const existingReaction = message?.reactions?.find(r => r?.emoji === emoji);
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

  // Voice recording functions with enhanced recorder
  const formatRecordingTime = useCallback((ms) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const handleVoiceRecordingStart = useCallback((data) => {
    setIsRecording(true);
    setShowEmojiPicker(false);
    console.log('Enhanced voice recording started', data);
  }, []);

  const handleVoiceRecordingComplete = useCallback((data) => {
    setIsRecording(false);
    
    if (data && data.audioBlob && data.duration > 1000) {
      // Create audio URL for playback
      const audioUrl = URL.createObjectURL(data.audioBlob);
      
      const newMessage = {
        id: Date.now(),
        text: `🎤 Voice message (${formatRecordingTime(data.duration)})`,
        user: user,
        timestamp: new Date().toISOString(),
        reactions: [],
        type: 'voice',
        duration: data.duration,
        audioUrl: audioUrl,
        audioBlob: data.audioBlob,
        mimeType: data.mimeType
      };
      
      setChatMessages(prev => [...prev, newMessage]);
      
      // Auto-scroll to the new message
      setTimeout(() => {
        scrollToBottom();
      }, 100);
      
      console.log('Voice message sent:', data);
    }
  }, [formatRecordingTime, user, scrollToBottom]);

  const handleVoiceRecordingCancel = useCallback(() => {
    setIsRecording(false);
    console.log('Voice recording cancelled');
  }, []);

  // Legacy functions for compatibility
  const startRecording = useCallback(() => {
    // This will be handled by the VoiceRecorder component
    console.log('startRecording called - handled by VoiceRecorder component');
  }, []);

  const stopRecording = useCallback((send = true) => {
    // This will be handled by the VoiceRecorder component
    console.log('stopRecording called - handled by VoiceRecorder component');
  }, []);

  // Legacy cleanup (no longer needed with enhanced voice recorder)
  useEffect(() => {
    return () => {
      // Cleanup handled by VoiceRecorder component
    };
  }, []);

  // Filter conversations based on search and active filter
  const filteredConversations = useMemo(() => {
    // Ensure conversations is an array and has valid data
    if (!Array.isArray(conversations)) {
      console.warn('Conversations is not an array:', conversations);
      return [];
    }

    let filtered = conversations.filter(conv => {
      // Ensure conversation has required fields
      if (!conv || typeof conv !== 'object' || !conv.id || !conv.name) return false;
      
      // Filter out archived conversations unless in 'archived' filter
      if (conv.isArchived && activeFilter !== 'archived') return false;
      
      return true;
    });
    
    // Apply text search with null safety
    if (searchQuery?.trim()) {
      const searchTerm = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(conv => {
        const name = conv.name?.toLowerCase() || '';
        const lastMessage = conv.lastMessage?.toLowerCase() || '';
        return name.includes(searchTerm) || lastMessage.includes(searchTerm);
      });
    }
    
    // Apply filter with error handling
    try {
      switch (activeFilter) {
        case 'unread':
          filtered = filtered.filter(conv => (conv.unreadCount || 0) > 0);
          break;
        case 'groups':
          filtered = filtered.filter(conv => {
            const name = conv.name || '';
            return name.includes('Team') || name.includes('Group');
          });
          break;
        case 'archived':
          filtered = filtered.filter(conv => conv.isArchived === true);
          break;
        default:
          // 'all' - no additional filtering
          break;
      }
    } catch (error) {
      console.error('Error applying conversation filter:', error);
      // Return unfiltered results if filter fails
    }
    
    // Apply sorting
    try {
      switch (sortBy) {
        case 'unread':
          filtered.sort((a, b) => (b.unreadCount || 0) - (a.unreadCount || 0));
          break;
        case 'alphabetical':
          filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
          break;
        case 'recent':
          filtered.sort((a, b) => {
            const timeA = new Date(a.lastMessageTime || 0).getTime();
            const timeB = new Date(b.lastMessageTime || 0).getTime();
            return timeB - timeA;
          });
          break;
        case 'custom':
          // Keep custom order (no sorting)
          break;
        default:
          break;
      }
      
      // Always put pinned conversations at the top
      filtered.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return 0;
      });
    } catch (error) {
      console.error('Error sorting conversations:', error);
    }
    
    return filtered;
  }, [conversations, searchQuery, activeFilter, sortBy]);

  // Group conversations by date
  const groupedConversations = useMemo(() => {
    if (!groupByDate) {
      return { 'All Conversations': filteredConversations };
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    const groups = {
      'Today': [],
      'Yesterday': [],
      'This Week': [],
      'This Month': [],
      'Older': []
    };

    filteredConversations.forEach(conv => {
      const convDate = new Date(conv.lastMessageTime || 0);
      const convDateOnly = new Date(convDate.getFullYear(), convDate.getMonth(), convDate.getDate());

      if (convDateOnly.getTime() === today.getTime()) {
        groups['Today'].push(conv);
      } else if (convDateOnly.getTime() === yesterday.getTime()) {
        groups['Yesterday'].push(conv);
      } else if (convDateOnly >= weekAgo) {
        groups['This Week'].push(conv);
      } else if (convDateOnly >= monthAgo) {
        groups['This Month'].push(conv);
      } else {
        groups['Older'].push(conv);
      }
    });

    // Remove empty groups
    Object.keys(groups).forEach(key => {
      if (groups[key].length === 0) {
        delete groups[key];
      }
    });

    return groups;
  }, [filteredConversations, groupByDate]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (sidebarCollapsed || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      const currentIndex = filteredConversations.findIndex(c => c.id === selectedConversation);
      
      switch(e.key) {
        case 'ArrowUp':
          e.preventDefault();
          if (currentIndex > 0) {
            handleConversationSelect(filteredConversations[currentIndex - 1].id);
          }
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (currentIndex < filteredConversations.length - 1) {
            handleConversationSelect(filteredConversations[currentIndex + 1].id);
          }
          break;
        case 'Delete':
          if (selectedConversation && e.shiftKey) {
            handleDeleteConversation(selectedConversation);
          }
          break;
        case 'p':
          if (selectedConversation && e.ctrlKey) {
            e.preventDefault();
            handlePinConversation(selectedConversation);
          }
          break;
        case 'm':
          if (selectedConversation && e.ctrlKey) {
            e.preventDefault();
            handleMuteConversation(selectedConversation);
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedConversation, filteredConversations, sidebarCollapsed, handleConversationSelect, handleDeleteConversation, handlePinConversation, handleMuteConversation]);

  // Notification handlers
  const handleNotificationClick = useCallback((notification) => {
    // Handle different notification types
    switch (notification.type) {
      case 'message':
        if (notification.data.conversationId) {
          handleConversationSelect(notification.data.conversationId);
        }
        break;
      case 'friend_request':
        // Navigate to friends page or show friend request modal
        console.log('Friend request notification clicked:', notification);
        break;
      case 'video_call':
      case 'voice_call':
        // Handle call notification
        console.log('Call notification clicked:', notification);
        break;
      default:
        console.log('Notification clicked:', notification);
    }
  }, [handleConversationSelect]);

  const handleShowNotificationCenter = useCallback(() => {
    setShowNotificationCenter(true);
  }, []);

  const handleCloseNotificationCenter = useCallback(() => {
    setShowNotificationCenter(false);
  }, []);

  // Initialize notification service
  useEffect(() => {
    const handleNotificationEvent = (eventType, data) => {
      switch (eventType) {
        case 'newNotification':
          // Create system notification for new messages
          if (data.type === 'message') {
            notificationService.showBrowserNotification(data);
          }
          break;
        case 'unreadCountUpdated':
          setUnreadNotificationCount(data);
          break;
      }
    };

    const removeListener = notificationService.addEventListener(handleNotificationEvent);
    
    // Load initial data
    notificationService.getUnreadCount().then(count => {
      setUnreadNotificationCount(count);
    });
    
    return removeListener;
  }, []);

  const getFilterCounts = useMemo(() => {
    if (!Array.isArray(conversations)) {
      return { all: 0, unread: 0, groups: 0 };
    }

    try {
      return {
        all: conversations.length,
        unread: conversations.filter(conv => conv && (conv.unreadCount || 0) > 0).length,
        groups: conversations.filter(conv => {
          const name = conv?.name || '';
          return name.includes('Team') || name.includes('Group');
        }).length
      };
    } catch (error) {
      console.error('Error calculating filter counts:', error);
      return { all: conversations.length, unread: 0, groups: 0 };
    }
  }, [conversations]);

  const totalUnreadCount = useMemo(() => {
    return conversations.reduce((total, conv) => total + conv.unreadCount, 0);
  }, [conversations]);

  // chatMessages state already defined above

  const [inputText, setInputText] = useState('');
  const [typingUser, setTypingUser] = useState(null);
  const typingTimerRef = React.useRef(null);
  const typingThrottleRef = React.useRef(0);

  // Enhanced features state
  const [contactProfilePopup, setContactProfilePopup] = useState(false);
  const [profileModal, setProfileModal] = useState({ open: false, userId: null, username: null });
  const [settingsModal, setSettingsModal] = useState({ open: false, section: 'profile' });
  const [newChatModal, setNewChatModal] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState(false);
  const [helpModal, setHelpModal] = useState(false);
  const [newsFeedModal, setNewsFeedModal] = useState(false);
  const [notificationSettingsModal, setNotificationSettingsModal] = useState(false);
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

  // ── WebRTC peer connection ref for signaling ──────────
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);

  // ── Incoming call signaling via WebSocket ─────────────
  useEffect(() => {
    const offOffer = realtimeService.on('call-offer', async (data) => {
      // Another user is calling us — show their call
      const accept = window.confirm(`📞 Incoming ${data.audioOnly ? 'voice' : 'video'} call from ${data.fromUsername || 'Someone'}. Accept?`);
      if (!accept) {
        realtimeService.sendSignal('call-reject', data.fromUserId);
        return;
      }
      try {
        const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
        peerConnectionRef.current = pc;
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: !data.audioOnly }).catch(() => null);
        if (stream) {
          localStreamRef.current = stream;
          stream.getTracks().forEach(t => pc.addTrack(t, stream));
        }
        pc.onicecandidate = e => {
          if (e.candidate) realtimeService.sendSignal('ice-candidate', data.fromUserId, { candidate: e.candidate });
        };
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        realtimeService.sendSignal('call-answer', data.fromUserId, { answer });
        setVideoCallState({ active: true, withUser: { id: data.fromUserId, name: data.fromUsername }, minimized: false, audioOnly: !!data.audioOnly });
      } catch (e) {
        console.error('Failed to handle incoming call:', e);
      }
    });

    const offAnswer = realtimeService.on('call-answer', async (data) => {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.answer)).catch(console.error);
      }
    });

    const offIce = realtimeService.on('ice-candidate', async (data) => {
      if (peerConnectionRef.current && data.candidate) {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate)).catch(console.error);
      }
    });

    const offEnd = realtimeService.on('call-end', () => {
      if (peerConnectionRef.current) { peerConnectionRef.current.close(); peerConnectionRef.current = null; }
      if (localStreamRef.current) { localStreamRef.current.getTracks().forEach(t => t.stop()); localStreamRef.current = null; }
      setVideoCallState({ active: false, withUser: null, minimized: false, audioOnly: false });
      setVoiceCallState({ active: false, withUser: null, minimized: false, audioOnly: true });
    });

    return () => { offOffer(); offAnswer(); offIce(); offEnd(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Reaction system state already defined above

  // Message input handlers
  const handleSendMessage = useCallback(async () => {
    if (!inputText.trim()) return;
    
    try {
      // Get conversation participants for routing
      const conversationParticipants = currentSelectedConversation?.participants || [];
      const recipientId = conversationParticipants.find(p => String(p) !== String(user?.id)) || null;

      // ── 1. Broadcast over WebSocket for real-time delivery ──
      realtimeService.sendMessage({
        text: inputText.trim(),
        conversationId: selectedConversation,
        recipientId
      });

      // ── 2. Persist via REST (best-effort, fallback to local) ──
      const messageData = {
        text: inputText.trim(),
        conversationId: selectedConversation,
        user: user?.name || 'User'
      };
      const sentMessage = await encryptedMessageService.sendMessage(messageData, {
        encrypt: defaultEncryption && encryptionEnabled,
        recipientId,
        conversationParticipants
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
      
      // Index the new message for search
      await searchService.indexMessage(newMessage);
      
      // Notify service worker to index the message
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        try {
          navigator.serviceWorker.controller.postMessage({
            type: 'INDEX_NEW_MESSAGE',
            message: newMessage
          });
        } catch (error) {
          console.warn('SW message indexing failed:', error);
        }
      }
      
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

  // AI Feature Handlers
  const handleSmartReplySelect = useCallback((reply) => {
    setInputText(reply);
    setShowSmartReplies(false);
  }, []);

  const handleOpenAIEnhancement = useCallback(() => {
    if (inputText.trim()) {
      setCurrentMessageForAI(inputText);
      setShowAIEnhancement(true);
    }
  }, [inputText]);

  const handleAIEnhance = useCallback((enhancedText) => {
    setInputText(enhancedText);
    setShowAIEnhancement(false);
  }, []);

  // Effect: Generate smart replies when conversation context changes
  useEffect(() => {
    const generateReplies = async () => {
      if (chatMessages.length > 0) {
        // Get last message from conversation
        const lastMessage = chatMessages[chatMessages.length - 1];
        
        // Don't generate replies for own messages
        if (lastMessage.user?.id === user.id) {
          setShowSmartReplies(false);
          return;
        }
        
        try {
          const replies = await aiService.generateSmartReplies(lastMessage.text, {
            conversationHistory: chatMessages.slice(-5).map(m => m.text),
            userName: user.name
          });
          
          setSmartReplies(replies);
          setShowSmartReplies(replies.length > 0);
        } catch (error) {
          console.error('Failed to generate smart replies:', error);
          setSmartReplies([]);
          setShowSmartReplies(false);
        }
      }
    };

    generateReplies();
  }, [chatMessages, user]);

  // Initialize thread service and event handlers
  useEffect(() => {
    const handleThreadCreated = (thread) => {
      setThreads(prev => new Map(prev).set(thread.id, thread));
    };

    const handleReplyAdded = (threadId) => {
      const thread = messageThreadService.getThread(threadId);
      if (thread) {
        setThreads(prev => new Map(prev).set(threadId, thread));
      }
    };

    const handleThreadUpdated = (thread) => {
      setThreads(prev => new Map(prev).set(thread.id, thread));
    };

    const handleThreadDeleted = (threadId) => {
      setThreads(prev => {
        const newThreads = new Map(prev);
        newThreads.delete(threadId);
        return newThreads;
      });
      if (activeThread?.id === threadId) {
        setActiveThread(null);
        setShowThreadView(false);
      }
    };

    // Subscribe to thread events
    messageThreadService.onThreadCreated = handleThreadCreated;
    messageThreadService.onReplyAdded = handleReplyAdded;
    messageThreadService.onThreadUpdated = handleThreadUpdated;
    messageThreadService.onThreadDeleted = handleThreadDeleted;

    // Load existing threads for conversation
    if (selectedConversation) {
      const conversationThreads = messageThreadService.getThreadsForConversation(selectedConversation);
      const threadsMap = new Map();
      conversationThreads.forEach(thread => threadsMap.set(thread.id, thread));
      setThreads(threadsMap);
    }

    return () => {
      // Cleanup event handlers
      messageThreadService.onThreadCreated = null;
      messageThreadService.onReplyAdded = null;
      messageThreadService.onThreadUpdated = null;
      messageThreadService.onThreadDeleted = null;
    };
  }, [selectedConversation, activeThread]);

  // Thread handlers
  const handleCreateThread = useCallback((message) => {
    try {
      const thread = messageThreadService.createThread(message, selectedConversation);
      setActiveThread(thread);
      setShowThreadView(true);
      console.log('Thread created:', thread);
    } catch (error) {
      console.error('Failed to create thread:', error);
      alert('Failed to create thread. Please try again.');
    }
  }, [selectedConversation]);

  const handleOpenThread = useCallback((threadId) => {
    const thread = messageThreadService.getThread(threadId);
    if (thread) {
      setActiveThread(thread);
      setShowThreadView(true);
    }
  }, []);

  const handleCloseThread = useCallback(() => {
    setActiveThread(null);
    setShowThreadView(false);
  }, []);

  const handleThreadReply = useCallback((threadId, reply) => {
    try {
      messageThreadService.addReply(threadId, reply);
      console.log('Reply added to thread:', threadId);
    } catch (error) {
      console.error('Failed to add reply:', error);
      alert('Failed to add reply. Please try again.');
    }
  }, []);

  // Get thread for a message
  const getMessageThread = useCallback((messageId) => {
    return Array.from(threads.values()).find(thread => 
      thread.parentMessage.id === messageId
    );
  }, [threads]);

  // Modal handlers
  const handleViewUserProfile = useCallback((userId, username) => {
    console.log('🎯 Profile button clicked!', { userId, username, user });
    console.log('📱 Current user data:', user);
    setProfileModal({ open: true, userId, username });
    console.log('✅ Profile modal state set to open');
    // Collapse sidebar on mobile and tablet to avoid obstruction
    if (window.innerWidth <= 1024) {
      setSidebarCollapsed(true);
    }
  }, [user]);

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
    const remoteId = videoCallState.withUser?.id;
    if (remoteId) realtimeService.sendSignal('call-end', remoteId);
    if (peerConnectionRef.current) { peerConnectionRef.current.close(); peerConnectionRef.current = null; }
    if (localStreamRef.current) { localStreamRef.current.getTracks().forEach(t => t.stop()); localStreamRef.current = null; }
    setVideoCallState(prev => ({ ...prev, active: false }));
  }, [videoCallState.withUser?.id]);

  const handleToggleMinimize = useCallback(() => {
    setVideoCallState(prev => ({ ...prev, minimized: !prev.minimized }));
  }, []);

  // Enhanced voice call handlers
  const handleStartVoiceCall = useCallback(async () => {
    let currentUser = currentSelectedConversation || currentConversation;
    
    // If no current user, create a demo user for testing
    if (!currentUser && conversations.length > 0) {
      currentUser = conversations[0];
      console.log('ï¿½ Using first conversation as fallback:', currentUser);
    }
    
    // Last resort: create a demo user
    if (!currentUser) {
      currentUser = {
        id: 'demo-user',
        name: 'Demo User',
        username: 'demo',
        avatar: null,
        phone: '+1-555-0123'
      };
      console.log('📞 Using demo user for voice call test');
    }
    
    console.log('ï¿½🔍 Voice call debug - currentUser:', currentUser);
    console.log('🔍 Voice call debug - currentSelectedConversation:', currentSelectedConversation);
    console.log('🔍 Voice call debug - currentConversation:', currentConversation);
    console.log('🔍 Voice call debug - conversations:', conversations);
    
    try {
      console.log('📞 Starting voice call with user:', currentUser.name || currentUser.username);
      
      // Get available call methods
      const methods = await enhancedVoiceCallService.getAvailableCallMethods(currentUser);
      console.log('📞 Available call methods:', methods);
      setAvailableCallMethods(methods);
      
      // If multiple methods available, show selector
      if (methods.length > 1) {
        console.log('📞 Multiple methods available, showing selector');
        setShowCallMethodSelector(true);
        return;
      }
      
      // Start call with best method
      console.log('📞 Starting enhanced voice call with auto method');
      await startEnhancedVoiceCall(currentUser, 'auto');
    } catch (error) {
      console.error('❌ Failed to start voice call:', error);
      alert(`Failed to start voice call: ${error.message}`);
    }
  }, [currentSelectedConversation, currentConversation, conversations]);

  const startEnhancedVoiceCall = useCallback(async (targetUser, method = 'auto') => {
    try {
      console.log('🚀 Starting enhanced voice call - targetUser:', targetUser, 'method:', method);

      // Attempt real WebRTC voice call via signaling
      try {
        const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
        peerConnectionRef.current = pc;
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        localStreamRef.current = stream;
        stream.getTracks().forEach(track => pc.addTrack(track, stream));
        pc.onicecandidate = (e) => {
          if (e.candidate) realtimeService.sendSignal('ice-candidate', targetUser.id, { candidate: e.candidate });
        };
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        realtimeService.sendSignal('call-offer', targetUser.id, {
          offer,
          fromUser: { id: user?.id, name: user?.name || user?.username },
          audioOnly: true
        });
      } catch (rtcErr) {
        console.warn('WebRTC voice call setup failed, falling back to stub:', rtcErr);
      }

      const callInstance = await enhancedVoiceCallService.initiateEnhancedCall(targetUser, method);
      console.log('📞 Call instance result:', callInstance);
      
      if (!callInstance.success) {
        throw new Error(callInstance.error || 'Failed to initiate call');
      }
      
      // Update voice call state
      setVoiceCallState({
        active: true,
        withUser: {
          id: targetUser.id,
          name: targetUser.name || targetUser.username,
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
        text: `📞 ${callInstance.method.description} with ${targetUser.name || targetUser.username}`,
        user: 'You',
        timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        type: 'voice_call_enhanced',
        callStatus: callInstance.status,
        callMethod: callInstance.method,
        connectionQuality: callInstance.connectionStatus.quality,
        isSystemMessage: true
      };

      console.log('📞 Adding voice call message to chat:', voiceCallMessage);
      setChatMessages(prev => [...prev, voiceCallMessage]);
      setShowCallMethodSelector(false);
      
      alert('📞 Voice call initiated successfully!\n\nNote: This is a demo implementation. In a real app, you would hear audio and see call controls.');
    } catch (error) {
      console.error('❌ Failed to start enhanced voice call:', error);
      alert(`Failed to start voice call: ${error.message}`);
    }
  }, [user]);

  const handleEndVoiceCall = useCallback(() => {
    const remoteId = voiceCallState.withUser?.id;
    if (remoteId) realtimeService.sendSignal('call-end', remoteId);
    if (peerConnectionRef.current) { peerConnectionRef.current.close(); peerConnectionRef.current = null; }
    if (localStreamRef.current) { localStreamRef.current.getTracks().forEach(t => t.stop()); localStreamRef.current = null; }
    setVoiceCallState(prev => ({ ...prev, active: false }));
  }, [voiceCallState.withUser?.id]);

  // Unified call handler for both international and app calls
  const handleUnifiedCall = useCallback(() => {
    setShowCallOptions(true);
  }, []);

  const handleInternationalCall = useCallback(() => {
    setShowCallOptions(false);
    setShowInternationalDialer(true);
  }, []);

  // Handle international call initiation
  const handleInternationalCallInitiated = useCallback((callData) => {
    console.log('📞 International call initiated:', callData);
    
    // Add call message to chat
    const callMessage = {
      id: `call_${Date.now()}`,
      text: `📞 Calling ${callData.number} (${callData.country.name})`,
      user: 'You',
      timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
      type: 'international_call',
      callData: callData,
      isSystemMessage: true
    };

    setChatMessages(prev => [...prev, callMessage]);

    // Show success notification
    alert(`📞 Calling ${callData.number}\n\nNote: This is a demo implementation. In a real app, this would connect to a VoIP service provider like Twilio, WebRTC, or similar service to handle the actual phone call.`);
    
    // Close the dialer
    setShowInternationalDialer(false);
  }, []);

  const handleAppCall = useCallback(async () => {
    console.log('🎯 handleAppCall called');
    alert('App call clicked! Check console for debug info.');
    
    setShowCallOptions(false);
    await handleStartVoiceCall();
  }, [handleStartVoiceCall]);

  const handleToggleVoiceMinimize = useCallback(() => {
    setVoiceCallState(prev => ({ ...prev, minimized: !prev.minimized }));
  }, []);

  // Handle video call
  const handleVideoCall = useCallback(async () => {
    const currentUser = currentSelectedConversation || currentConversation;
    if (!currentUser) {
      alert('Please select a conversation to start a video call');
      return;
    }

    try {
      await enhancedVideoCallService.initialize();

      // ── WebRTC offer via signaling ──
      const targetUserId = currentUser.id;
      if (targetUserId && realtimeService.isConnected()) {
        const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
        peerConnectionRef.current = pc;
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true }).catch(() => null);
        if (stream) {
          localStreamRef.current = stream;
          stream.getTracks().forEach(t => pc.addTrack(t, stream));
        }
        pc.onicecandidate = e => {
          if (e.candidate) realtimeService.sendSignal('ice-candidate', targetUserId, { candidate: e.candidate });
        };
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        realtimeService.sendSignal('call-offer', targetUserId, { offer, audioOnly: false });
      }

      setVideoCallState({
        active: true,
        withUser: { name: currentUser.name, avatar: currentUser.avatar, id: currentUser.id },
        minimized: false,
        audioOnly: false,
        callId: `call_${Date.now()}`
      });

      const videoCallMessage = {
        id: `call_${Date.now()}`,
        text: `📹 Video call with ${currentUser.name}`,
        user: 'You',
        timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        type: 'video_call',
        callStatus: 'connecting',
        isSystemMessage: true
      };
      setChatMessages(prev => [...prev, videoCallMessage]);
    } catch (error) {
      console.error('Failed to start video call:', error);
      alert('Failed to start video call. Please check your camera and microphone permissions.');
    }
  }, [currentSelectedConversation, currentConversation]);

  // Video call component - Temporarily disabled
  const MemoizedVideoCall = useMemo(() => (
    null // <VideoCall 
    //   callState={videoCallState}
    //   onEndCall={handleEndCall}
    //   onToggleMinimize={handleToggleMinimize}
    // />
  ), [videoCallState, handleEndCall, handleToggleMinimize]);

  // Voice call component (using VideoCall in audio-only mode) - Temporarily disabled
  const MemoizedVoiceCall = useMemo(() => (
    null // <VideoCall 
    //   callState={voiceCallState}
    //   onEndCall={handleEndVoiceCall}
    //   onToggleMinimize={handleToggleVoiceMinimize}
    // />
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
      
      {/* Video Call Component */}
      {MemoizedVideoCall}
      
      {/* Voice Call Component */}
      {MemoizedVoiceCall}
      
      {/* Enhanced Sidebar */}
      <div 
        ref={sidebarRef}
        className={`pro-sidebar enhanced-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Simplified Sidebar Header */}
        <div className="pro-sidebar-header simplified">
          <div className="sidebar-logo">
            <div className="logo-icon" data-tooltip="Quibish Chat">
              <span className="logo-emoji">💬</span>
              {totalUnreadCount > 0 && (
                <div className="logo-unread-badge">{totalUnreadCount > 99 ? '99+' : totalUnreadCount}</div>
              )}
            </div>
            {!sidebarCollapsed && (
              <h2 className="logo-text">Quibish</h2>
            )}
          </div>
          <button onClick={toggleSidebar} className="sidebar-toggle-btn" title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            {sidebarCollapsed ? '⮞' : '⮜'}
          </button>
        </div>

        {/* Simplified User Profile Section */}
        <div className="sidebar-user-profile simplified">
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
                if (!avatarError) {
                  console.log('Avatar load failed, trying fallback:', e.target.src);
                  handleAvatarError();
                  // Fallback to ui-avatars service
                  if (!e.target.src.includes('ui-avatars.com')) {
                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=4f46e5&color=fff&size=80&bold=true&format=png`;
                  } else {
                    // Final fallback to default avatar
                    e.target.src = '/default-avatar.png';
                  }
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
        </div>

        {/* Quick Actions */}
        {!sidebarCollapsed && (
          <div className="sidebar-actions">
            <button className="action-btn primary" onClick={handleNewChat}>
              <span className="icon">➕</span>
              <span className="text">New Chat</span>
            </button>
            <button className="action-btn secondary" onClick={handleUserSearchClick}>
              <span className="icon">🔍</span>
              <span className="text">Find Users</span>
            </button>
          </div>
        )}

        {/* Simple Search */}
        {!sidebarCollapsed && (
          <div className="sidebar-search simplified">
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

        {/* Simple Filter Tabs */}
        {!sidebarCollapsed && (
          <div className="sidebar-filters simplified">
            <button 
              className={`filter-tab ${activeFilter === 'all' ? 'active' : ''}`}
              onClick={() => handleFilterChange('all')}
            >
              All ({getFilterCounts.all})
            </button>
            <button 
              className={`filter-tab ${activeFilter === 'unread' ? 'active' : ''}`}
              onClick={() => handleFilterChange('unread')}
            >
              Unread ({getFilterCounts.unread})
            </button>
          </div>
        )}

        {/* Essential Toolbar - Sort Only */}
        {!sidebarCollapsed && (
          <div className="sidebar-toolbar simplified">
            <select 
              className="sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              title="Sort conversations"
            >
              <option value="recent">Recent</option>
              <option value="unread">Unread</option>
              <option value="alphabetical">A-Z</option>
            </select>
          </div>
        )}

        {/* Simplified Conversations List */}
        <div className="pro-sidebar-content">
          <div className="conversations-list simplified">
            {filteredConversations.map((conv, index) => (
              <div 
                key={conv.id} 
                className={`conversation-item simple ${selectedConversation === conv.id ? 'active' : ''}`}
                onClick={() => handleConversationSelect(conv.id)}
              >
                <div className="conversation-avatar">
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
                    <p className="last-message">{conv.lastMessage || 'Hey there! How are you doing?'}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>


        {/* Simplified Sidebar Footer */}
        <div className="sidebar-footer simplified">
          <div className="footer-actions">
            <button 
              className="footer-btn" 
              title="Contacts"
              onClick={handleOpenContactManager}
              data-mobile-action="contacts"
            >
              👥
            </button>
            <button 
              className="footer-btn" 
              title="Settings" 
              onClick={handleQuickSettings}
              data-mobile-action="settings"
            >
              ⚙️
            </button>
          </div>
        </div>
      </div>

      {/* Sidebar Backdrop Overlay for Mobile */}
      {!sidebarCollapsed && (
        <div 
          className="pro-sidebar-overlay" 
          onClick={handleOverlayClick}
          aria-hidden="true"
          style={{ pointerEvents: 'auto', zIndex: 1000 }}
        />
      )}

      {/* Main Chat Area */}
      <div className={`pro-main ${sidebarCollapsed ? 'collapsed' : ''}`}>
        {/* Enhanced Header */}
        <div className="pro-header enhanced-chat-header">
          <div className="header-left">
            {/* Mobile Hamburger Menu Button - hidden on desktop via CSS */}
            <button 
              className="mobile-menu-btn" 
              onClick={toggleSidebar}
              title="Toggle sidebar"
              aria-label="Toggle sidebar"
            >
              ☰
            </button>
            
            <div 
              className="conversation-avatar"
              onClick={() => setContactProfilePopup(true)}
              style={{ cursor: 'pointer' }}
              title="View profile"
            >
              <img 
                src={currentSelectedConversation?.avatar || currentConversation?.avatar || `https://images.unsplash.com/photo-1516726817505-f5ed825624d8?w=40&h=40&fit=crop&crop=face`}
                alt={currentSelectedConversation?.name || currentConversation?.name || 'Chat'}
              />
              <div className={`online-indicator ${isConnected ? 'online' : 'offline'}`}></div>
            </div>
            <div className="conversation-info">
              <div className="conversation-status">
                {typingUser ? (
                  <span className="typing-indicator">
                    <span className="typing-dots"><span /><span /><span /></span>
                    {typingUser} is typing...
                  </span>
                ) : (
                  <span className={`connection-status ${(currentSelectedConversation?.isOnline || currentConversation?.isOnline) ? 'connected' : isConnected ? 'connected' : 'disconnected'}`}>
                    {(currentSelectedConversation?.isOnline || currentConversation?.isOnline) ? '\u25cf Online' : isConnected ? '\u25cf Away' : '\u25cf Offline'}
                  </span>
                )}
                <span className="participant-count">
                  {currentSelectedConversation?.participants || currentConversation?.participants || (currentSelectedConversation ? 2 : 0)} participants
                </span>
              </div>
            </div>
          </div>
          
          {/* Navigation Actions */}
          <div className="header-actions">
              <NotificationButton
                onClick={handleShowNotificationCenter}
                className="notification-btn"
              />
              <button 
                className="action-btn invite-user-btn" 
                title="👥 Invite Users - Search and invite people to chat"
                onClick={handleUserSearchClick}
              >
                👥
              </button>
              <button 
                className="action-btn unified-call-btn" 
                title="📞 Make Calls - International phone calls & app-to-app voice calls"
                onClick={handleUnifiedCall}
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
              <button 
                className="action-btn video-call-btn enhanced-video-btn" 
                title="Start Video Call"
                onClick={handleVideoCall}
              >
                <svg 
                  width="20" 
                  height="20" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  xmlns="http://www.w3.org/2000/svg"
                  className="video-icon"
                >
                  <rect x="2" y="6" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M16 10L22 7V17L16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="7" cy="11" r="1.5" fill="currentColor" opacity="0.5"/>
                </svg>
                <span className="btn-label">Video</span>
              </button>
              <button 
                className="action-btn file-share-btn" 
                title="📎 File Sharing - Upload, manage, and share files"
                onClick={() => setShowFileShare(true)}
              >
                📎
              </button>
              <button 
                className="action-btn donation-btn" 
                title="💝 Support Our Free App - Help us keep it free for everyone!"
                onClick={() => setShowDonationModal(true)}
              >
                💝
              </button>
              <div className="header-menu">                
                <button 
                  className="action-btn menu-btn" 
                  title="More options"
                  onClick={handleMoreMenuToggle}
                  style={{ position: 'relative', zIndex: 10 }}
                >
                  ⋮
                </button>
              </div>
              
              {/* More Options rendered via portal - see bottom of component */}
            </div>
          </div>
        </div>
                  
        {/* Content Area - Contains messages and input */}
        <div className="pro-content">
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
            <div 
              key={message.id} 
              id={`message-${message.id}`}
              className={`pro-message-blurb ${highlightedMessageId === message.id ? 'search-highlighted' : ''}`}
              data-message-id={message.id}
            >
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
                  <span className="message-smart-text">
                    {message.text}
                  </span>
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
                
                {/* Enhanced Voice Message Display */}
                {message.type === 'voice' && (
                  <div className="voice-message enhanced">
                    {message.audioUrl ? (
                      <VoiceMessagePlayer
                        audioUrl={message.audioUrl}
                        duration={message.duration}
                        compact={true}
                        className="chat-voice-player"
                      />
                    ) : (
                      <div className="voice-message-fallback">
                        <div className="voice-icon">🎤</div>
                        <div className="voice-duration">{formatRecordingTime(message.duration || 0)}</div>
                        <div className="voice-placeholder">Legacy voice message</div>
                      </div>
                    )}
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
                  {String(message.user?.id) === String(user?.id) && (
                    <span className={`message-delivery-status ${message.pending ? 'pending' : 'sent'}`} title={message.pending ? 'Sending…' : 'Sent'}>
                      {message.pending ? '○' : '✓'}
                    </span>
                  )}
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
              
              {/* Threading UI */}
              <div className="message-threading-actions">
                {(() => {
                  const messageThread = getMessageThread(message.id);
                  return messageThread ? (
                    <ThreadIndicator
                      thread={messageThread}
                      onClick={() => handleOpenThread(messageThread.id)}
                      compact={false}
                      showParticipants={true}
                    />
                  ) : (
                    <button
                      className="reply-in-thread-btn icon-only"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCreateThread(message);
                      }}
                      title="Reply in thread"
                    >
                      💬
                    </button>
                  );
                })()}
              </div>
              
              {/* Context-Aware Message Actions - Placeholder for future implementation */}
              {/* <MessageActions component will be implemented later /> */}
            </div>
          ))}
          {/* Auto-scroll anchor element */}
          <div ref={messagesEndRef} />
        </div>

        {/* Enhanced Input Area with Voice and File Upload */}
        <div className="pro-chat-input-container enhanced mobile-input-bar keyboard-avoiding">
          <div className="input-wrapper enhanced touch-target">
            {/* Enhanced Voice Recording Interface */}
            {isRecording && (
              <>
                <div 
                  className="recording-overlay" 
                  onClick={() => setIsRecording(false)}
                  title="Click to close"
                />
                <div className="enhanced-recording-container">
                  <VoiceRecorder
                    onRecordingComplete={handleVoiceRecordingComplete}
                    onRecordingCancel={handleVoiceRecordingCancel}
                    onRecordingStart={handleVoiceRecordingStart}
                    onClose={() => setIsRecording(false)}
                    maxDuration={300000} // 5 minutes
                    minDuration={1000} // 1 second
                    compact={true}
                    autoStart={false}
                    className="chat-voice-recorder"
                  />
                </div>
              </>
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
                  {!isRecording && (
                    <button 
                      className="input-btn voice-btn mobile-action-button touch-target touch-ripple haptic-light"
                      onClick={() => setIsRecording(true)}
                      type="button"
                      title="Record voice message"
                    >
                      🎤
                    </button>
                  )}

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

                  {/* AI Enhancement Button */}
                  <button 
                    className="input-btn ai-btn mobile-action-button touch-target touch-ripple haptic-light"
                    onClick={handleOpenAIEnhancement}
                    disabled={!inputText.trim()}
                    type="button"
                    title="AI Enhance & Translate"
                  >
                    ✨
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
                    onChange={(e) => {
                      setInputText(e.target.value);
                      const now = Date.now();
                      if (now - typingThrottleRef.current > 2000) {
                        typingThrottleRef.current = now;
                        const conversationParticipants = currentSelectedConversation?.participants || [];
                        const recipientId = conversationParticipants.find(p => String(p) !== String(user?.id)) || null;
                        realtimeService.sendTyping({ conversationId: selectedConversation, recipientId });
                      }
                    }}
                    onKeyPress={handleKeyPress}
                    onFocus={() => {
                      // Force close any overlays when input is focused
                      setShowEmojiPicker(false);
                      setShowReactionPicker(false);
                    }}
                    onClick={(e) => {
                      // Stop event propagation to prevent interference
                      e.stopPropagation();
                      // Ensure input gets focus and close overlays
                      setShowEmojiPicker(false);
                      setShowReactionPicker(false);
                      // Force focus
                      e.target.focus();
                    }}
                    placeholder="Type your message..."
                    className="message-input enhanced mobile-message-input touch-target clickable-input"
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

        {/* Smart Replies Panel */}
        {(showSmartReplies && smartReplies.length > 0) || showAIEnhancement ? (
          <div className="pro-smart-panel-container">
            {showSmartReplies && smartReplies.length > 0 && (
              <SmartRepliesPanel
                replies={smartReplies}
                onSelectReply={handleSmartReplySelect}
                onClose={() => setShowSmartReplies(false)}
                lastMessage={chatMessages[chatMessages.length - 1]}
              />
            )}

            {/* AI Enhancement Panel */}
            {showAIEnhancement && (
              <AIEnhancementPanel
                message={currentMessageForAI}
                onEnhance={handleAIEnhance}
                onClose={() => setShowAIEnhancement(false)}
              />
            )}
          </div>
        ) : null}

      {/* Contact Profile Popup */}
      {contactProfilePopup && (currentSelectedConversation || currentConversation) && (
        <>
          <div
            onClick={() => setContactProfilePopup(false)}
            style={{
              position: 'fixed', inset: 0,
              backgroundColor: 'rgba(0,0,0,0.4)',
              zIndex: 2147483640,
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)'
            }}
          />
          <div style={{
            position: 'fixed',
            top: '70px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'min(340px, 92vw)',
            backgroundColor: 'var(--pro-surface, #fff)',
            borderRadius: '20px',
            boxShadow: '0 24px 60px rgba(0,0,0,0.2)',
            zIndex: 2147483641,
            overflow: 'hidden',
            fontFamily: 'inherit'
          }}>
            {/* Close button */}
            <button
              onClick={() => setContactProfilePopup(false)}
              style={{
                position: 'absolute', top: '10px', right: '10px',
                zIndex: 1, width: '32px', height: '32px',
                borderRadius: '50%', border: 'none',
                background: 'rgba(0,0,0,0.35)', color: '#fff',
                fontSize: '18px', lineHeight: 1, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backdropFilter: 'blur(4px)'
              }}
              aria-label="Close"
            >×</button>
            {/* Cover banner */}
            <div style={{
              height: '80px',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)'
            }} />
            {/* Avatar */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '-40px', padding: '0 20px 20px' }}>
              <div style={{ position: 'relative' }}>
                <img
                  src={currentSelectedConversation?.avatar || currentConversation?.avatar}
                  alt={currentSelectedConversation?.name || currentConversation?.name}
                  style={{
                    width: '80px', height: '80px', borderRadius: '50%',
                    border: '4px solid #fff',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                    objectFit: 'cover'
                  }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <div style={{
                  display: 'none',
                  width: '80px', height: '80px', borderRadius: '50%',
                  border: '4px solid #fff',
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  alignItems: 'center', justifyContent: 'center',
                  fontSize: '28px', color: '#fff', fontWeight: '700'
                }}>
                  {(currentSelectedConversation?.name || currentConversation?.name || '?')[0].toUpperCase()}
                </div>
                <span style={{
                  position: 'absolute', bottom: '4px', right: '4px',
                  width: '16px', height: '16px', borderRadius: '50%',
                  backgroundColor: isConnected ? '#22c55e' : '#94a3b8',
                  border: '2px solid #fff'
                }} />
              </div>
              {/* Name & status */}
              <h3 style={{ margin: '10px 0 2px', fontSize: '18px', fontWeight: '700', color: 'var(--pro-text, #1e293b)' }}>
                {currentSelectedConversation?.name || currentConversation?.name}
              </h3>
              <p style={{ margin: '0 0 16px', fontSize: '13px', color: isConnected ? '#22c55e' : '#94a3b8', fontWeight: '500' }}>
                {isConnected ? '● Online' : '● Offline'}
              </p>
              {/* Action row */}
              <div style={{ display: 'flex', gap: '10px', width: '100%', marginBottom: '16px' }}>
                {[
                  { icon: '💬', label: 'Message', action: () => setContactProfilePopup(false) },
                  { icon: '📞', label: 'Call', action: () => { setContactProfilePopup(false); handleUnifiedCall(); } },
                  { icon: '🎥', label: 'Video', action: () => { setContactProfilePopup(false); handleVideoCall(); } }
                ].map(({ icon, label, action }) => (
                  <button key={label} onClick={action} style={{
                    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                    gap: '4px', padding: '10px 4px',
                    background: 'rgba(99,102,241,0.08)', border: 'none', borderRadius: '12px',
                    cursor: 'pointer', color: '#6366f1', fontSize: '12px', fontWeight: '600',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(99,102,241,0.16)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(99,102,241,0.08)'}
                  >
                    <span style={{ fontSize: '20px' }}>{icon}</span>
                    {label}
                  </button>
                ))}
              </div>
              {/* Info rows */}
              <div style={{ width: '100%', borderTop: '1px solid rgba(0,0,0,0.07)', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {[
                  { icon: '🔍', label: 'Search in conversation', action: () => { setContactProfilePopup(false); handleSearchInChat(); } },
                  { icon: '🔔', label: 'Mute notifications', action: () => { setContactProfilePopup(false); handleMuteNotifications(); } },
                  { icon: '👤', label: 'View full profile', action: () => { setContactProfilePopup(false); handleViewUserProfile(currentSelectedConversation?.id || currentConversation?.id, currentSelectedConversation?.name || currentConversation?.name); } },
                  { icon: '🗑️', label: 'Clear chat', action: () => { setContactProfilePopup(false); handleClearChat(); }, danger: true }
                ].map(({ icon, label, action, danger }) => (
                  <button key={label} onClick={action} style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    width: '100%', padding: '10px 4px', border: 'none',
                    background: 'none', textAlign: 'left', fontSize: '14px',
                    color: danger ? '#ef4444' : 'var(--pro-text, #374151)',
                    cursor: 'pointer', borderRadius: '8px', transition: 'background 0.15s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = danger ? 'rgba(239,68,68,0.07)' : 'rgba(0,0,0,0.04)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                  >
                    <span style={{ fontSize: '16px', width: '22px', textAlign: 'center' }}>{icon}</span>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* More Options Dropdown - rendered via portal to escape any stacking context */}
      {showMoreMenu && ReactDOM.createPortal(
        <>
          <div
            onClick={() => setShowMoreMenu(false)}
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.4)',
              zIndex: 2147483646,
              WebkitTapHighlightColor: 'transparent'
            }}
          />
          <div className="more-options-dropdown">
            {/* Drag handle (visible on mobile) */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.15)' }} />
            </div>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '8px 16px 12px', borderBottom: '1px solid rgba(226,232,240,0.6)',
              fontWeight: '600', fontSize: '15px', color: '#374151',
            }}>
              <span>More Options</span>
              <button onClick={() => setShowMoreMenu(false)} style={{
                background: 'none', border: 'none', fontSize: '20px', color: '#6b7280',
                cursor: 'pointer', width: '32px', height: '32px', display: 'flex',
                alignItems: 'center', justifyContent: 'center', borderRadius: '6px',
                padding: 0
              }}>×</button>
            </div>
            {[
              { icon: '🔍', label: 'Search in Chat', action: handleSearchInChat },
              { icon: '👥', label: 'Contacts', action: handleOpenContactManager },
              { icon: '📥', label: 'Export Chat', action: handleExportChat },
              { icon: '🖨️', label: 'Print Chat', action: handlePrintChat },
              { icon: localStorage.getItem('notificationsMuted') === 'true' ? '🔔' : '🔕', label: (localStorage.getItem('notificationsMuted') === 'true' ? 'Unmute' : 'Mute') + ' Notifications', action: handleMuteNotifications },
              { icon: '🗑️', label: 'Clear Chat', action: handleClearChat },
              { icon: '❓', label: 'Help & Support', action: () => setHelpModal(true) },
              { icon: '📢', label: 'Send Feedback', action: () => setFeedbackModal(true) },
            ].map(({ icon, label, action }) => (
              <button key={label} className="dropdown-item" onClick={() => { action(); setShowMoreMenu(false); }}>
                <span className="dropdown-icon">{icon}</span>{label}
              </button>
            ))}
            <hr className="dropdown-divider" />
            {[
              { icon: '🔔', label: 'Notifications', action: () => setNotificationSettingsModal(true) },
              { icon: '📰', label: 'News Feed', action: () => setNewsFeedModal(true) },
              { icon: '⚙️', label: 'Settings', action: handleQuickSettings },
              { icon: darkMode ? '☀️' : '🌙', label: darkMode ? 'Light Mode' : 'Dark Mode', action: onToggleDarkMode },
            ].map(({ icon, label, action }) => (
              <button key={label} className="dropdown-item" onClick={() => { action(); setShowMoreMenu(false); }}>
                <span className="dropdown-icon">{icon}</span>{label}
              </button>
            ))}
            <hr className="dropdown-divider" />
            <button className="dropdown-item logout-item" onClick={() => { onLogout(); setShowMoreMenu(false); }}>
              <span className="dropdown-icon">🚪</span>Logout
            </button>
          </div>
        </>,
        document.body
      )}

      {/* Profile Modal */}
      {profileModal.open && (
        <>
          {console.log('🔍 Rendering UserProfileModal:', { profileModal, user })}
          <UserProfileModal 
            isOpen={profileModal.open}
            user={user}
            onClose={handleCloseProfileModal}
            onUpdateProfile={(updatedProfile) => {
              console.log('Profile updated:', updatedProfile);
              // You can add additional update logic here if needed
            }}
          />
        </>
      )}

      {/* Settings Modal */}
      {settingsModal.open && (
        <>
          {console.log('🔧 Rendering SettingsModal:', { settingsModal })}
          <SettingsModal 
            isOpen={settingsModal.open}
            onClose={handleCloseSettingsModal}
            initialSection={settingsModal.section}
          />
        </>
      )}

      {/* Notification Settings Modal */}
      {notificationSettingsModal && (
        <NotificationSettings
          isOpen={notificationSettingsModal}
          onClose={() => setNotificationSettingsModal(false)}
          user={user}
        />
      )}

      {/* News Feed Modal */}
      {newsFeedModal && (
        <div className="modal-overlay" onClick={() => setNewsFeedModal(false)}>
          <div className="modal-content news-feed-modal" onClick={(e) => e.stopPropagation()} style={{
            maxWidth: '900px',
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto',
            background: '#fff',
            borderRadius: '12px',
            position: 'relative'
          }}>
            <div className="modal-header" style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '20px',
              borderBottom: '1px solid #e2e8f0'
            }}>
              <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '600' }}>📰 News Feed</h2>
              <button 
                onClick={() => setNewsFeedModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#64748b',
                  padding: '0',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ×
              </button>
            </div>
            <div className="modal-body" style={{ padding: '0' }}>
              <NewsFeed user={user} />
            </div>
          </div>
        </div>
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
          onClose={() => { setShowContactManager(false); document.body.classList.remove('contact-manager-open'); }}
          onStartChat={handleContactToChat}
          onStartCall={handleContactCall}
          currentUser={user}
          darkMode={darkMode}
        />
      )}

      {/* Mobile Global Voice Calls Modal - Removed - Using internet-based calling only */}

      {/* Call Options Modal */}
      {showCallOptions && (
        <div className="modal-overlay" onClick={() => setShowCallOptions(false)}>
          <div className="modal-content call-options-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Choose Call Type</h3>
              <button className="close-btn" onClick={() => setShowCallOptions(false)}>×</button>
            </div>
            <div className="call-options-content">
              <button 
                className="call-option-btn international-option"
                onClick={handleInternationalCall}
              >
                <span className="call-option-icon">🌍</span>
                <div className="call-option-info">
                  <h4>International Phone Call</h4>
                  <p>Call any phone number worldwide - completely FREE!</p>
                </div>
              </button>
              <button 
                className="call-option-btn app-call-option"
                onClick={handleAppCall}
              >
                <span className="call-option-icon">💬</span>
                <div className="call-option-info">
                  <h4>App-to-App Voice Call</h4>
                  <p>High-quality voice call with other Quibish users</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* International Dialer Modal */}
      {showInternationalDialer && (
        <InternationalDialer
          isOpen={showInternationalDialer}
          onClose={() => setShowInternationalDialer(false)}
          onCall={handleInternationalCallInitiated}
          darkMode={darkMode}
        />
      )}

      {/* Donation Modal */}
      {showDonationModal && (
        <DonationModal
          isOpen={showDonationModal}
          onClose={() => setShowDonationModal(false)}
          darkMode={darkMode}
          userStats={{
            callsMade: 0, // Internet-based calls only
            messagesSent: currentConversation?.messages?.length || 0,
            daysUsed: 1
          }}
        />
      )}

      {/* Donation Prompt - Non-intrusive encouragement */}
      <DonationPrompt
        userStats={{
          callsMade: 0, // Internet-based calls only
          messagesSent: currentConversation?.messages?.length || 0,
          daysUsed: 1
        }}
        darkMode={darkMode}
        onOpenDonation={() => setShowDonationModal(true)}
        position="bottom-right"
        autoShow={true}
      />

      {/* User Search Modal */}
      {showUserSearch && (
        <UserSearchModal
          isOpen={showUserSearch}
          onClose={() => setShowUserSearch(false)}
          onUserSelect={handleUserSelect}
          searchQuery={searchMode === 'users' ? searchQuery : ''}
          onSearchQueryChange={setSearchQuery}
        />
      )}

      {/* Advanced Search Modal */}
      {showAdvancedSearch && (
        <AdvancedSearchModal
          isOpen={showAdvancedSearch}
          onClose={() => setShowAdvancedSearch(false)}
          onResultSelect={handleSearchResultSelect}
          currentConversationId={selectedConversation}
        />
      )}

      {/* Thread View Panel */}
      {showThreadView && activeThread && (
        <div className="thread-view-overlay" onClick={handleCloseThread}>
          <div className="thread-view-panel" onClick={(e) => e.stopPropagation()}>
            <ThreadView
              thread={activeThread}
              onReply={handleThreadReply}
              onClose={handleCloseThread}
              currentUser={user}
              compact={false}
            />
          </div>
        </div>
      )}

      {/* File Share Panel */}
      {showFileShare && (
        <FileSharePanel
          userId={user.id}
          conversationId={selectedConversation}
          onClose={() => setShowFileShare(false)}
          onFileSelect={(file) => {
            setSelectedFileId(file.id);
            setShowFilePreview(true);
          }}
        />
      )}

      {/* File Preview Modal */}
      {showFilePreview && selectedFileId && (
        <FilePreview
          fileId={selectedFileId}
          onClose={() => {
            setShowFilePreview(false);
            setSelectedFileId(null);
          }}
        />
      )}

      {/* Video Call Panel */}
      {videoCallState.active && (
        <VideoCallPanel
          callId={videoCallState.callId}
          participants={videoCallState.withUser ? [videoCallState.withUser] : []}
          onClose={() => {
            setVideoCallState({
              active: false,
              withUser: null,
              minimized: false,
              audioOnly: false,
              callId: null
            });
          }}
        />
      )}
      {/* Notification Center */}
      {showNotificationCenter && (
        <NotificationCenter
          isOpen={showNotificationCenter}
          onClose={handleCloseNotificationCenter}
          onNotificationClick={handleNotificationClick}
        />
      )}
      
      {/* Notification Permission Prompt */}
      <NotificationPermissionPrompt
        onPermissionGranted={() => {
          console.log('✅ User granted notification permission');
          // Optionally show a success message
        }}
        onPermissionDenied={() => {
          console.log('❌ User denied notification permission');
          // Optionally show info about enabling in settings
        }}
      />
      
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
