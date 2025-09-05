import React, { useState, useCallback, useMemo, useRef } from 'react';
import UserProfileModal from '../UserProfile';
import VideoCall from './VideoCall';
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
  
  // Reaction system state
  const [showReactionPicker, setShowReactionPicker] = useState(null); // messageId or null
  const [reactionPickerPosition, setReactionPickerPosition] = useState({ x: 0, y: 0 });
  const [messageReactions, setMessageReactions] = useState(new Map());
  
  // File upload system state
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(new Map()); // fileId -> { file, progress, status, preview }
  
  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [recordingBlob, setRecordingBlob] = useState(null);
  const recordingIntervalRef = useRef(null);
  const audioChunksRef = useRef([]);
  
  // File upload configuration
  const maxFileSize = 50 * 1024 * 1024; // 50MB (increased for video files)
  const allowedFileTypes = useMemo(() => ({
    images: [
      // Popular raster formats
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      // Advanced formats
      'image/avif', 'image/heic', 'image/heif',
      // Vector formats
      'image/svg+xml',
      // Raw/professional formats
      'image/tiff', 'image/bmp', 'image/x-icon'
    ],
    videos: [
      // Popular web formats
      'video/mp4', 'video/webm', 'video/ogg',
      // Common formats
      'video/avi', 'video/mov', 'video/quicktime',
      // Professional formats
      'video/x-msvideo', 'video/x-ms-wmv',
      // Mobile formats
      'video/3gpp', 'video/3gpp2',
      // Streaming formats
      'video/x-flv', 'video/x-matroska'
    ],
    documents: ['application/pdf', 'text/plain', 'application/msword', 
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    archives: ['application/zip', 'application/x-rar-compressed'],
    audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3', 'audio/aac', 'audio/flac']
  }), []);
  
  const getAllowedTypes = useCallback(() => {
    const types = Object.values(allowedFileTypes).flat();
    console.log('📋 Supported file types:', types);
    return types;
  }, [allowedFileTypes]);
  
  // Available emoji reactions
  const availableReactions = [
    '❤️', '😂', '😮', '😢', '😡', '👍', '👎', '🎉', 
    '🔥', '✨', '👏', '🤔', '😍', '🙄', '💯', '👀'
  ];

  // Refs
  const fileInputRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const isUserScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef(null);
  
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
    // TODO: Implement quick settings
    console.log('Quick settings clicked');
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

  const [chatMessages, setChatMessages] = useState([
    {
      id: 1,
      text: "Hey! 👋",
      user: { id: 'user1', name: 'Alice Johnson', avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=40&h=40&fit=crop&crop=face' },
      timestamp: new Date(Date.now() - 300000).toISOString(),
      reactions: []
    },
    {
      id: 2,
      text: "Welcome to the enhanced chat application! This is a medium-length message to demonstrate how the message cards scale based on content length.",
      user: { id: 'system', name: 'System', avatar: null },
      timestamp: new Date(Date.now() - 240000).toISOString(),
      reactions: []
    },
    {
      id: 3,
      text: "This is a much longer message that demonstrates how the chat interface adapts to longer content. When users write extensive messages with detailed explanations, multiple sentences, and comprehensive information, the message cards automatically expand to accommodate the content while maintaining readability and visual hierarchy. The system intelligently adjusts padding, background styling, and maximum width to ensure optimal presentation regardless of message length.",
      user: { id: 'user2', name: 'Bob Wilson', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face' },
      timestamp: new Date(Date.now() - 180000).toISOString(),
      reactions: []
    },
    {
      id: 4,
      text: "Perfect! 🎉",
      user: { id: 'user1', name: 'Alice Johnson', avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=40&h=40&fit=crop&crop=face' },
      timestamp: new Date(Date.now() - 120000).toISOString(),
      reactions: []
    },
    {
      id: 5,
      text: "This is an extremely long message that serves as an example of how the chat interface handles very extensive content. In real-world applications, users often need to share detailed information, comprehensive explanations, lengthy instructions, or elaborate discussions that span multiple paragraphs. The dynamic scaling system ensures that such messages are presented in an optimal format with appropriate styling, enhanced readability features, distinctive visual treatment, and proper spacing that maintains the overall chat flow while giving long-form content the space and attention it deserves. The system automatically detects content length and applies the most suitable styling approach to ensure excellent user experience across all message types and lengths.",
      user: { id: 'user3', name: 'Charlie Brown', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face' },
      timestamp: new Date(Date.now() - 60000).toISOString(),
      reactions: []
    }
  ]);

  const [inputText, setInputText] = useState('');

  // Enhanced features state
  const [profileModal, setProfileModal] = useState({ open: false, userId: null, username: null });
  const [videoCallState, setVideoCallState] = useState({ 
    active: false, 
    withUser: null, 
    minimized: false, 
    audioOnly: false 
  });

  // Lightbox state for image viewing
  const [lightboxImage, setLightboxImage] = useState(null); // { url, name, size, messageId, attachmentIndex }
  
  // Auto-scroll state
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Message input handlers
  const sendMessageWithAttachments = useCallback((text, attachments = []) => {
    console.log('🚀 sendMessageWithAttachments called:', { text, attachments });
    const newMessage = {
      id: Date.now(),
      text: text || '',
      user: user,
      timestamp: new Date().toISOString(),
      reactions: [],
      attachments: attachments
    };
    
    console.log('📝 Created new message:', newMessage);
    setChatMessages(prev => [...prev, newMessage]);
    return newMessage.id;
  }, [user]);

  const handleSendMessage = useCallback(() => {
    if (!inputText.trim()) return;
    
    const newMessage = {
      id: Date.now(),
      text: inputText,
      user: user,
      timestamp: new Date().toISOString(),
      reactions: [],
      attachments: []
    };
    
    setChatMessages(prev => [...prev, newMessage]);
    setInputText('');
  }, [inputText, user]);

  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  // Reaction handlers
  const handleMessageClick = useCallback((e, messageId) => {
    e.stopPropagation();
    
    if (showReactionPicker === messageId) {
      setShowReactionPicker(null);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    setReactionPickerPosition({
      x: rect.left + rect.width / 2,
      y: rect.top - 10
    });
    setShowReactionPicker(messageId);
  }, [showReactionPicker]);

  const handleReactionSelect = useCallback((messageId, emoji) => {
    setMessageReactions(prev => {
      const newReactions = new Map(prev);
      const messageReactionsData = newReactions.get(messageId) || {};
      
      if (messageReactionsData[emoji]) {
        // Check if current user already reacted with this emoji
        const userReacted = messageReactionsData[emoji].users.some(u => u.id === user.id);
        
        if (userReacted) {
          // Remove user's reaction
          messageReactionsData[emoji].users = messageReactionsData[emoji].users.filter(u => u.id !== user.id);
          messageReactionsData[emoji].count = messageReactionsData[emoji].users.length;
          
          if (messageReactionsData[emoji].count === 0) {
            delete messageReactionsData[emoji];
          }
        } else {
          // Add user's reaction
          messageReactionsData[emoji].users.push(user);
          messageReactionsData[emoji].count++;
        }
      } else {
        // Create new reaction
        messageReactionsData[emoji] = {
          count: 1,
          users: [user]
        };
      }
      
      newReactions.set(messageId, messageReactionsData);
      return newReactions;
    });
    
    setShowReactionPicker(null);
  }, [user]);

  const closeReactionPicker = useCallback(() => {
    setShowReactionPicker(null);
  }, []);

  // File upload handlers
  const validateFile = useCallback((file) => {
    console.log('🔍 Validating file:', {
      name: file.name,
      type: file.type,
      size: file.size,
      sizeInMB: (file.size / (1024 * 1024)).toFixed(2),
      maxSizeInMB: (maxFileSize / (1024 * 1024)),
      allowedTypes: getAllowedTypes()
    });
    
    const errors = [];
    
    // Check file size
    if (file.size > maxFileSize) {
      errors.push(`File size must be less than ${maxFileSize / (1024 * 1024)}MB`);
    }
    
    // Check file type
    const allowedTypes = getAllowedTypes();
    if (!allowedTypes.includes(file.type)) {
      console.log(`❌ File type ${file.type} not in allowed types:`, allowedTypes);
      errors.push(`File type ${file.type} is not supported`);
    } else {
      console.log(`✅ File type ${file.type} is supported`);
    }
    
    if (errors.length > 0) {
      console.error('❌ Validation errors:', errors);
    } else {
      console.log('✅ File validation passed');
    }
    
    return errors;
  }, [maxFileSize, getAllowedTypes]);

  const getFileIcon = useCallback((mimeType, extension) => {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.startsWith('video/')) return '🎥';
    if (mimeType.startsWith('audio/')) return '🎵';
    if (mimeType === 'application/pdf') return '📄';
    if (mimeType.includes('word') || extension === 'doc' || extension === 'docx') return '📝';
    if (mimeType.includes('sheet') || extension === 'xls' || extension === 'xlsx') return '📊';
    if (mimeType.includes('presentation') || extension === 'ppt' || extension === 'pptx') return '📽️';
    if (mimeType.includes('zip') || mimeType.includes('rar') || extension === 'zip' || extension === 'rar') return '🗂️';
    if (mimeType === 'text/plain') return '📃';
    return '📎';
  }, []);

  const generateFilePreview = useCallback(async (file) => {
    console.log('🖼️ Generating preview for file:', file.name, file.type);
    return new Promise((resolve) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const preview = {
            type: 'image',
            url: e.target.result,
            width: null,
            height: null
          };
          console.log('✅ Generated image preview:', preview.url.substring(0, 50) + '...');
          resolve(preview);
        };
        reader.readAsDataURL(file);
      } else if (file.type.startsWith('video/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const preview = {
            type: 'video',
            url: e.target.result,
            thumbnail: null
          };
          console.log('✅ Generated video preview:', preview.url.substring(0, 50) + '...');
          resolve(preview);
        };
        reader.readAsDataURL(file);
      } else if (file.type.startsWith('audio/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const preview = {
            type: 'audio',
            url: e.target.result
          };
          console.log('✅ Generated audio preview:', preview.url.substring(0, 50) + '...');
          resolve(preview);
        };
        reader.readAsDataURL(file);
      } else {
        // Generate thumbnail based on file type
        const fileExtension = file.name.split('.').pop().toLowerCase();
        const preview = {
          type: 'file',
          icon: getFileIcon(file.type, fileExtension),
          extension: fileExtension
        };
        console.log('✅ Generated file preview:', preview);
        resolve(preview);
      }
    });
  }, [getFileIcon]);

  const simulateUpload = useCallback(async (fileId, file, previewData) => {
    console.log('📤 Starting upload simulation for:', { fileId, fileName: file.name });
    
    if (!previewData) {
      console.error('❌ Preview data not provided for upload:', fileId);
      return;
    }

    console.log('📁 Using preview data:', previewData);

    // Simulate upload delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Create a message with the uploaded file
    const fileAttachment = {
      id: fileId,
      name: file.name,
      size: file.size,
      type: file.type,
      url: previewData.url,
      uploadedAt: new Date().toISOString()
    };
    
    console.log('📎 Created file attachment:', fileAttachment);
    
    // Send message with attachment
    sendMessageWithAttachments(`📎 ${file.name}`, [fileAttachment]);
    
    // Clean up the uploading file tracking
    setUploadingFiles(prev => {
      const updated = new Map(prev);
      updated.delete(fileId);
      return updated;
    });
    
    console.log('✅ Upload simulation completed for:', file.name);
  }, [sendMessageWithAttachments]);

  const handleFileSelect = useCallback(async (files) => {
    console.log('📋 Processing file selection:', files);
    const fileArray = Array.from(files);
    
    for (const file of fileArray) {
      console.log('🔍 Validating file:', file.name, file.type, 'Size:', file.size);
      const errors = validateFile(file);
      if (errors.length > 0) {
        console.error(`❌ File validation failed for ${file.name}:`, errors);
        continue;
      }

      const fileId = `${Date.now()}-${Math.random()}`;
      console.log('🆔 Generated file ID:', fileId);
      
      const preview = await generateFilePreview(file);
      console.log('🖼️ Generated preview:', preview);
      
      setUploadingFiles(prev => {
        const updated = new Map(prev);
        updated.set(fileId, {
          file,
          progress: 0,
          status: 'uploading',
          preview,
          id: fileId
        });
        return updated;
      });

      // Start upload simulation with preview data
      simulateUpload(fileId, file, preview);
    }
  }, [validateFile, generateFilePreview, simulateUpload]);

  const handleDragEnter = useCallback((e) => {
    console.log('🎯 Drag enter triggered');
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only hide drag overlay if leaving the main container
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e) => {
    console.log('🎯 Drop event triggered');
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    console.log('📂 Files dropped:', files.length, files);
    if (files.length > 0) {
      handleFileSelect(files);
    } else {
      console.log('❌ No files in drop event');
    }
  }, [handleFileSelect]);

  // Voice recording functionality
  const startRecording = useCallback(async () => {
    try {
      // Check browser support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Voice recording is not supported in your browser. Please use a modern browser like Chrome, Firefox, or Safari.');
        return;
      }

      if (!window.MediaRecorder) {
        alert('MediaRecorder is not supported in your browser. Please update your browser to use voice recording.');
        return;
      }

      console.log('🎤 Starting voice recording...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });

      // Check supported MIME types
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/mp4';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = ''; // Let browser choose
          }
        }
      }

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

      audioChunksRef.current = [];
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        console.log('🛑 Recording stopped');
        const audioBlob = new Blob(audioChunksRef.current, { 
          type: mimeType || 'audio/webm' 
        });
        setRecordingBlob(audioBlob);
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingDuration(0);

      // Start duration timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

      console.log('✅ Recording started successfully');
    } catch (error) {
      console.error('❌ Error starting recording:', error);
      if (error.name === 'NotAllowedError') {
        alert('Microphone access denied. Please allow microphone access and try again.');
      } else if (error.name === 'NotFoundError') {
        alert('No microphone found. Please connect a microphone and try again.');
      } else {
        alert('Unable to access microphone. Please check your permissions and try again.');
      }
    }
  }, []);

  const stopRecording = useCallback(() => {
    console.log('🛑 Stopping voice recording...');
    
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
    }
    
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
    
    setIsRecording(false);
    setMediaRecorder(null);
  }, [mediaRecorder]);

  const cancelRecording = useCallback(() => {
    console.log('❌ Cancelling voice recording...');
    
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
    }
    
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
    
    setIsRecording(false);
    setMediaRecorder(null);
    setRecordingBlob(null);
    setRecordingDuration(0);
    audioChunksRef.current = [];
  }, [mediaRecorder]);

  const sendVoiceMessage = useCallback(() => {
    if (!recordingBlob) {
      console.error('❌ No recording blob to send');
      return;
    }

    console.log('🎵 Sending voice message...');
    
    // Create a file-like object from the blob
    const voiceFile = new File([recordingBlob], `voice-${Date.now()}.webm`, {
      type: 'audio/webm;codecs=opus'
    });

    // Create audio URL for playback
    const audioUrl = URL.createObjectURL(recordingBlob);
    
    // Create voice message attachment
    const voiceAttachment = {
      id: `voice-${Date.now()}`,
      name: `Voice message (${Math.floor(recordingDuration / 60)}:${(recordingDuration % 60).toString().padStart(2, '0')})`,
      size: recordingBlob.size,
      type: 'audio/webm;codecs=opus',
      url: audioUrl,
      duration: recordingDuration,
      isVoiceMessage: true,
      uploadedAt: new Date().toISOString()
    };

    // Send the voice message
    sendMessageWithAttachments('🎤 Voice message', [voiceAttachment]);
    
    // Clean up
    setRecordingBlob(null);
    setRecordingDuration(0);
    
    console.log('✅ Voice message sent successfully');
  }, [recordingBlob, recordingDuration, sendMessageWithAttachments]);

  const formatRecordingTime = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Auto-scroll functionality
  const scrollToBottom = useCallback((smooth = true) => {
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      const scrollOptions = {
        top: container.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto'
      };
      container.scrollTo(scrollOptions);
      console.log('📜 Scrolled to bottom');
    }
  }, []);

  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return;
    
    const container = messagesContainerRef.current;
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    
    // Update user scrolling state
    isUserScrollingRef.current = !isNearBottom;
    
    // Show/hide scroll button
    setShowScrollButton(!isNearBottom);
    
    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    // Reset user scrolling flag after a delay
    scrollTimeoutRef.current = setTimeout(() => {
      isUserScrollingRef.current = false;
    }, 1000);
    
    console.log('📜 Scroll position - Near bottom:', isNearBottom, 'User scrolling:', isUserScrollingRef.current);
  }, []);

  const shouldAutoScroll = useCallback(() => {
    if (!messagesContainerRef.current) return true;
    
    const container = messagesContainerRef.current;
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    
    // Auto-scroll if user is near bottom or not actively scrolling
    return isNearBottom || !isUserScrollingRef.current;
  }, []);

  // Close reaction picker when clicking outside
  const handleOutsideClick = useCallback((e) => {
    if (showReactionPicker && !e.target.closest('.reaction-picker') && !e.target.closest('.pro-message-blurb')) {
      closeReactionPicker();
    }
  }, [showReactionPicker, closeReactionPicker]);

  // Lightbox handlers
  const handleCloseLightbox = useCallback(() => {
    setLightboxImage(null);
  }, []);

  const handleOpenLightbox = useCallback((attachment, messageId, attachmentIndex) => {
    setLightboxImage({
      url: attachment.url,
      name: attachment.name,
      size: attachment.size,
      messageId,
      attachmentIndex
    });
  }, []);

  const handleLightboxKeyPress = useCallback((e) => {
    if (e.key === 'Escape') {
      handleCloseLightbox();
    }
  }, [handleCloseLightbox]);

  React.useEffect(() => {
    if (showReactionPicker) {
      document.addEventListener('click', handleOutsideClick);
      return () => document.removeEventListener('click', handleOutsideClick);
    }
  }, [showReactionPicker, handleOutsideClick]);

  // Lightbox keyboard event listener
  React.useEffect(() => {
    if (lightboxImage) {
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          handleCloseLightbox();
        }
      };
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [lightboxImage, handleCloseLightbox]);

  // Voice recording cleanup
  React.useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
      }
    };
  }, [mediaRecorder]);

  // Auto-scroll on new messages
  React.useEffect(() => {
    if (shouldAutoScroll()) {
      // Use setTimeout to ensure DOM has updated
      setTimeout(() => {
        scrollToBottom(true);
      }, 100);
    }
  }, [chatMessages, shouldAutoScroll, scrollToBottom]);

  // Auto-scroll cleanup
  React.useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // Modal handlers
  const handleViewUserProfile = useCallback((userId, username) => {
    setProfileModal({ open: true, userId, username });
  }, []);

  const handleCloseProfileModal = useCallback(() => {
    setProfileModal({ open: false, userId: null, username: null });
  }, []);

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
              <button className="action-btn" title="Settings">⚙️</button>
              <button className="action-btn" title="Profile">👤</button>
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
      <div 
        className={`pro-main ${sidebarCollapsed ? 'collapsed' : ''}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
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
                <button className="dropdown-item">Settings</button>
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
        <div 
          className="pro-message-list"
          ref={messagesContainerRef}
          onScroll={handleScroll}
        >
          {chatMessages.map(message => {
            const reactions = messageReactions.get(message.id) || {};
            return (
              <div key={message.id} className="pro-message-blurb" data-message-id={message.id}>
                <div className="message-avatar">
                  <img 
                    src={message.user.avatar || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=32&h=32&fit=crop&crop=face`}
                    alt={message.user.name}
                    onClick={() => handleViewUserProfile(message.user.id, message.user.name)}
                  />
                </div>
                <div className="message-content">
                  <div className="message-header">
                    <span className="user-name">{message.user.name}</span>
                    <span className="timestamp">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div 
                    className="message-text" 
                    data-length={getMessageLengthCategory(message.text)}
                    onClick={(e) => handleMessageClick(e, message.id)}
                  >
                    {message.text}
                  </div>
                  
                  {/* Display attachments */}
                  {message.attachments && message.attachments.length > 0 && (
                    <div className="message-attachments">
                      {message.attachments.map((attachment, index) => (
                        <div key={attachment.id || index} className="attachment-item">
                          {attachment.type.startsWith('image/') ? (
                            <div className="image-attachment">
                              <img 
                                src={attachment.url} 
                                alt={attachment.name}
                                className="inline-image"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenLightbox(attachment, message.id, index);
                                }}
                                onLoad={(e) => {
                                  e.target.classList.add('loaded');
                                }}
                                onError={(e) => {
                                  console.error('Failed to load image:', attachment.name);
                                  e.target.style.display = 'none';
                                }}
                              />
                              <div className="image-overlay">
                                <span className="image-name">{attachment.name}</span>
                                <span className="image-size">{(attachment.size / 1024 / 1024).toFixed(2)} MB</span>
                              </div>
                            </div>
                          ) : attachment.type.startsWith('video/') ? (
                            <div className="video-attachment">
                              <video 
                                src={attachment.url} 
                                className="inline-video"
                                controls
                                preload="metadata"
                                onError={(e) => {
                                  console.error('Failed to load video:', attachment.name);
                                  e.target.style.display = 'none';
                                }}
                              />
                              <div className="video-overlay">
                                <span className="video-name">{attachment.name}</span>
                                <span className="video-size">{(attachment.size / 1024 / 1024).toFixed(2)} MB</span>
                              </div>
                            </div>
                          ) : attachment.type.startsWith('audio/') ? (
                            attachment.isVoiceMessage ? (
                              <div className="voice-message-attachment">
                                <div className="voice-message-header">
                                  <span className="voice-message-icon">🎤</span>
                                  <span className="voice-message-title">{attachment.name}</span>
                                </div>
                                <audio 
                                  src={attachment.url} 
                                  className="voice-message-player"
                                  controls
                                  preload="metadata"
                                  onError={(e) => {
                                    console.error('Failed to load voice message:', attachment.name);
                                    e.target.style.display = 'none';
                                  }}
                                />
                              </div>
                            ) : (
                              <div className="audio-attachment">
                                <audio 
                                  src={attachment.url} 
                                  className="inline-audio"
                                  controls
                                  preload="metadata"
                                  onError={(e) => {
                                    console.error('Failed to load audio:', attachment.name);
                                    e.target.style.display = 'none';
                                  }}
                                />
                                <div className="audio-info">
                                  <span className="audio-name">🎵 {attachment.name}</span>
                                  <span className="audio-size">{(attachment.size / 1024 / 1024).toFixed(2)} MB</span>
                                </div>
                              </div>
                            )
                          ) : (
                            <div className="file-attachment">
                              <div className="file-icon">
                                {attachment.type.includes('pdf') ? '📄' :
                                 attachment.type.includes('zip') || attachment.type.includes('rar') ? '📦' :
                                 attachment.type.includes('doc') ? '📝' :
                                 attachment.type.includes('text') ? '📃' : '📄'}
                              </div>
                              <div className="file-info">
                                <span className="file-name">{attachment.name}</span>
                                <span className="file-size">{(attachment.size / 1024 / 1024).toFixed(2)} MB</span>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Display reactions */}
                  {Object.keys(reactions).length > 0 && (
                    <div className="message-reactions">
                      {Object.entries(reactions).map(([emoji, reactionData]) => (
                        <button
                          key={emoji}
                          className={`reaction-button ${reactionData.users.some(u => u.id === user.id) ? 'user-reacted' : ''}`}
                          onClick={() => handleReactionSelect(message.id, emoji)}
                          title={`${reactionData.users.map(u => u.name).join(', ')}`}
                        >
                          <span className="reaction-emoji">{emoji}</span>
                          <span className="reaction-count">{reactionData.count}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Reaction Picker */}
        {showReactionPicker && (
          <div 
            className="reaction-picker"
            style={{
              position: 'fixed',
              left: `${reactionPickerPosition.x}px`,
              top: `${reactionPickerPosition.y}px`,
              transform: 'translate(-50%, -100%)',
              zIndex: 1000
            }}
          >
            <div className="reaction-picker-arrow"></div>
            <div className="reaction-picker-content">
              {availableReactions.map(emoji => (
                <button
                  key={emoji}
                  className="reaction-option"
                  onClick={() => handleReactionSelect(showReactionPicker, emoji)}
                  title={`React with ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="pro-chat-input-container">
          {isRecording || recordingBlob ? (
            /* Voice Recording Interface */
            <div className="voice-recording-interface">
              {isRecording ? (
                <div className="recording-active">
                  <div className="recording-indicator">
                    <div className="recording-dot"></div>
                    <span className="recording-text">Recording...</span>
                    <span className="recording-time">{formatRecordingTime(recordingDuration)}</span>
                  </div>
                  <div className="recording-controls">
                    <button 
                      className="cancel-recording-btn"
                      onClick={cancelRecording}
                      title="Cancel recording"
                    >
                      ❌
                    </button>
                    <button 
                      className="stop-recording-btn"
                      onClick={stopRecording}
                      title="Stop recording"
                    >
                      ⏹️
                    </button>
                  </div>
                </div>
              ) : recordingBlob ? (
                <div className="recording-preview">
                  <div className="voice-preview">
                    <div className="voice-icon">🎤</div>
                    <span className="voice-duration">{formatRecordingTime(recordingDuration)}</span>
                    <audio 
                      controls 
                      src={URL.createObjectURL(recordingBlob)}
                      className="voice-preview-player"
                    />
                  </div>
                  <div className="voice-preview-controls">
                    <button 
                      className="discard-voice-btn"
                      onClick={cancelRecording}
                      title="Discard recording"
                    >
                      🗑️
                    </button>
                    <button 
                      className="send-voice-btn"
                      onClick={sendVoiceMessage}
                      title="Send voice message"
                    >
                      ➤
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            /* Normal Input Interface */
            <div className="input-wrapper">
              <input
                type="file"
                multiple
                accept={getAllowedTypes().join(',')}
                onChange={(e) => {
                  console.log('📂 File input changed:', e.target.files);
                  handleFileSelect(e.target.files);
                }}
                style={{ display: 'none' }}
                ref={fileInputRef}
              />
              <button 
                className="file-upload-btn"
                onClick={() => {
                  console.log('📁 File upload button clicked');
                  fileInputRef.current?.click();
                }}
                title="Upload files"
              >
                📎
              </button>
              <button 
                className="voice-record-btn"
                onClick={startRecording}
                title="Record voice message"
              >
                🎤
              </button>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className="message-input"
                rows="1"
              />
              <button 
                onClick={handleSendMessage}
                disabled={!inputText.trim()}
                className="send-button"
              >
                Send
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Drag and Drop Overlay */}
      {isDragOver && (
        <div className="drag-overlay">
          <div className="drag-content">
            <div className="drag-icon">📁</div>
            <h3>Drop files here to upload</h3>
            <p>Supports images, documents, videos, and audio files</p>
            <div className="supported-formats">
              <span>Max size: 10MB</span>
            </div>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {profileModal.open && (
        <UserProfileModal 
          userId={profileModal.userId}
          username={profileModal.username}
          onClose={handleCloseProfileModal}
        />
      )}

      {/* Lightbox for image viewing */}
      {lightboxImage && (
        <div 
          className="lightbox-overlay"
          onClick={handleCloseLightbox}
          onKeyDown={handleLightboxKeyPress}
          tabIndex={0}
        >
          <div 
            className="lightbox-content"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              className="lightbox-close"
              onClick={handleCloseLightbox}
              aria-label="Close lightbox"
            >
              ✕
            </button>
            <img 
              src={lightboxImage.url} 
              alt={lightboxImage.name}
              className="lightbox-image"
            />
            <div className="lightbox-info">
              <h3 className="lightbox-title">{lightboxImage.name}</h3>
              <p className="lightbox-size">
                {(lightboxImage.size / 1024 / 1024).toFixed(2)} MB
              </p>
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