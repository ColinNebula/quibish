import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import UserProfileModal from '../UserProfile/UserProfileModal';
import SettingsModal from './SettingsModal';
import VideoCall from './VideoCall';
import GifPicker from '../GifPicker/GifPicker';
import PropTypes from 'prop-types';

// CSS imports
import './ProLayout.css';
import './ProMessages.css';
import './ProSidebar.css';
import './ProHeader.css';
import './ProChat.css';
import './ResponsiveFix.css';

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

  // GIF picker state
  const [showGifPicker, setShowGifPicker] = useState(false);

  // Mobile upload menu state
  const [showMobileUploadMenu, setShowMobileUploadMenu] = useState(false);

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

  // Chat messages state - moved here to be available for useEffect
  const [chatMessages, setChatMessages] = useState([
    {
      id: 1,
      text: "Hey! 👋",
      user: { id: 'user1', name: 'Alice Johnson', avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=40&h=40&fit=crop&crop=face' },
      timestamp: new Date(Date.now() - 300000).toISOString(),
      reactions: [
        { emoji: '👋', count: 2, userId: 'user2' },
        { emoji: '😊', count: 1, userId: 'user3' }
      ]
    },
    {
      id: 2,
      text: "Welcome to the enhanced chat application! This is a medium-length message to demonstrate how the message cards scale based on content length.",
      user: { id: 'system', name: 'System', avatar: null },
      timestamp: new Date(Date.now() - 240000).toISOString(),
      reactions: [
        { emoji: '👍', count: 3, userId: 'user1' },
        { emoji: '🎉', count: 1, userId: 'user2' }
      ]
    },
    {
      id: 3,
      text: "This is a longer message that demonstrates the chat application's ability to handle various message lengths gracefully. The card automatically adjusts its height and the content flows naturally within the card boundaries.",
      user: { id: 'user2', name: 'Bob Smith', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face' },
      timestamp: new Date(Date.now() - 180000).toISOString(),
      reactions: [
        { emoji: '💯', count: 1, userId: 'user1' }
      ]
    },
    {
      id: 4,
      text: "Short one! 😄",
      user: { id: 'user3', name: 'Charlie Brown', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=40&h=40&fit=crop&crop=face' },
      timestamp: new Date(Date.now() - 120000).toISOString(),
      reactions: [
        { emoji: '😄', count: 2, userId: 'user1' },
        { emoji: '❤️', count: 1, userId: 'user2' }
      ]
    },
    {
      id: 5,
      text: "The chat interface supports real-time messaging, file uploads, voice messages, and many other features that make communication seamless and enjoyable.",
      user: { id: 'user1', name: 'Alice Johnson', avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=40&h=40&fit=crop&crop=face' },
      timestamp: new Date(Date.now() - 60000).toISOString(),
      reactions: []
    },
    {
      id: 6,
      text: "🎭 GIF: celebration.gif",
      user: { id: 'user2', name: 'Bob Smith', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face' },
      timestamp: new Date(Date.now() - 30000).toISOString(),
      reactions: [
        { emoji: '🎉', count: 3, userId: 'user1' },
        { emoji: '🔥', count: 2, userId: 'user3' }
      ],
      file: {
        name: 'celebration.gif',
        size: 245760, // 240 KB
        type: 'image/gif',
        url: 'https://media.giphy.com/media/26u4lOMA8JKSnL9Uk/giphy.gif',
        isGif: true
      }
    }
  ]);
  
  // Reaction system state - moved here to be available for functions
  const [selectedMessageId, setSelectedMessageId] = useState(null);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  
  // Color palette for user message cards
  const messageColors = [
    { id: 'blue', bg: '#e3f2fd', border: '#2196f3', accent: '#1976d2' }, // Blue
    { id: 'purple', bg: '#f3e5f5', border: '#9c27b0', accent: '#7b1fa2' }, // Purple
    { id: 'green', bg: '#e8f5e8', border: '#4caf50', accent: '#388e3c' }, // Green
    { id: 'orange', bg: '#fff3e0', border: '#ff9800', accent: '#f57c00' }, // Orange
    { id: 'pink', bg: '#fce4ec', border: '#e91e63', accent: '#c2185b' }, // Pink
    { id: 'peach', bg: '#ffeaa7', border: '#fdcb6e', accent: '#e17055' }, // Peach
    { id: 'coral', bg: '#fab1a0', border: '#e17055', accent: '#d63031' }, // Coral
    { id: 'lavender', bg: '#a29bfe', border: '#6c5ce7', accent: '#5f3dc4' }, // Lavender
  ];

  // Listen for color preference changes
  const [colorRefresh, setColorRefresh] = useState(0);
  useEffect(() => {
    const handleColorChange = () => {
      setColorRefresh(prev => prev + 1); // Force re-render with new colors
    };

    window.addEventListener('userColorChanged', handleColorChange);
    return () => window.removeEventListener('userColorChanged', handleColorChange);
  }, []);

  // Function to get consistent color for a user
  const getUserColor = useCallback((userId) => {
    if (!userId) return messageColors[0]; // Default color for system messages

    // First check for saved user preference
    const savedPreference = localStorage.getItem('userColorPreference');
    if (savedPreference && savedPreference !== 'auto' && userId === user?.id) {
      const preferredColor = messageColors.find(color => color.id === savedPreference);
      if (preferredColor) {
        return preferredColor;
      }
    }

    // If it's the current user and they have a preference in their profile
    if (userId === user?.id && user?.preferences?.messageColor && user.preferences.messageColor !== 'auto') {
      const preferredColor = messageColors.find(color => color.id === user.preferences.messageColor);
      if (preferredColor) {
        return preferredColor;
      }
    }

    // Fall back to hash-based color assignment
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    // Use absolute value and modulo to get a color index
    const colorIndex = Math.abs(hash) % messageColors.length;
    return messageColors[colorIndex];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, colorRefresh, messageColors]);
  
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

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => !prev);
  }, []);

  const handleConversationSelect = useCallback((conversationId) => {
    setSelectedConversation(conversationId);
  }, []);

  const handleSearchChange = useCallback((e) => {
    setSearchQuery(e.target.value);
  }, []);

  const handleFilterChange = useCallback((filter) => {
    setActiveFilter(filter);
  }, []);

  const handleNewChat = useCallback(() => {
    // TODO: Implement new chat functionality
    console.log('New chat clicked');
  }, []);

  const handleCreateGroup = useCallback(() => {
    // TODO: Implement create group functionality
    console.log('Create group clicked');
  }, []);

  const handleQuickSettings = useCallback(() => {
    setSettingsModal({ open: true, section: 'profile' });
  }, []);

  // Enhanced input functions

  // Detect mobile device
  const isMobileDevice = useCallback(() => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }, []);

  // Image compression utility for mobile uploads
  const compressImage = useCallback((file, maxWidth = 1920, maxHeight = 1080, quality = 0.8) => {
    return new Promise((resolve) => {
      // If file is already small enough, return as-is
      if (file.size <= 1024 * 1024) { // 1MB
        resolve(file);
        return;
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            resolve(compressedFile);
          },
          'image/jpeg',
          quality
        );
      };

      img.src = URL.createObjectURL(file);
    });
  }, []);

  // Enhanced file handler with progress and compression
  const handleEnhancedFileUpload = useCallback(async (files) => {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Show upload progress
      setUploadProgress({
        isUploading: true,
        fileName: file.name,
        progress: 0,
        fileSize: file.size,
        uploadedSize: 0
      });

      try {
        let processedFile = file;

        // Compress images if on mobile and file is large
        if (file.type.startsWith('image/') && file.type !== 'image/gif' && isMobileDevice()) {
          processedFile = await compressImage(file);
          console.log(`Compressed ${file.name} from ${(file.size / 1024).toFixed(1)}KB to ${(processedFile.size / 1024).toFixed(1)}KB`);
        }

        // Simulate upload progress
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => {
            const newProgress = Math.min(prev.progress + 10, 90);
            return {
              ...prev,
              progress: newProgress,
              uploadedSize: Math.floor((newProgress / 100) * prev.fileSize)
            };
          });
        }, 100);

        // Process file
        const reader = new FileReader();
        reader.onload = (event) => {
          clearInterval(progressInterval);
          
          // Complete upload progress
          setUploadProgress(prev => ({
            ...prev,
            progress: 100,
            uploadedSize: prev.fileSize
          }));

          // Determine appropriate emoji and message text
          let emoji = '📎';
          let messageText = processedFile.name;
          
          if (processedFile.type.startsWith('image/')) {
            if (processedFile.type === 'image/gif') {
              emoji = '🎭';
              messageText = `GIF: ${processedFile.name}`;
            } else if (processedFile.type === 'image/png') {
              emoji = '🖼️';
            } else if (processedFile.type === 'image/jpeg' || processedFile.type === 'image/jpg') {
              emoji = '📸';
            } else {
              emoji = '📷';
            }
          } else if (processedFile.type.startsWith('video/')) {
            emoji = '🎥';
            messageText = `Video: ${processedFile.name}`;
          }

          const newMessage = {
            id: Date.now() + Math.random(),
            text: `${emoji} ${messageText}`,
            user: user,
            timestamp: new Date().toISOString(),
            reactions: [],
            file: {
              name: processedFile.name,
              size: processedFile.size,
              type: processedFile.type,
              url: event.target.result,
              isGif: processedFile.type === 'image/gif',
              originalSize: file.size !== processedFile.size ? file.size : undefined
            }
          };

          setChatMessages(prev => [...prev, newMessage]);
          
          // Hide progress after a short delay
          setTimeout(() => {
            setUploadProgress({
              isUploading: false,
              fileName: '',
              progress: 0,
              fileSize: 0,
              uploadedSize: 0
            });
            scrollToBottom();
          }, 1000);
        };

        reader.onerror = () => {
          clearInterval(progressInterval);
          setUploadProgress(prev => ({ ...prev, isUploading: false }));
          console.error('Error reading file:', processedFile.name);
        };

        reader.readAsDataURL(processedFile);

      } catch (error) {
        console.error('Error processing file:', error);
        setUploadProgress(prev => ({ ...prev, isUploading: false }));
      }
    }
  }, [user, scrollToBottom, compressImage, isMobileDevice]);

  // Update file change handler to use enhanced upload
  const handleFileChange = useCallback((e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleEnhancedFileUpload(Array.from(files));
      e.target.value = ''; // Reset input
    }
  }, [handleEnhancedFileUpload]);

  // Specific GIF upload handler
  const handleGifUpload = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/gif';
    input.multiple = true;
    input.onchange = (e) => {
      // eslint-disable-next-line no-use-before-define
      handleFileChange(e);
    };
    input.click();
    // eslint-disable-next-line no-use-before-define
  }, [handleFileChange]);

  // Mobile upload handlers
  const handleMobileCameraPhoto = useCallback(() => {
    mobileCameraPhotoRef.current?.click();
  }, []);

  const handleMobileCameraVideo = useCallback(() => {
    mobileCameraVideoRef.current?.click();
  }, []);

  const handleMobileGallery = useCallback(() => {
    mobileGalleryRef.current?.click();
  }, []);

  // Mobile upload menu handler
  const handleMobileUploadMenu = useCallback(() => {
    setShowMobileUploadMenu(true);
    setShowEmojiPicker(false);
    setShowGifPicker(false);
  }, []);

  const handleMobileUploadAction = useCallback((action) => {
    setShowMobileUploadMenu(false);
    switch (action) {
      case 'camera-photo':
        handleMobileCameraPhoto();
        break;
      case 'camera-video':
        handleMobileCameraVideo();
        break;
      case 'gallery':
        handleMobileGallery();
        break;
      case 'files':
        fileInputRef.current?.click();
        break;
      case 'gif':
        setShowGifPicker(true);
        break;
      default:
        break;
    }
  }, [handleMobileCameraPhoto, handleMobileCameraVideo, handleMobileGallery]);

  // GIF picker handlers
  const handleShowGifPicker = useCallback(() => {
    setShowGifPicker(true);
    setShowEmojiPicker(false);
  }, []);

  const handleGifSelect = useCallback((gifData) => {
    const newMessage = {
      id: Date.now() + Math.random(),
      text: `🎭 GIF: ${gifData.name}`,
      user: user,
      timestamp: new Date().toISOString(),
      reactions: [],
      file: {
        name: gifData.name,
        size: gifData.size,
        type: gifData.type,
        url: gifData.url,
        isGif: true
      }
    };
    setChatMessages(prev => [...prev, newMessage]);
    setTimeout(() => {
      scrollToBottom();
    }, 100);
  }, [user, scrollToBottom]);

  // Handle adding reactions to messages
  const handleReactionAdd = useCallback((messageId, emoji) => {
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
  const [videoCallState, setVideoCallState] = useState({ 
    active: false, 
    withUser: null, 
    minimized: false, 
    audioOnly: false 
  });
  
  // Reaction system state already defined above

  // Message input handlers
  const handleSendMessage = useCallback(() => {
    if (!inputText.trim()) return;
    
    const newMessage = {
      id: Date.now(),
      text: inputText,
      user: user,
      timestamp: new Date().toISOString(),
      reactions: []
    };
    
    setChatMessages(prev => [...prev, newMessage]);
    setInputText('');
    
    // Auto-scroll to the new message
    setTimeout(() => {
      scrollToBottom();
    }, 100);
  }, [inputText, user, scrollToBottom]);

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

  // Video call component
  const MemoizedVideoCall = useMemo(() => (
    <VideoCall 
      callState={videoCallState}
      onEndCall={handleEndCall}
      onToggleMinimize={handleToggleMinimize}
    />
  ), [videoCallState, handleEndCall, handleToggleMinimize]);

  // Function to determine message length category for dynamic styling
  const getMessageLengthCategory = (text) => {
    const length = text.length;
    if (length <= 50) return 'short';
    if (length <= 200) return 'medium';
    if (length <= 500) return 'long';
    return 'very-long';
  };

  return (
    <div className="pro-layout">
      {/* Video Call Component */}
      {MemoizedVideoCall}
      
      {/* Enhanced Sidebar */}
      <div className={`pro-sidebar enhanced-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        {/* Sidebar Header */}
        <div className="pro-sidebar-header">
          <div className="sidebar-logo">
            <div className="logo-icon">
              💬
              {totalUnreadCount > 0 && (
                <div className="logo-unread-badge">{totalUnreadCount > 99 ? '99+' : totalUnreadCount}</div>
              )}
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
          <div className="user-avatar">
            <img 
              src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=4f46e5&color=fff&size=40`}
              alt={user?.name || 'User'}
            />
            <div className="status-indicator online"></div>
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
            {filteredConversations.map(conv => {
              const convColor = getUserColor(conv.id.toString());
              return (
                <div 
                  key={conv.id} 
                  className={`conversation-item enhanced ${selectedConversation === conv.id ? 'active' : ''}`}
                  onClick={() => handleConversationSelect(conv.id)}
                  style={{
                    borderLeftColor: selectedConversation === conv.id ? convColor.border : 'transparent',
                    borderLeftWidth: '3px',
                    borderLeftStyle: 'solid'
                  }}
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
                        <h5 
                          className="conversation-name"
                          style={{
                            color: selectedConversation === conv.id ? convColor.accent : 'inherit'
                          }}
                        >
                          {conv.name}
                        </h5>
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
            );
            })}
          </div>
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
            <button className="footer-btn" title="Help" onClick={() => console.log('Help clicked')}>❓</button>
            {!sidebarCollapsed && <button className="footer-btn" title="Feedback" onClick={() => console.log('Feedback clicked')}>💬</button>}
            <button className="footer-btn" title="Settings" onClick={handleQuickSettings}>⚙️</button>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={`pro-main ${sidebarCollapsed ? 'collapsed' : ''}`}>
        {/* Enhanced Header */}
        <div className="pro-header enhanced-chat-header">
          <div className="header-left">
            <div className="conversation-avatar">
              <img 
                src={currentConversation?.avatar || `https://images.unsplash.com/photo-1516726817505-f5ed825624d8?w=40&h=40&fit=crop&crop=face`}
                alt={currentConversation?.name || 'Chat'}
              />
              <div className={`online-indicator ${isConnected ? 'online' : 'offline'}`}></div>
            </div>
            <div className="conversation-info">
              <h3 className="conversation-title">{currentConversation?.name || 'General Chat'}</h3>
              <div className="conversation-status">
                <span className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
                  {isConnected ? '● Online' : '● Disconnected'}
                </span>
                <span className="participant-count">
                  {currentConversation?.participants || 5} participants
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
            <button className="action-btn voice-call-btn" title="Start voice call">
              📞
            </button>
            <button className="action-btn info-btn" title="Chat info">
              ℹ️
            </button>
            <button onClick={onToggleDarkMode} className="action-btn theme-toggle" title="Toggle theme">
              {darkMode ? '☀️' : '🌙'}
            </button>
            <div className="header-menu">
              <button className="action-btn menu-btn" title="More options">
                ⋮
              </button>
              <div className="dropdown-menu">
                <button className="dropdown-item" onClick={handleQuickSettings}>Settings</button>
                <button className="dropdown-item">Export Chat</button>
                <button className="dropdown-item">Mute Notifications</button>
                <hr className="dropdown-divider" />
                <button onClick={onLogout} className="dropdown-item logout-item">
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="pro-message-list" ref={messagesContainerRef}>
          {chatMessages.map((message, index) => {
            const userColor = getUserColor(message.user.id);
            const isCurrentUser = message.user.id === user?.id;
            return (
              <div 
                key={message.id} 
                className={`pro-message-blurb message-enhanced ${isCurrentUser ? 'current-user-message' : 'other-user-message'}`}
                data-message-id={message.id}
                data-length={getMessageLengthCategory(message.text)}
                data-message-type={isCurrentUser ? 'current-user' : 'other-user'}
                style={{
                  '--message-index': index,
                  animationDelay: `${Math.min(index * 0.1, 1)}s`
                }}
              >
                <div className="message-avatar-container">
                  <div className="message-avatar">
                    <img 
                      src={message.user.avatar || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=32&h=32&fit=crop&crop=face`}
                      alt={message.user.name}
                      onClick={() => handleViewUserProfile(message.user.id, message.user.name)}
                      style={{
                        border: `2px solid ${userColor.border}`,
                        borderRadius: '50%'
                      }}
                    />
                    <div className="avatar-status-ring"></div>
                  </div>
                </div>
                <div 
                  className="message-content" 
                  onClick={() => handleMessageClick(message.id)}
                  style={{
                    backgroundColor: userColor.bg,
                    ...(isCurrentUser ? {
                      borderLeftColor: userColor.border,
                      borderLeftWidth: '3px',
                      borderLeftStyle: 'solid'
                    } : {
                      borderRightColor: userColor.border,
                      borderRightWidth: '3px',
                      borderRightStyle: 'solid'
                    })
                  }}
                >
                  <div className="message-header">
                    <div className="user-info">
                      <div
                        className="user-color-dot"
                        style={{
                          backgroundColor: userColor.border,
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          display: 'inline-block',
                          marginRight: '6px'
                        }}
                      ></div>
                      <span
                        className="user-name"
                        style={{ color: userColor.accent }}
                      >
                        {message.user.name}
                      </span>
                    </div>
                    <span className="timestamp">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                
                {/* Message Text */}
                <div 
                  className="message-text" 
                  data-length={getMessageLengthCategory(message.text)}
                >
                  {message.text}
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
                
                {/* Reactions Display */}
                {message.reactions && message.reactions.length > 0 && (
                  <div className="message-reactions">
                    {message.reactions.map((reaction, index) => (
                      <button
                        key={index}
                        className="reaction-bubble"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReactionAdd(message.id, reaction.emoji);
                        }}
                      >
                        <span className="reaction-emoji">{reaction.emoji}</span>
                        <span className="reaction-count">{reaction.count}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
          })}
          {/* Auto-scroll anchor element */}
          <div ref={messagesEndRef} />
        </div>

        {/* Enhanced Input Area with Voice and File Upload */}
        <div className="pro-chat-input-container enhanced">
          <div className="input-wrapper enhanced">
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

                {/* Input Actions - Left Side */}
                <div className="input-actions left">
                  {/* File Attachment Button */}
                  <button 
                    className="input-btn attachment-btn"
                    onClick={isMobileDevice() ? handleMobileUploadMenu : () => fileInputRef.current?.click()}
                    type="button"
                    title={isMobileDevice() ? "Upload menu" : "Attach files"}
                  >
                    📎
                  </button>

                  {/* GIF Picker Button */}
                  <button 
                    className="input-btn gif-btn"
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
                    className="input-btn voice-btn"
                    onClick={startRecording}
                    type="button"
                    title="Voice message"
                  >
                    🎤
                  </button>

                  {/* Emoji Button */}
                  <button 
                    className="input-btn emoji-btn"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    type="button"
                    title="Add emoji"
                  >
                    😊
                  </button>
                </div>

                {/* Text Input */}
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message..."
                  className="message-input enhanced"
                  rows="1"
                />

                {/* Send Button */}
                <button 
                  onClick={handleSendMessage}
                  disabled={!inputText.trim()}
                  className="send-button enhanced"
                  type="button"
                >
                  <span className="send-icon">➤</span>
                </button>
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

      {/* GIF Picker */}
      <GifPicker
        isOpen={showGifPicker}
        onGifSelect={handleGifSelect}
        onClose={() => setShowGifPicker(false)}
      />

      {/* Mobile Upload Menu */}
      {showMobileUploadMenu && (
        <div className="mobile-upload-overlay">
          <div className="mobile-upload-menu">
            <div className="mobile-upload-header">
              <h3>Upload Options</h3>
              <button 
                className="close-btn" 
                onClick={() => setShowMobileUploadMenu(false)}
              >
                ×
              </button>
            </div>
            <div className="mobile-upload-options">
              <button 
                className="mobile-upload-option"
                onClick={() => handleMobileUploadAction('camera-photo')}
              >
                <span className="option-icon">📷</span>
                <span className="option-text">Take Photo</span>
                <span className="option-desc">Use camera to take a photo</span>
              </button>
              <button 
                className="mobile-upload-option"
                onClick={() => handleMobileUploadAction('camera-video')}
              >
                <span className="option-icon">🎥</span>
                <span className="option-text">Record Video</span>
                <span className="option-desc">Use camera to record video</span>
              </button>
              <button 
                className="mobile-upload-option"
                onClick={() => handleMobileUploadAction('gallery')}
              >
                <span className="option-icon">🖼️</span>
                <span className="option-text">Photo Library</span>
                <span className="option-desc">Choose from your photos/videos</span>
              </button>
              <button 
                className="mobile-upload-option"
                onClick={() => handleMobileUploadAction('gif')}
              >
                <span className="option-icon">🎭</span>
                <span className="option-text">GIF Library</span>
                <span className="option-desc">Choose from GIF collection</span>
              </button>
              <button 
                className="mobile-upload-option"
                onClick={() => handleMobileUploadAction('files')}
              >
                <span className="option-icon">📁</span>
                <span className="option-text">Browse Files</span>
                <span className="option-desc">Upload documents and other files</span>
              </button>
            </div>
          </div>
        </div>
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