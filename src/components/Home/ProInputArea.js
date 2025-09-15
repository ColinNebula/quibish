import React, { 
  useState, 
  useRef, 
  useEffect, 
  useCallback, 
  useMemo,
  memo,
  forwardRef,
  useImperativeHandle,
  useContext,
  createContext
} from 'react';
import { useConnection } from './ConnectionManager';
import { useMessageQueue } from './MessageQueue';
import './EnhancedProInput.css';
import './ProMessages.css';
import './MessageInteractions.css';
import './LoadingAnimations.css';
import './MessageSuggestions.css';
import './EnhancedFeatures.css';
import './ProInputAreaEnhanced.css';

// Advanced Context for Analytics and Collaboration
const ProInputContext = createContext({
  analytics: null,
  collaboration: null,
  accessibility: null
});

// Enhanced ProInputArea with advanced features
const ProInputArea = memo(forwardRef(({
  value,
  onChange,
  onSend,
  fileInputRef,
  onFileUpload,
  onAttachmentClick,
  placeholder,
  isConnected,
  isMobileView = false,
  className = '',
  replyingTo = null,
  onCancelReply = null,
  isProcessing = false,
  // Enhanced props
  enableSmartSuggestions = true,
  enableRichText = false,
  enableVoiceInput = true,
  enableDragDrop = true,
  enableMentions = true,
  enableCommands = true,
  theme = 'light',
  maxLength = 2000,
  onTypingStart = null,
  onTypingStop = null,
  onMentionSelect = null,
  onCommandSelect = null,
  suggestions = [],
  mentions = [],
  commands = []
}, ref) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [attachmentPreview, setAttachmentPreview] = useState([]);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [screenSize, setScreenSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [isLandscape, setIsLandscape] = useState(window.innerWidth > window.innerHeight);
  const [deviceType, setDeviceType] = useState('desktop');
  const [touchSupport, setTouchSupport] = useState('ontouchstart' in window);
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight);
  
  // Enhanced state management
  const [enhancedState, setEnhancedState] = useState({
    // Smart suggestions
    currentSuggestions: [],
    selectedSuggestionIndex: -1,
    suggestionFilter: '',
    showMentions: false,
    showCommands: false,
    
    // Rich text editing
    cursorPosition: 0,
    textSelection: { start: 0, end: 0 },
    formatHistory: [],
    
    // Voice input
    voiceRecognition: null,
    isListening: false,
    voiceTranscript: '',
    voiceConfidence: 0,
    
    // Drag and drop
    isDragOver: false,
    dragCounter: 0,
    
    // Advanced features
    isComposing: false,
    hasUnsavedChanges: false,
    autoSaveId: null,
    characterCount: 0,
    wordCount: 0,
    
    // NEW: Advanced Analytics & Insights
    analyticsData: {
      startTime: Date.now(),
      keystrokes: 0,
      backspaces: 0,
      pauses: [],
      averageTypingSpeed: 0,
      emotionTone: 'neutral',
      contentComplexity: 0,
      intentClassification: 'message'
    },
    
    // NEW: Smart Context Awareness
    contextualData: {
      conversationHistory: [],
      participantMood: 'neutral',
      topicSentiment: 'neutral',
      urgencyLevel: 'normal',
      suggestedTone: 'professional',
      autoCorrections: [],
      languageDetection: 'en'
    },
    
    // NEW: Advanced Accessibility
    accessibility: {
      screenReaderActive: false,
      highContrastMode: false,
      largeTextMode: false,
      motorImpairmentMode: false,
      voiceControlActive: false,
      eyeTrackingMode: false,
      hapticFeedbackEnabled: true
    },
    
    // NEW: Gesture Recognition
    gestureState: {
      swipeStartX: 0,
      swipeStartY: 0,
      swipeEndX: 0,
      swipeEndY: 0,
      pinchScale: 1,
      rotationAngle: 0,
      longPressTimer: null,
      doubleTapTimer: null,
      gestureHistory: []
    },
    
    // NEW: Collaboration Features
    collaboration: {
      isTypingIndicatorVisible: false,
      otherUsersTyping: [],
      sharedCursor: null,
      liveEditing: false,
      conflictResolution: 'auto',
      versionHistory: [],
      collaborativeSession: null
    },
    
    // Performance optimization
    shouldAnimate: true,
    reducedMotion: false,
    
    // Accessibility
    ariaLiveRegion: '',
    focusableElements: []
  });

  // Enhanced refs
  const enhancedRefs = useRef({
    dragDropZone: null,
    suggestionsList: null,
    mentionsList: null,
    commandsList: null,
    voiceVisualizer: null,
    autoSaveTimer: null,
    typingIndicatorTimer: null,
    suggestionTimer: null
  });

  // Imperative handle for external control
  useImperativeHandle(ref, () => ({
    focus: () => textareaRef.current?.focus(),
    blur: () => textareaRef.current?.blur(),
    clear: () => {
      onChange('');
      setAttachmentPreview([]);
      setEnhancedState(prev => ({ ...prev, hasUnsavedChanges: false }));
    },
    insertText: (text) => {
      const textarea = textareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newValue = value.substring(0, start) + text + value.substring(end);
        onChange(newValue);
        
        // Update cursor position
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + text.length;
        }, 0);
      }
    },
    insertMention: (user) => {
      const mentionText = `@${user.name} `;
      const textarea = textareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const newValue = value.substring(0, start) + mentionText + value.substring(start);
        onChange(newValue);
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + mentionText.length;
        }, 0);
      }
    },
    startVoiceInput: () => startVoiceRecognition(),
    stopVoiceInput: () => stopVoiceRecognition(),
    getStats: () => ({
      characterCount: enhancedState.characterCount,
      wordCount: enhancedState.wordCount,
      hasUnsavedChanges: enhancedState.hasUnsavedChanges
    })
  }), [value, onChange, enhancedState]);
  
  const typingTimeoutRef = useRef(null);
  const textareaRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const recordingTimerRef = useRef(null);
  const formRef = useRef(null);
  const { isConnected: connectionStatus, isOnline } = useConnection();
  const { queueMessage } = useMessageQueue();

  // Enhanced utility functions
  const updateStats = useCallback((text) => {
    const characterCount = text.length;
    const wordCount = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
    
    setEnhancedState(prev => ({
      ...prev,
      characterCount,
      wordCount,
      hasUnsavedChanges: text.trim() !== ''
    }));
  }, []);

  // Smart suggestions engine
  const getSuggestions = useCallback((input, cursorPos = 0) => {
    if (!enableSmartSuggestions || input.length < 2) return [];
    
    const textBeforeCursor = input.substring(0, cursorPos);
    const lastWord = textBeforeCursor.split(/\s+/).pop() || '';
    
    // Check for mentions (@)
    if (lastWord.startsWith('@') && enableMentions) {
      const query = lastWord.substring(1).toLowerCase();
      return mentions.filter(user => 
        user.name.toLowerCase().includes(query) ||
        user.username?.toLowerCase().includes(query)
      ).slice(0, 10);
    }
    
    // Check for commands (/)
    if (lastWord.startsWith('/') && enableCommands) {
      const query = lastWord.substring(1).toLowerCase();
      return commands.filter(cmd => 
        cmd.name.toLowerCase().includes(query) ||
        cmd.description?.toLowerCase().includes(query)
      ).slice(0, 10);
    }
    
    // Regular text suggestions
    return suggestions.filter(s => 
      s.toLowerCase().includes(lastWord.toLowerCase())
    ).slice(0, 5);
  }, [enableSmartSuggestions, enableMentions, enableCommands, mentions, commands, suggestions]);

  // Voice recognition functions
  const startVoiceRecognition = useCallback(() => {
    if (!enableVoiceInput || !('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      console.warn('Speech recognition not supported');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setEnhancedState(prev => ({ ...prev, isListening: true }));
      setIsRecording(true);
    };

    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        const confidence = event.results[i][0].confidence;

        if (event.results[i].isFinal) {
          finalTranscript += transcript;
          setEnhancedState(prev => ({ 
            ...prev, 
            voiceTranscript: finalTranscript,
            voiceConfidence: confidence
          }));
          
          // Auto-insert final transcript
          const newValue = value + (value.endsWith(' ') ? '' : ' ') + finalTranscript + ' ';
          onChange(newValue);
        } else {
          interimTranscript += transcript;
          setEnhancedState(prev => ({ 
            ...prev, 
            voiceTranscript: interimTranscript,
            voiceConfidence: confidence
          }));
        }
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setEnhancedState(prev => ({ ...prev, isListening: false }));
      setIsRecording(false);
    };

    recognition.onend = () => {
      setEnhancedState(prev => ({ ...prev, isListening: false }));
      setIsRecording(false);
    };

    recognition.start();
    setEnhancedState(prev => ({ ...prev, voiceRecognition: recognition }));
  }, [enableVoiceInput, value, onChange]);

  const stopVoiceRecognition = useCallback(() => {
    if (enhancedState.voiceRecognition) {
      enhancedState.voiceRecognition.stop();
      setEnhancedState(prev => ({ 
        ...prev, 
        voiceRecognition: null, 
        isListening: false,
        voiceTranscript: ''
      }));
      setIsRecording(false);
    }
  }, [enhancedState.voiceRecognition]);

  // Drag and drop handlers
  const handleDragEnter = useCallback((e) => {
    if (!enableDragDrop) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    setEnhancedState(prev => ({
      ...prev,
      dragCounter: prev.dragCounter + 1,
      isDragOver: true
    }));
  }, [enableDragDrop]);

  const handleDragLeave = useCallback((e) => {
    if (!enableDragDrop) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    setEnhancedState(prev => {
      const newCounter = prev.dragCounter - 1;
      return {
        ...prev,
        dragCounter: newCounter,
        isDragOver: newCounter > 0
      };
    });
  }, [enableDragDrop]);

  const handleDragOver = useCallback((e) => {
    if (!enableDragDrop) return;
    
    e.preventDefault();
    e.stopPropagation();
  }, [enableDragDrop]);

  const handleDrop = useCallback((e) => {
    if (!enableDragDrop) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    setEnhancedState(prev => ({
      ...prev,
      isDragOver: false,
      dragCounter: 0
    }));

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const newAttachments = files.map(file => ({
        id: Date.now() + Math.random(),
        file,
        name: file.name,
        size: file.size,
        type: file.type.startsWith('image/') ? 'image' : 'file',
        url: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
      }));
      
      setAttachmentPreview(prev => [...prev, ...newAttachments]);
    }
  }, [enableDragDrop]);

  // Enhanced input change handler with advanced analytics
  const handleEnhancedChange = useCallback((e) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart;
    const isBackspace = newValue.length < value.length;
    
    // Enforce max length
    if (maxLength && newValue.length > maxLength) {
      return;
    }
    
    onChange(newValue);
    updateStats(newValue);
    
    // NEW: Update analytics
    updateAnalytics(isBackspace ? 'backspace' : 'keystroke', {
      averageTypingSpeed: calculateTypingSpeed(newValue)
    });
    
    // NEW: Analyze context and sentiment
    analyzeContext(newValue);
    
    // Update cursor position and suggestions
    setEnhancedState(prev => ({
      ...prev,
      cursorPosition: cursorPos,
      textSelection: { start: e.target.selectionStart, end: e.target.selectionEnd }
    }));
    
    // Get smart suggestions
    if (enableSmartSuggestions) {
      const newSuggestions = getSuggestions(newValue, cursorPos);
      setEnhancedState(prev => ({
        ...prev,
        currentSuggestions: newSuggestions,
        selectedSuggestionIndex: -1
      }));
      
      setShowSuggestions(newSuggestions.length > 0);
    }
    
    // NEW: Enhanced collaboration features
    updateCollaboration('typing', {
      isTypingIndicatorVisible: true,
      lastTypingTime: Date.now()
    });
    
    // Trigger typing callbacks
    if (newValue !== value) {
      if (newValue.length > value.length && !isTyping) {
        onTypingStart?.();
      }
      
      // Reset typing timer
      if (enhancedRefs.current.typingIndicatorTimer) {
        clearTimeout(enhancedRefs.current.typingIndicatorTimer);
      }
      
      enhancedRefs.current.typingIndicatorTimer = setTimeout(() => {
        onTypingStop?.();
        updateCollaboration('stopTyping', { isTypingIndicatorVisible: false });
      }, 2000);
    }
  }, [value, onChange, maxLength, updateStats, enableSmartSuggestions, getSuggestions, isTyping, onTypingStart, onTypingStop]);

  // Enhanced keyboard navigation for suggestions
  const handleEnhancedKeyDown = useCallback((e) => {
    const { currentSuggestions, selectedSuggestionIndex } = enhancedState;
    
    if (showSuggestions && currentSuggestions.length > 0) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setEnhancedState(prev => ({
            ...prev,
            selectedSuggestionIndex: Math.min(
              prev.selectedSuggestionIndex + 1,
              currentSuggestions.length - 1
            )
          }));
          break;
          
        case 'ArrowUp':
          e.preventDefault();
          setEnhancedState(prev => ({
            ...prev,
            selectedSuggestionIndex: Math.max(prev.selectedSuggestionIndex - 1, -1)
          }));
          break;
          
        case 'Enter':
        case 'Tab':
          if (selectedSuggestionIndex >= 0) {
            e.preventDefault();
            const suggestion = currentSuggestions[selectedSuggestionIndex];
            applySuggestion(suggestion);
          }
          break;
          
        case 'Escape':
          e.preventDefault();
          setShowSuggestions(false);
          setEnhancedState(prev => ({
            ...prev,
            selectedSuggestionIndex: -1,
            currentSuggestions: []
          }));
          break;
      }
    }
    
    // Voice input shortcut
    if (e.ctrlKey && e.key === 'r') {
      e.preventDefault();
      if (enhancedState.isListening) {
        stopVoiceRecognition();
      } else {
        startVoiceRecognition();
      }
    }
  }, [enhancedState, showSuggestions, startVoiceRecognition, stopVoiceRecognition]);

  // Apply suggestion
  const applySuggestion = useCallback((suggestion) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPos);
    const textAfterCursor = value.substring(cursorPos);
    
    let insertText = '';
    let newCursorPos = cursorPos;
    
    if (typeof suggestion === 'string') {
      // Simple text suggestion
      const lastSpaceIndex = textBeforeCursor.lastIndexOf(' ');
      const startReplace = lastSpaceIndex === -1 ? 0 : lastSpaceIndex + 1;
      const newValue = value.substring(0, startReplace) + suggestion + ' ' + textAfterCursor;
      onChange(newValue);
      newCursorPos = startReplace + suggestion.length + 1;
    } else if (suggestion.type === 'mention') {
      // Mention suggestion
      const atIndex = textBeforeCursor.lastIndexOf('@');
      if (atIndex !== -1) {
        const mentionText = `@${suggestion.name} `;
        const newValue = value.substring(0, atIndex) + mentionText + textAfterCursor;
        onChange(newValue);
        newCursorPos = atIndex + mentionText.length;
        onMentionSelect?.(suggestion);
      }
    } else if (suggestion.type === 'command') {
      // Command suggestion
      const slashIndex = textBeforeCursor.lastIndexOf('/');
      if (slashIndex !== -1) {
        const commandText = `/${suggestion.name} `;
        const newValue = value.substring(0, slashIndex) + commandText + textAfterCursor;
        onChange(newValue);
        newCursorPos = slashIndex + commandText.length;
        onCommandSelect?.(suggestion);
      }
    }
    
    setShowSuggestions(false);
    setEnhancedState(prev => ({
      ...prev,
      selectedSuggestionIndex: -1,
      currentSuggestions: []
    }));
    
    // Update cursor position
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = newCursorPos;
      textarea.focus();
    }, 0);
  }, [value, onChange, onMentionSelect, onCommandSelect]);
  
  // Enhanced device detection and responsive handling
  useEffect(() => {
    const detectDeviceType = () => {
      const width = window.innerWidth;
      if (width < 480) return 'mobile-small';
      if (width < 768) return 'mobile';
      if (width < 1024) return 'tablet';
      if (width < 1440) return 'desktop';
      return 'desktop-large';
    };

    const handleResize = () => {
      const newWidth = window.innerWidth;
      const newHeight = window.innerHeight;
      
      setScreenSize({ width: newWidth, height: newHeight });
      setIsLandscape(newWidth > newHeight);
      setDeviceType(detectDeviceType());
      
      // Enhanced keyboard detection for mobile
      if (isMobileView || deviceType.includes('mobile')) {
        const heightDiff = viewportHeight - newHeight;
        setKeyboardVisible(heightDiff > 150); // Keyboard likely visible
      } else {
        setKeyboardVisible(false);
      }
    };

    const handleOrientationChange = () => {
      // Wait for orientation change to complete
      setTimeout(() => {
        setViewportHeight(window.innerHeight);
        handleResize();
      }, 300);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setShowEmojiPicker(false);
        setShowSuggestions(false);
      }
    };

    // Initial setup
    setViewportHeight(window.innerHeight);
    setDeviceType(detectDeviceType());

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isMobileView, deviceType, viewportHeight]);

  // Auto-hide elements when keyboard is visible on mobile
  useEffect(() => {
    if (keyboardVisible && isMobileView) {
      setShowEmojiPicker(false);
      setShowSuggestions(false);
    }
  }, [keyboardVisible, isMobileView]);
  
  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showEmojiPicker]);
  
  // Auto-resize textarea as user types
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
    
    // Show suggestions when user starts typing
    if (value.length > 0 && value.length <= 10) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [value]);
  
  // Simulate typing indicator
  useEffect(() => {
    if (value.trim() !== '') {
      setIsTyping(true);
      clearTimeout(typingTimeoutRef.current);
      
      // Stop "typing" after 2 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
      }, 2000);
    } else {
      setIsTyping(false);
    }
    
    return () => clearTimeout(typingTimeoutRef.current);
  }, [value]);
  
  // Enhanced form submission with responsive handling
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Vibration feedback on mobile
    if (isMobileView && navigator.vibrate) {
      navigator.vibrate(50);
    }
    
    if (!isConnected && !isProcessing) {
      console.warn('Cannot send message while offline');
      // Queue message for later if supported
      if (queueMessage && value.trim()) {
        queueMessage(value.trim(), attachmentPreview);
      }
      return;
    }
    
    if (value.trim() || attachmentPreview.length > 0 || fileInputRef.current?.files?.length > 0) {
      // Collect all attachments (preview + file input)
      const allAttachments = [
        ...attachmentPreview,
        ...(fileInputRef.current?.files ? Array.from(fileInputRef.current.files).map(file => ({
          id: Date.now() + Math.random(),
          file,
          name: file.name,
          size: file.size,
          type: file.type.startsWith('image/') ? 'image' : 'file',
          url: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
        })) : [])
      ];
      
      onSend(value.trim(), allAttachments);
      setAttachmentPreview([]);
      setIsTyping(false);
      setShowSuggestions(false);
      setShowEmojiPicker(false);
      
      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Focus back on input after sending (only on desktop)
      if (!isMobileView) {
        setTimeout(() => {
          textareaRef.current?.focus();
        }, 0);
      }
    }
  };
  
  const handleFileChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileUpload(files);
      // Reset the input to allow selecting the same file again
      e.target.value = "";
    }
  };
  
  // Enhanced keyboard handling with mobile optimizations
  const handleKeyDown = (e) => {
    // Send message on Enter (without shift for newline)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
    // Close emoji picker on Escape
    if (e.key === 'Escape') {
      setShowEmojiPicker(false);
      setShowSuggestions(false);
    }
    // Mobile: hide suggestions on arrow keys
    if (isMobileView && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      setShowSuggestions(false);
    }
  };

  // Enhanced touch handling for mobile
  const handleTouchStart = useCallback((e) => {
    if (isMobileView && navigator.vibrate) {
      navigator.vibrate(10); // Light haptic feedback
    }
  }, [isMobileView]);

  // Handle focus with responsive behavior
  const handleFocus = useCallback(() => {
    setIsFocused(true);
    
    // On mobile, adjust viewport when input is focused
    if (isMobileView && textareaRef.current) {
      setTimeout(() => {
        textareaRef.current.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      }, 300);
    }
  }, [isMobileView]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    
    // Delay hiding elements to allow for interactions
    setTimeout(() => {
      if (!showEmojiPicker) {
        setShowSuggestions(false);
      }
    }, 200);
  }, [showEmojiPicker]);
  
  // Handle emoji insertion
  const handleEmojiClick = (emoji) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const cursorPosition = textarea.selectionStart;
      const textBefore = value.substring(0, cursorPosition);
      const textAfter = value.substring(cursorPosition);
      const newValue = textBefore + emoji + textAfter;
      
      onChange(newValue);
      setShowEmojiPicker(false);
      
      // Set cursor position after the emoji
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(cursorPosition + emoji.length, cursorPosition + emoji.length);
      }, 0);
    } else {
      // Fallback: just append to the end
      onChange(value + emoji);
      setShowEmojiPicker(false);
    }
  };
  
  // Common emojis for the mini picker
  const commonEmojis = ['😊', '👍', '❤️', '🙏', '😂', '🎉', '👏', '🔥'];
  
  // Format recording time (seconds to mm:ss)
  const formatRecordingTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Enhanced voice recording with mobile optimizations
  const startRecording = useCallback(() => {
    if (isMobileView && navigator.vibrate) {
      navigator.vibrate([50, 30, 50]); // Recording start pattern
    }
    
    setIsRecording(true);
    setRecordingDuration(0);
    setShowEmojiPicker(false);
    setShowSuggestions(false);
    
    // Start a timer to track recording duration
    recordingTimerRef.current = setInterval(() => {
      setRecordingDuration(prev => prev + 1);
    }, 1000);
    
    console.log('Recording started');
  }, [isMobileView]);
  
  const stopRecording = useCallback((send = true) => {
    if (isMobileView && navigator.vibrate) {
      navigator.vibrate(send ? 100 : 200); // Different patterns for send/cancel
    }
    
    clearInterval(recordingTimerRef.current);
    setIsRecording(false);
    
    console.log(`Recording stopped, ${send ? 'sending' : 'discarded'}`);
    
    if (send && recordingDuration > 1) {
      // Send the voice message
      onSend(`[Voice message: ${formatRecordingTime(recordingDuration)}]`);
    }
    
    setRecordingDuration(0);
  }, [isMobileView, recordingDuration, onSend]);

  // Handle file selection
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    
    const previews = files.map(file => {
      const preview = {
        id: Date.now() + Math.random(),
        file,
        name: file.name,
        size: file.size,
        type: file.type.startsWith('image/') ? 'image' : 'file',
        url: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
      };
      
      return preview;
    });
    
    setAttachmentPreview(prev => [...prev, ...previews]);
    onFileUpload?.(files);
  };

  // Remove attachment preview
  const removeAttachment = (id) => {
    setAttachmentPreview(prev => {
      const updated = prev.filter(item => item.id !== id);
      // Clean up object URLs to prevent memory leaks
      const removed = prev.find(item => item.id === id);
      if (removed?.url) {
        URL.revokeObjectURL(removed.url);
      }
      return updated;
    });
  };
  
  // Clean up recording timer if component unmounts while recording
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);
  
  // NEW: Advanced Analytics Engine
  const updateAnalytics = useCallback((action, data = {}) => {
    setEnhancedState(prev => ({
      ...prev,
      analyticsData: {
        ...prev.analyticsData,
        keystrokes: action === 'keystroke' ? prev.analyticsData.keystrokes + 1 : prev.analyticsData.keystrokes,
        backspaces: action === 'backspace' ? prev.analyticsData.backspaces + 1 : prev.analyticsData.backspaces,
        pauses: action === 'pause' ? [...prev.analyticsData.pauses, { timestamp: Date.now(), duration: data.duration }] : prev.analyticsData.pauses,
        ...data
      }
    }));
  }, []);

  // NEW: Smart Context Awareness Engine
  const analyzeContext = useCallback((text, conversationHistory = []) => {
    const sentiment = analyzeSentiment(text);
    const urgency = detectUrgency(text);
    const topic = extractTopic(text, conversationHistory);
    const suggestedTone = determineTone(text, sentiment);
    
    setEnhancedState(prev => ({
      ...prev,
      contextualData: {
        ...prev.contextualData,
        topicSentiment: sentiment,
        urgencyLevel: urgency,
        suggestedTone,
        conversationHistory: conversationHistory.slice(-10) // Keep last 10 messages
      }
    }));
  }, []);

  // NEW: Typing Speed Calculation
  const calculateTypingSpeed = useCallback((text) => {
    const currentTime = Date.now();
    const timeElapsed = (currentTime - enhancedState.analyticsData.startTime) / 1000 / 60; // minutes
    const wordsTyped = text.trim().split(/\s+/).length;
    return timeElapsed > 0 ? Math.round(wordsTyped / timeElapsed) : 0;
  }, [enhancedState.analyticsData.startTime]);

  // NEW: Sentiment Analysis Helper
  const analyzeSentiment = useCallback((text) => {
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'like', 'happy', 'excited'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'dislike', 'angry', 'frustrated', 'annoyed', 'upset', 'disappointed'];
    
    const words = text.toLowerCase().split(/\s+/);
    const positiveCount = words.filter(word => positiveWords.includes(word)).length;
    const negativeCount = words.filter(word => negativeWords.includes(word)).length;
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }, []);

  // NEW: Urgency Detection
  const detectUrgency = useCallback((text) => {
    const urgentKeywords = ['urgent', 'asap', 'immediately', 'emergency', 'quick', 'fast', 'now', '!!!', 'help'];
    const lowerText = text.toLowerCase();
    
    const urgentScore = urgentKeywords.reduce((score, keyword) => {
      return score + (lowerText.includes(keyword) ? 1 : 0);
    }, 0);
    
    if (urgentScore >= 2) return 'high';
    if (urgentScore === 1) return 'medium';
    return 'normal';
  }, []);

  // NEW: Topic Extraction
  const extractTopic = useCallback((text, history = []) => {
    const topics = ['project', 'meeting', 'deadline', 'client', 'budget', 'team', 'schedule', 'review'];
    const words = text.toLowerCase().split(/\s+/);
    
    for (const topic of topics) {
      if (words.includes(topic) || words.some(word => word.includes(topic))) {
        return topic;
      }
    }
    return 'general';
  }, []);

  // NEW: Tone Determination
  const determineTone = useCallback((text, sentiment) => {
    const formalIndicators = ['please', 'kindly', 'regards', 'sincerely', 'thank you'];
    const casualIndicators = ['hey', 'hi', 'cool', 'awesome', 'lol', 'haha'];
    
    const lowerText = text.toLowerCase();
    const formalCount = formalIndicators.filter(word => lowerText.includes(word)).length;
    const casualCount = casualIndicators.filter(word => lowerText.includes(word)).length;
    
    if (formalCount > casualCount) return 'formal';
    if (casualCount > formalCount) return 'casual';
    if (sentiment === 'positive') return 'friendly';
    return 'professional';
  }, []);

  // NEW: Advanced Gesture Recognition
  const handleAdvancedGesture = useCallback((gestureType, gestureData) => {
    setEnhancedState(prev => ({
      ...prev,
      gestureState: {
        ...prev.gestureState,
        gestureHistory: [...prev.gestureState.gestureHistory.slice(-9), { type: gestureType, data: gestureData, timestamp: Date.now() }]
      }
    }));

    switch (gestureType) {
      case 'swipeRight':
        if (gestureData.velocity > 0.5) {
          // Quick emoji insertion
          setShowEmojiPicker(true);
        }
        break;
      case 'swipeLeft':
        if (gestureData.velocity > 0.5) {
          // Quick attachment
          onAttachmentClick?.();
        }
        break;
      case 'longPress':
        // Voice input activation
        if (enableVoiceInput) {
          startVoiceRecognition();
        }
        break;
      case 'doubleTap':
        // Quick send
        if (value.trim()) {
          handleSubmit(new Event('submit'));
        }
        break;
      case 'pinch':
        // Text size adjustment (accessibility)
        if (gestureData.scale > 1.2) {
          setEnhancedState(prev => ({
            ...prev,
            accessibility: { ...prev.accessibility, largeTextMode: true }
          }));
        }
        break;
    }
  }, [value, enableVoiceInput, onAttachmentClick, startVoiceRecognition]);

  // NEW: Accessibility Enhancement
  const enhanceAccessibility = useCallback(() => {
    // Screen reader detection
    const screenReaderActive = window.navigator.userAgent.includes('NVDA') || 
                              window.navigator.userAgent.includes('JAWS') ||
                              window.speechSynthesis?.speaking;

    // High contrast detection
    const highContrastMode = window.matchMedia('(prefers-contrast: high)').matches;

    // Reduced motion detection
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    setEnhancedState(prev => ({
      ...prev,
      accessibility: {
        ...prev.accessibility,
        screenReaderActive,
        highContrastMode,
        reducedMotion
      },
      shouldAnimate: !reducedMotion
    }));
  }, []);

  // NEW: Collaboration Features
  const updateCollaboration = useCallback((action, data = {}) => {
    setEnhancedState(prev => ({
      ...prev,
      collaboration: {
        ...prev.collaboration,
        ...data
      }
    }));

    // Emit typing indicator
    if (action === 'typing' && onTypingStart) {
      onTypingStart();
    } else if (action === 'stopTyping' && onTypingStop) {
      onTypingStop();
    }
  }, [onTypingStart, onTypingStop]);

  // Initialize accessibility features
  useEffect(() => {
    enhanceAccessibility();
    window.addEventListener('resize', enhanceAccessibility);
    return () => window.removeEventListener('resize', enhanceAccessibility);
  }, [enhanceAccessibility]);
  
  // Enhanced responsive layout helper with adaptive features
  const getResponsiveLayout = () => {
    const isSmallMobile = deviceType === 'mobile-small';
    const isMobile = deviceType === 'mobile' || deviceType === 'mobile-small';
    const isTablet = deviceType === 'tablet';
    const isDesktop = deviceType === 'desktop' || deviceType === 'desktop-large';
    const isCompact = isSmallMobile || (isMobile && isLandscape) || keyboardVisible;
    
    return {
      deviceType,
      isSmallMobile,
      isMobile,
      isTablet,
      isDesktop,
      isCompact,
      showFullFeatures: !isCompact && !keyboardVisible,
      maxAttachmentColumns: isSmallMobile ? 2 : isMobile ? 3 : isTablet ? 4 : 5,
      buttonSize: isSmallMobile ? 'small' : isMobile ? 'medium' : 'large',
      inputFontSize: isSmallMobile ? '16px' : isMobile ? '15px' : '14px',
      maxTextareaHeight: isCompact ? '60px' : isMobile ? '100px' : '150px',
      showEmojiButton: !isCompact || !keyboardVisible,
      showSuggestionsCompact: isCompact,
      animationDuration: isMobile ? '200ms' : '300ms',
      hapticFeedback: touchSupport && isMobile,
      useSwipeGestures: touchSupport && isMobile,
      adaptiveSpacing: {
        padding: isCompact ? '6px 8px' : isMobile ? '8px 12px' : '12px 16px',
        margin: isCompact ? '4px' : isMobile ? '8px' : '16px',
        gap: isCompact ? '4px' : isMobile ? '6px' : '8px'
      }
    };
  };

  const layout = getResponsiveLayout();

  // Enhanced gesture handling for mobile
  const handleSwipeGestures = useCallback((e) => {
    if (!layout.useSwipeGestures) return;
    
    const touch = e.touches[0];
    if (!touch) return;
    
    // Store initial touch position
    if (e.type === 'touchstart') {
      textareaRef.current.swipeStartY = touch.clientY;
      textareaRef.current.swipeStartTime = Date.now();
    }
    
    // Handle swipe to dismiss keyboard on mobile
    if (e.type === 'touchend' && textareaRef.current.swipeStartY) {
      const deltaY = touch.clientY - textareaRef.current.swipeStartY;
      const deltaTime = Date.now() - textareaRef.current.swipeStartTime;
      
      if (deltaY > 50 && deltaTime < 300 && keyboardVisible) {
        textareaRef.current.blur(); // Dismiss keyboard
      }
    }
  }, [layout.useSwipeGestures, keyboardVisible]);

  return (
    <div 
      className={`
        pro-input-area enhanced
        ${isFocused ? 'focused' : ''} 
        ${isTyping ? 'typing' : ''} 
        ${isMobileView ? 'mobile' : ''} 
        ${layout.isCompact ? 'compact' : ''} 
        ${keyboardVisible ? 'keyboard-visible' : ''} 
        ${enhancedState.isDragOver ? 'drag-over' : ''}
        ${deviceType}
        ${theme}
        ${className}
      `}
      style={{
        '--animation-duration': layout.animationDuration,
        '--input-font-size': layout.inputFontSize,
        '--max-textarea-height': layout.maxTextareaHeight
      }}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      ref={enhancedRefs.current.dragDropZone}
    >
      {/* Enhanced Connection Warning */}
      {!isConnected && !keyboardVisible && (
        <div className="pro-connection-warning enhanced">
          <div className="connection-icon">⚠️</div>
          <div className="connection-message">
            {layout.isSmallMobile ? 'Offline' : 
             layout.isMobile ? 'You are offline' : 
             'You are offline. Messages will be queued and sent when your connection is restored.'}
          </div>
          {enhancedState.hasUnsavedChanges && (
            <div className="unsaved-indicator">
              <span className="unsaved-dot"></span>
              <span className="unsaved-text">Unsaved changes</span>
            </div>
          )}
        </div>
      )}
      
      {/* Enhanced Typing Indicator */}
      {isTyping && !isRecording && !keyboardVisible && (
        <div className="pro-typing-indicator enhanced">
          <div className="typing-animation">
            <div className="pro-typing-bubble"></div>
            <div className="pro-typing-bubble"></div>
            <div className="pro-typing-bubble"></div>
          </div>
          <span className="pro-typing-text">
            {layout.isSmallMobile ? 'Typing...' : 
             layout.isMobile ? 'Typing...' : 
             'You are typing...'}
          </span>
          <div className="typing-stats">
            {enhancedState.wordCount} words, {enhancedState.characterCount} chars
          </div>
        </div>
      )}

      {/* Voice Input Overlay */}
      {enhancedState.isListening && (
        <div className="voice-input-overlay">
          <div className="voice-visualizer">
            <div className="voice-bar"></div>
            <div className="voice-bar"></div>
            <div className="voice-bar"></div>
            <div className="voice-bar"></div>
            <div className="voice-bar"></div>
          </div>
          
          <div className="voice-transcript">
            <div className="voice-transcript-text">
              {enhancedState.voiceTranscript || 'Listening...'}
            </div>
            {enhancedState.voiceConfidence > 0 && (
              <div className="voice-confidence">
                Confidence: {Math.round(enhancedState.voiceConfidence * 100)}%
              </div>
            )}
          </div>
          
          <div className="voice-controls">
            <button 
              className="voice-control-btn stop"
              onClick={stopVoiceRecognition}
              type="button"
            >
              Stop Recording
            </button>
          </div>
        </div>
      )}

      {/* Drag and Drop Overlay */}
      {enhancedState.isDragOver && (
        <div className="drag-drop-overlay">
          <div className="drag-drop-icon">📎</div>
          <div className="drag-drop-text">Drop files to attach</div>
          <div className="drag-drop-hint">Images, documents, and other files are supported</div>
        </div>
      )}
      
      {isRecording ? (
        <div className="pro-recording-interface">
          <div className="pro-recording-time">
            🎤 {formatRecordingTime(recordingDuration)}
          </div>
          <div className="pro-recording-actions">
            <button 
              className="pro-recording-cancel"
              onClick={() => stopRecording(false)}
              onTouchStart={handleTouchStart}
              aria-label="Cancel recording"
            >
              ✖
            </button>
            <button 
              className="pro-recording-send"
              onClick={() => stopRecording(true)}
              onTouchStart={handleTouchStart}
              aria-label="Send recording"
            >
              ✓
            </button>
          </div>
        </div>
      ) : (
        <form 
          ref={formRef} 
          onSubmit={handleSubmit} 
          className={`pro-input-form ${className} ${layout.isCompact ? 'compact-layout' : ''}`}
          style={{
            padding: layout.adaptiveSpacing.padding,
            margin: layout.adaptiveSpacing.margin,
            gap: layout.adaptiveSpacing.gap
          }}
          onTouchStart={(e) => {
            const touch = e.touches[0];
            setEnhancedState(prev => ({
              ...prev,
              gestureState: {
                ...prev.gestureState,
                swipeStartX: touch.clientX,
                swipeStartY: touch.clientY
              }
            }));
          }}
          onTouchMove={(e) => {
            if (e.touches.length === 2) {
              // Pinch gesture detection
              const touch1 = e.touches[0];
              const touch2 = e.touches[1];
              const distance = Math.sqrt(
                Math.pow(touch2.clientX - touch1.clientX, 2) + 
                Math.pow(touch2.clientY - touch1.clientY, 2)
              );
              const scale = distance / 100; // Normalize scale
              
              if (Math.abs(scale - enhancedState.gestureState.pinchScale) > 0.1) {
                handleAdvancedGesture('pinch', { scale });
                setEnhancedState(prev => ({
                  ...prev,
                  gestureState: { ...prev.gestureState, pinchScale: scale }
                }));
              }
            }
          }}
          onTouchEnd={(e) => {
            const touch = e.changedTouches[0];
            const deltaX = touch.clientX - enhancedState.gestureState.swipeStartX;
            const deltaY = touch.clientY - enhancedState.gestureState.swipeStartY;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            const velocity = distance / 100; // Simplified velocity
            
            // Swipe detection
            if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY)) {
              if (deltaX > 0) {
                handleAdvancedGesture('swipeRight', { velocity, distance });
              } else {
                handleAdvancedGesture('swipeLeft', { velocity, distance });
              }
            }
            
            setEnhancedState(prev => ({
              ...prev,
              gestureState: {
                ...prev.gestureState,
                swipeEndX: touch.clientX,
                swipeEndY: touch.clientY
              }
            }));
          }}
          onDoubleClick={(e) => {
            e.preventDefault();
            handleAdvancedGesture('doubleTap', { x: e.clientX, y: e.clientY });
          }}
        >
          {/* Reply Preview */}
          {replyingTo && (
            <div className="pro-reply-preview">
              <div className="reply-indicator"></div>
              <div className="reply-content">
                <div className="reply-header">
                  <span className="reply-author">
                    {layout.isSmallMobile ? 'Reply' : layout.isMobile ? `Reply to ${replyingTo.sender?.name?.split(' ')[0]}` : `Replying to ${replyingTo.sender?.name}`}
                  </span>
                  <button 
                    type="button"
                    className="reply-cancel"
                    onClick={onCancelReply}
                    onTouchStart={handleTouchStart}
                    aria-label="Cancel reply"
                  >
                    ✖
                  </button>
                </div>
                <div className="reply-text">
                  {replyingTo.content?.substring(0, layout.isSmallMobile ? 30 : layout.isMobile ? 50 : 100)}...
                </div>
              </div>
            </div>
          )}

          {/* Attachment Previews */}
          {attachmentPreview.length > 0 && (
            <div 
              className={`pro-attachment-previews grid-${layout.maxAttachmentColumns}`}
              style={{
                gap: layout.adaptiveSpacing.gap
              }}
            >
              {attachmentPreview.map(attachment => (
                <div key={attachment.id} className="attachment-preview">
                  {attachment.type === 'image' && attachment.url ? (
                    <div className="preview-image">
                      <img src={attachment.url} alt={attachment.name} />
                      <button 
                        type="button"
                        className="remove-attachment"
                        onClick={() => removeAttachment(attachment.id)}
                        onTouchStart={handleTouchStart}
                        aria-label="Remove attachment"
                      >
                        ✖
                      </button>
                    </div>
                  ) : (
                    <div className="preview-file">
                      <div className="file-icon">📄</div>
                      <div className="file-info">
                        <div className="file-name">{attachment.name}</div>
                        <div className="file-size">{(attachment.size / 1024).toFixed(1)} KB</div>
                      </div>
                      <button 
                        type="button"
                        className="remove-attachment"
                        onClick={() => removeAttachment(attachment.id)}
                        onTouchStart={handleTouchStart}
                        aria-label="Remove attachment"
                      >
                        ✖
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="pro-input-container enhanced">
            <div className="pro-input-actions enhanced left">
              <button 
                type="button"
                className="pro-input-button enhanced"
                onClick={onAttachmentClick}
                onTouchStart={handleTouchStart}
                aria-label="Attach files"
                title="Attach files"
              >
                📎
              </button>
              
              {layout.showEmojiButton && (
                <button 
                  type="button"
                  className={`pro-input-button enhanced ${showEmojiPicker ? 'active' : ''}`}
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  onTouchStart={handleTouchStart}
                  aria-label="Add emoji"
                  title="Add emoji"
                >
                  �
                </button>
              )}
              
              {enableVoiceInput && (
                <button 
                  type="button"
                  className={`pro-input-button enhanced ${enhancedState.isListening ? 'recording' : ''}`}
                  onClick={enhancedState.isListening ? stopVoiceRecognition : startVoiceRecognition}
                  onTouchStart={handleTouchStart}
                  aria-label={enhancedState.isListening ? "Stop voice input" : "Start voice input"}
                  title={enhancedState.isListening ? "Stop voice input" : "Voice input (Ctrl+R)"}
                >
                  🎤
                </button>
              )}
              
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                multiple
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                style={{ display: 'none' }}
              />
            </div>
            
            <div className="pro-input-field-container enhanced">
              <textarea
                ref={textareaRef}
                value={value}
                onChange={handleEnhancedChange}
                onKeyDown={handleEnhancedKeyDown}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onCompositionStart={() => setEnhancedState(prev => ({ ...prev, isComposing: true }))}
                onCompositionEnd={() => setEnhancedState(prev => ({ ...prev, isComposing: false }))}
                className="pro-input-field enhanced"
                placeholder={placeholder || "Type a message..."}
                disabled={isProcessing}
                maxLength={maxLength}
                rows={1}
                aria-label="Message input"
                aria-describedby="character-count"
                style={{
                  fontSize: layout.inputFontSize,
                  maxHeight: layout.maxTextareaHeight
                }}
              />
              
              {/* Enhanced Character Count */}
              <div 
                id="character-count"
                className={`character-count ${
                  enhancedState.characterCount > maxLength * 0.9 ? 'warning' : ''
                } ${enhancedState.characterCount >= maxLength ? 'error' : ''}`}
              >
                {enhancedState.characterCount}{maxLength ? `/${maxLength}` : ''}
                {enhancedState.wordCount > 0 && ` • ${enhancedState.wordCount} words`}
              </div>

              {/* Smart Suggestions */}
              {showSuggestions && enhancedState.currentSuggestions.length > 0 && (
                <div className="suggestions-dropdown" ref={enhancedRefs.current.suggestionsList}>
                  {enhancedState.currentSuggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className={`suggestion-item ${
                        enhancedState.selectedSuggestionIndex === index ? 'selected' : ''
                      }`}
                      onClick={() => applySuggestion(suggestion)}
                    >
                      <div className="suggestion-icon">
                        {typeof suggestion === 'string' ? '💭' : 
                         suggestion.type === 'mention' ? '@' :
                         suggestion.type === 'command' ? '/' : '📝'}
                      </div>
                      <div className="suggestion-content">
                        <div className="suggestion-title">
                          {typeof suggestion === 'string' ? suggestion : suggestion.name}
                        </div>
                        {typeof suggestion !== 'string' && suggestion.description && (
                          <div className="suggestion-description">
                            {suggestion.description}
                          </div>
                        )}
                      </div>
                      {typeof suggestion !== 'string' && (
                        <div className="suggestion-type">
                          {suggestion.type}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pro-input-actions enhanced right">
              <button 
                type="submit"
                className={`pro-send-button enhanced ${isProcessing ? 'processing' : ''}`}
                disabled={(!value.trim() && attachmentPreview.length === 0) || (process.env.NODE_ENV !== 'development' && !isConnected) || isProcessing}
                aria-label={isProcessing ? 'Sending message...' : 'Send message'}
                title={!isConnected && process.env.NODE_ENV !== 'development' ? 'Cannot send while offline' : 
                       isProcessing ? 'Sending...' : 
                       'Send message (Enter)'}
              >
                {isProcessing ? (
                  <svg className="send-spinner" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" strokeDasharray="32" strokeDashoffset="32">
                      <animateTransform attributeName="transform" type="rotate" dur="1s" repeatCount="indefinite" values="0 12 12;360 12 12"/>
                    </circle>
                  </svg>
                ) : (
                  '➤'
                )}
              </button>
            </div>
          </div>

          {/* Enhanced Emoji Picker */}
          {showEmojiPicker && (
            <div className="emoji-picker-overlay" onClick={() => setShowEmojiPicker(false)}>
              <div className="emoji-picker" ref={emojiPickerRef} onClick={(e) => e.stopPropagation()}>
                <div className="emoji-picker-header">Choose an emoji</div>
                <div className="emoji-grid">
                  {['😊', '😂', '🥰', '😍', '🤔', '😮', '😅', '😊', '👍', '👎', '❤️', '🔥', '🎉', '👏', '🙌', '✨', '💯', '🚀', '💡', '🎯', '✅', '❌', '⚡', '🌟'].map(emoji => (
                    <button
                      key={emoji}
                      className="emoji-item"
                      onClick={() => {
                        const textarea = textareaRef.current;
                        if (textarea) {
                          const start = textarea.selectionStart;
                          const end = textarea.selectionEnd;
                          const newValue = value.substring(0, start) + emoji + value.substring(end);
                          onChange(newValue);
                          setTimeout(() => {
                            textarea.selectionStart = textarea.selectionEnd = start + emoji.length;
                            textarea.focus();
                          }, 0);
                        }
                        setShowEmojiPicker(false);
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          <button 
            type="button" 
            className="pro-suggestion-button"
            onClick={() => onChange("I'll get back to you on this shortly.")}
            onTouchStart={handleTouchStart}
          >
            I'll get back to you
          </button>
        </form>
      )}
    </div>
  );
}));

ProInputArea.displayName = 'ProInputArea';

export default ProInputArea;
