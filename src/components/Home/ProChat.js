import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import UserProfileModal from '../UserProfile';
import VideoCall from './VideoCall';
import SettingsModal from './SettingsModal';
import VideoDebugTest from '../Debug/VideoDebugTest';
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
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  
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
  
  // Refs
  const fileInputRef = useRef(null);
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
    { id: 'teal', bg: '#e0f2f1', border: '#009688', accent: '#00695c' }, // Teal
    { id: 'lightgreen', bg: '#f1f8e9', border: '#8bc34a', accent: '#689f38' }, // Light Green
    { id: 'indigo', bg: '#e8eaf6', border: '#3f51b5', accent: '#303f9f' }, // Indigo
    { id: 'amber', bg: '#fff8e1', border: '#ffc107', accent: '#ffa000' }, // Amber
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
    setShowSettingsModal(true);
  }, []);

  const handleSaveProfile = useCallback(async (updatedUser) => {
    try {
      // In a real app, this would make an API call to update the user profile
      console.log('Saving user profile:', updatedUser);
      
      // For now, we'll just update the local user object if there's a parent handler
      // The color preference is already saved to localStorage in ColorPreferences component
      
      return true; // Indicate success
    } catch (error) {
      console.error('Error saving profile:', error);
      throw error;
    }
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
        } else if (file.type.startsWith('video/')) {
          // Handle video files with improved error handling and compatibility
          console.log('Processing video file:', file.name, file.type, 'Size:', file.size);
          
          // Check file size first (browser limitation)
          if (file.size > 100 * 1024 * 1024) { // 100MB limit for browser processing
            console.warn('Video file too large for browser processing');
            const videoUrl = URL.createObjectURL(file);
            const newMessage = {
              id: Date.now() + Math.random(),
              text: `🎥 ${file.name} (Large file - limited preview)`,
              user: user,
              timestamp: new Date().toISOString(),
              reactions: [],
              file: {
                name: file.name,
                size: file.size,
                type: file.type,
                url: videoUrl
              }
            };
            setChatMessages(prev => [...prev, newMessage]);
            setTimeout(() => scrollToBottom(), 100);
            return;
          }
          
          const videoUrl = URL.createObjectURL(file);
          console.log('Object URL created:', videoUrl);
          
          // Use a more compatible approach
          const video = document.createElement('video');
          video.muted = true; // Important for autoplay policies
          video.playsInline = true; // Important for mobile
          
          let metadataLoaded = false;
          let timeoutId;
          
          const cleanup = () => {
            if (timeoutId) clearTimeout(timeoutId);
            video.removeEventListener('loadedmetadata', onMetadataLoaded);
            video.removeEventListener('error', onVideoError);
            video.removeEventListener('seeked', onSeeked);
          };
          
          const createFallbackMessage = (reason = '') => {
            console.log('Creating fallback message:', reason);
            const newMessage = {
              id: Date.now() + Math.random(),
              text: `🎥 ${file.name}${reason ? ` (${reason})` : ''}`,
              user: user,
              timestamp: new Date().toISOString(),
              reactions: [],
              file: {
                name: file.name,
                size: file.size,
                type: file.type,
                url: videoUrl
              }
            };
            setChatMessages(prev => [...prev, newMessage]);
            setTimeout(() => scrollToBottom(), 100);
            cleanup();
          };
          
          const onMetadataLoaded = () => {
            if (metadataLoaded) return;
            metadataLoaded = true;
            
            console.log('Video metadata loaded:', {
              duration: video.duration,
              width: video.videoWidth,
              height: video.videoHeight,
              readyState: video.readyState
            });
            
            if (!video.duration || isNaN(video.duration)) {
              createFallbackMessage('No duration info');
              return;
            }
            
            // Try to get thumbnail
            try {
              const seekTime = Math.min(video.duration * 0.1, 3); // 10% into video or 3 seconds max
              console.log('Seeking to time:', seekTime);
              video.currentTime = seekTime;
            } catch (error) {
              console.error('Error seeking video:', error);
              createFallbackMessage('Thumbnail generation failed');
            }
          };
          
          const onSeeked = () => {
            console.log('Video seeked, attempting thumbnail generation...');
            try {
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              
              // Set canvas size based on video or use defaults
              const targetWidth = 320;
              const targetHeight = 180;
              canvas.width = targetWidth;
              canvas.height = targetHeight;
              
              // Try to draw the video frame
              ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
              
              // Test if canvas has content
              const imageData = ctx.getImageData(0, 0, 1, 1);
              if (imageData.data.every(val => val === 0)) {
                console.warn('Canvas is empty, video frame not captured');
                createFallbackMessage('Thumbnail capture failed');
                return;
              }
              
              const thumbnail = canvas.toDataURL('image/jpeg', 0.8);
              const duration = Math.round(video.duration);
              const durationFormatted = `${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}`;
              
              console.log('Successfully created video message with thumbnail');
              
              const newMessage = {
                id: Date.now() + Math.random(),
                text: `🎥 ${file.name} (${durationFormatted})`,
                user: user,
                timestamp: new Date().toISOString(),
                reactions: [],
                file: {
                  name: file.name,
                  size: file.size,
                  type: file.type,
                  url: videoUrl,
                  thumbnail: thumbnail,
                  duration: durationFormatted,
                  width: video.videoWidth,
                  height: video.videoHeight
                }
              };
              setChatMessages(prev => [...prev, newMessage]);
              setTimeout(() => scrollToBottom(), 100);
              cleanup();
              
            } catch (error) {
              console.error('Error generating thumbnail:', error);
              createFallbackMessage('Thumbnail error');
            }
          };
          
          const onVideoError = (error) => {
            console.error('Video loading error:', error, video.error);
            createFallbackMessage('Loading failed');
          };
          
          // Set up event listeners
          video.addEventListener('loadedmetadata', onMetadataLoaded);
          video.addEventListener('error', onVideoError);
          video.addEventListener('seeked', onSeeked);
          
          // Set timeout for loading
          timeoutId = setTimeout(() => {
            if (!metadataLoaded) {
              console.warn('Video loading timeout');
              createFallbackMessage('Loading timeout');
            }
          }, 10000); // 10 second timeout
          
          // Start loading
          console.log('Setting video source...');
          video.src = videoUrl;
        } else {
          // Handle other file types
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

  // Check for debug mode
  const isDebugMode = new URLSearchParams(window.location.search).get('debug') === 'video';
  
  // If debug mode is enabled, show debug component
  if (isDebugMode) {
    return <VideoDebugTest />;
  }

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
            <button onClick={onLogout} className="action-btn logout-btn" title="Logout / Disconnect">
              🚪
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
          {chatMessages.map(message => {
            const userColor = getUserColor(message.user.id);
            return (
              <div key={message.id} className="pro-message-blurb" data-message-id={message.id}>
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
                </div>
                <div 
                  className="message-content" 
                  onClick={() => handleMessageClick(message.id)}
                  style={{
                    backgroundColor: userColor.bg,
                    borderLeftColor: userColor.border,
                    borderLeftWidth: '3px',
                    borderLeftStyle: 'solid'
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
                      <div className="image-attachment">
                        <img 
                          src={message.file.url} 
                          alt={message.file.name}
                          className="attached-image"
                          onClick={() => {
                            // Open image in lightbox/modal
                            handleOpenLightbox(message.file.url, message.file.name);
                          }}
                          style={{
                            maxWidth: '300px',
                            maxHeight: '200px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            objectFit: 'cover'
                          }}
                        />
                        <div className="image-caption">
                          {message.file.name} ({(message.file.size / 1024).toFixed(1)} KB)
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
                              height: 'auto'
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
                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
                  style={{ display: 'none' }}
                  multiple
                  onChange={handleFileChange}
                />

                {/* Input Actions - Left Side */}
                <div className="input-actions left">
                  {/* File Attachment Button */}
                  <button 
                    className="input-btn attachment-btn"
                    onClick={() => fileInputRef.current?.click()}
                    type="button"
                    title="Attach files"
                  >
                    📎
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

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        user={user}
        onSaveProfile={handleSaveProfile}
        darkMode={darkMode}
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