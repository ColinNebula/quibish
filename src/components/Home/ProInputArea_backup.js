import React, { useState, useRef, useEffect, useCallback, forwardRef, memo } from 'react';
import './ProInputArea.css';
import './ProInputAreaEnhanced.css';

const ProInputAreaEnhanced = memo(forwardRef(({
  value = '',
  onChange,
  onSend,
  placeholder,
  className = '',
  isConnected = true,
  isProcessing = false,
  onAttachmentClick,
  onFileUpload,
  attachmentPreview = [],
  setAttachmentPreview,
  replyingTo,
  onCancelReply,
  maxLength = 2000,
  enableVoiceInput = true,
  enableDragDrop = true,
  enableSmartSuggestions = true,
  queueMessage,
  onTypingStart,
  onTypingStop,
  deviceType = 'desktop',
  theme = 'light',
  ...props
}, ref) => {
  // Enhanced state management
  const [enhancedState, setEnhancedState] = useState({
    // Voice input state
    isListening: false,
    voiceRecognition: null,
    voiceTranscript: '',
    voiceConfidence: 0,
    
    // Drag and drop state
    isDragOver: false,
    dragCounter: 0,
    
    // Smart suggestions state
    currentSuggestions: [],
    selectedSuggestionIndex: -1,
    
    // Text analysis state
    characterCount: 0,
    wordCount: 0,
    cursorPosition: 0,
    textSelection: { start: 0, end: 0 },
    
    // Performance state
    lastUpdateTime: 0,
    isComposing: false,
    hasUnsavedChanges: false
  });

  // UI state
  const [isFocused, setIsFocused] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);

  // Responsive state
  const [isMobileView, setIsMobileView] = useState(window.innerWidth <= 768);
  const [isLandscape, setIsLandscape] = useState(window.innerWidth > window.innerHeight);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [touchSupport] = useState('ontouchstart' in window);

  // Refs
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const formRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const recordingTimerRef = useRef(null);

  // Enhanced refs collection
  const enhancedRefs = useRef({
    suggestionsList: null,
    dragDropZone: null,
    typingIndicatorTimer: null
  });

  // Responsive layout helper
  const getResponsiveLayout = useCallback(() => {
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
      animationDuration: isMobile ? '200ms' : '300ms',
      adaptiveSpacing: {
        padding: isCompact ? '6px 8px' : isMobile ? '8px 12px' : '12px 16px',
        margin: isCompact ? '4px' : isMobile ? '8px' : '16px',
        gap: isCompact ? '4px' : isMobile ? '6px' : '8px'
      }
    };
  }, [deviceType, isLandscape, keyboardVisible]);

  const layout = getResponsiveLayout();

  // Text analysis utility
  const updateStats = useCallback((text) => {
    const characterCount = text.length;
    const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
    
    setEnhancedState(prev => ({
      ...prev,
      characterCount,
      wordCount,
      hasUnsavedChanges: text !== value,
      lastUpdateTime: Date.now()
    }));
  }, [value]);

  // Smart suggestions engine
  const getSuggestions = useCallback((text, cursorPos) => {
    if (!enableSmartSuggestions || text.length === 0) return [];
    
    const suggestions = [];
    const textBeforeCursor = text.substring(0, cursorPos).toLowerCase();
    
    // Mention detection
    if (textBeforeCursor.includes('@')) {
      const users = ['Alice', 'Bob', 'Charlie', 'Diana'];
      users.forEach(user => {
        if (user.toLowerCase().includes(textBeforeCursor.split('@').pop())) {
          suggestions.push({
            type: 'mention',
            name: `@${user}`,
            description: `Mention ${user}`
          });
        }
      });
    }
    
    // Command detection
    if (textBeforeCursor.includes('/')) {
      const commands = [
        { name: '/help', description: 'Show available commands' },
        { name: '/clear', description: 'Clear the conversation' },
        { name: '/quote', description: 'Quote a message' }
      ];
      commands.forEach(cmd => {
        if (cmd.name.includes(textBeforeCursor.split('/').pop())) {
          suggestions.push({
            type: 'command',
            name: cmd.name,
            description: cmd.description
          });
        }
      });
    }
    
    // Quick responses
    if (text.length <= 10) {
      const quickResponses = [
        'Hello! How are you?',
        'Thanks for the quick response!',
        'Let me check on that.',
        'I\'ll get back to you shortly.'
      ];
      
      quickResponses.forEach(response => {
        if (response.toLowerCase().includes(text.toLowerCase())) {
          suggestions.push(response);
        }
      });
    }
    
    return suggestions.slice(0, 5);
  }, [enableSmartSuggestions]);

  // Apply suggestion
  const applySuggestion = useCallback((suggestion) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    let newValue;
    
    if (typeof suggestion === 'string') {
      newValue = suggestion;
    } else {
      const start = textarea.selectionStart;
      const textBefore = value.substring(0, start);
      const textAfter = value.substring(textarea.selectionEnd);
      
      if (suggestion.type === 'mention') {
        const atIndex = textBefore.lastIndexOf('@');
        newValue = textBefore.substring(0, atIndex) + suggestion.name + ' ' + textAfter;
      } else if (suggestion.type === 'command') {
        const slashIndex = textBefore.lastIndexOf('/');
        newValue = textBefore.substring(0, slashIndex) + suggestion.name + ' ' + textAfter;
      } else {
        newValue = suggestion.name;
      }
    }
    
    onChange(newValue);
    setShowSuggestions(false);
    setEnhancedState(prev => ({
      ...prev,
      currentSuggestions: [],
      selectedSuggestionIndex: -1
    }));
    
    setTimeout(() => textarea.focus(), 0);
  }, [value, onChange]);

  // Voice recognition handlers
  const startVoiceRecognition = useCallback(() => {
    if (!enableVoiceInput || !('webkitSpeechRecognition' in window)) return;
    
    const recognition = new window.webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    
    setEnhancedState(prev => ({ ...prev, isListening: true }));
    setIsRecording(true);
    
    let interimTranscript = '';
    
    recognition.onresult = (event) => {
      let finalTranscript = '';
      interimTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        const confidence = event.results[i][0].confidence;
        
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
          setEnhancedState(prev => ({ 
            ...prev, 
            voiceTranscript: '',
            voiceConfidence: confidence
          }));
          
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
  }, [enableDragDrop, setAttachmentPreview]);

  // Enhanced input change handler
  const handleEnhancedChange = useCallback((e) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart;
    
    if (maxLength && newValue.length > maxLength) {
      return;
    }
    
    onChange(newValue);
    updateStats(newValue);
    
    setEnhancedState(prev => ({
      ...prev,
      cursorPosition: cursorPos,
      textSelection: { start: e.target.selectionStart, end: e.target.selectionEnd }
    }));
    
    if (enableSmartSuggestions) {
      const newSuggestions = getSuggestions(newValue, cursorPos);
      setEnhancedState(prev => ({
        ...prev,
        currentSuggestions: newSuggestions,
        selectedSuggestionIndex: -1
      }));
      
      setShowSuggestions(newSuggestions.length > 0);
    }
    
    if (newValue !== value) {
      if (newValue.length > value.length && !isTyping) {
        onTypingStart?.();
      }
      
      if (enhancedRefs.current.typingIndicatorTimer) {
        clearTimeout(enhancedRefs.current.typingIndicatorTimer);
      }
      
      enhancedRefs.current.typingIndicatorTimer = setTimeout(() => {
        onTypingStop?.();
      }, 2000);
    }
  }, [value, onChange, maxLength, updateStats, enableSmartSuggestions, getSuggestions, isTyping, onTypingStart, onTypingStop]);

  // Enhanced keyboard navigation
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
          } else if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
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
          
        default:
          break;
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }, [enhancedState, showSuggestions, applySuggestion]);

  // Touch handling
  const handleTouchStart = useCallback((e) => {
    if (layout.hapticFeedback && navigator.vibrate) {
      navigator.vibrate(10);
    }
  }, [layout.hapticFeedback]);

  // Form submission
  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    
    if (isMobileView && navigator.vibrate) {
      navigator.vibrate(50);
    }
    
    if (!isConnected && !isProcessing) {
      console.warn('Cannot send message while offline');
      if (queueMessage && value.trim()) {
        queueMessage(value.trim(), attachmentPreview);
      }
      return;
    }
    
    if (value.trim() || attachmentPreview.length > 0) {
      onSend(value.trim(), attachmentPreview);
      setAttachmentPreview([]);
      setIsTyping(false);
      setShowSuggestions(false);
      setShowEmojiPicker(false);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      if (!isMobileView) {
        setTimeout(() => {
          textareaRef.current?.focus();
        }, 0);
      }
    }
  }, [value, attachmentPreview, isConnected, isProcessing, isMobileView, queueMessage, onSend, setAttachmentPreview]);

  // File handling
  const handleFileSelect = useCallback((e) => {
    const files = Array.from(e.target.files || []);
    
    const previews = files.map(file => ({
      id: Date.now() + Math.random(),
      file,
      name: file.name,
      size: file.size,
      type: file.type.startsWith('image/') ? 'image' : 'file',
      url: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
    }));
    
    setAttachmentPreview(prev => [...prev, ...previews]);
    onFileUpload?.(files);
  }, [setAttachmentPreview, onFileUpload]);

  const removeAttachment = useCallback((id) => {
    setAttachmentPreview(prev => {
      const updated = prev.filter(item => item.id !== id);
      const removed = prev.find(item => item.id === id);
      if (removed?.url) {
        URL.revokeObjectURL(removed.url);
      }
      return updated;
    });
  }, [setAttachmentPreview]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, parseInt(layout.maxTextareaHeight))}px`;
    }
  }, [value, layout.maxTextareaHeight]);

  // Responsive detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth <= 768);
      setIsLandscape(window.innerWidth > window.innerHeight);
    };

    const handleKeyboardToggle = () => {
      setKeyboardVisible(window.innerHeight < window.screen.height * 0.75);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('resize', handleKeyboardToggle);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('resize', handleKeyboardToggle);
    };
  }, []);

  // Initialize stats
  useEffect(() => {
    updateStats(value);
  }, [value, updateStats]);

  // Typing indicator
  useEffect(() => {
    if (value.trim() !== '') {
      setIsTyping(true);
      clearTimeout(typingTimeoutRef.current);
      
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
      }, 2000);
    } else {
      setIsTyping(false);
    }
    
    return () => clearTimeout(typingTimeoutRef.current);
  }, [value]);

  // Format recording time
  const formatRecordingTime = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

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
      ref={ref}
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
              onClick={() => {
                setIsRecording(false);
                setRecordingDuration(0);
              }}
              onTouchStart={handleTouchStart}
              aria-label="Cancel recording"
            >
              ✖
            </button>
            <button 
              className="pro-recording-send"
              onClick={() => {
                setIsRecording(false);
                onSend(`[Voice message: ${formatRecordingTime(recordingDuration)}]`);
                setRecordingDuration(0);
              }}
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
          className={`pro-input-form enhanced ${layout.isCompact ? 'compact-layout' : ''}`}
          style={{
            padding: layout.adaptiveSpacing.padding,
            margin: layout.adaptiveSpacing.margin,
            gap: layout.adaptiveSpacing.gap
          }}
        >
          {/* Enhanced Reply Preview */}
          {replyingTo && (
            <div className="pro-reply-context">
              <div className="reply-indicator">↩️</div>
              <div className="reply-content">
                <div className="reply-author">
                  {layout.isSmallMobile ? 'Reply' : 
                   layout.isMobile ? `Reply to ${replyingTo.sender?.name?.split(' ')[0]}` : 
                   `Replying to ${replyingTo.sender?.name}`}
                </div>
                <div className="reply-text">
                  {replyingTo.content?.substring(0, layout.isSmallMobile ? 30 : layout.isMobile ? 50 : 100)}
                  {replyingTo.content?.length > (layout.isSmallMobile ? 30 : layout.isMobile ? 50 : 100) ? '...' : ''}
                </div>
              </div>
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
          )}

          {/* Enhanced Attachment Previews */}
          {attachmentPreview.length > 0 && (
            <div className="attachment-preview">
              {attachmentPreview.map(attachment => (
                <div key={attachment.id} className="attachment-item">
                  {attachment.type === 'image' && attachment.url ? (
                    <>
                      <div className="attachment-icon">🖼️</div>
                      <div className="attachment-info">
                        <div className="attachment-name">{attachment.name}</div>
                        <div className="attachment-size">{(attachment.size / 1024).toFixed(1)} KB</div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="attachment-icon">📄</div>
                      <div className="attachment-info">
                        <div className="attachment-name">{attachment.name}</div>
                        <div className="attachment-size">{(attachment.size / 1024).toFixed(1)} KB</div>
                      </div>
                    </>
                  )}
                  <button 
                    type="button"
                    className="attachment-remove"
                    onClick={() => removeAttachment(attachment.id)}
                    onTouchStart={handleTouchStart}
                    aria-label="Remove attachment"
                  >
                    ✖
                  </button>
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
                  😊
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
                disabled={(!value.trim() && attachmentPreview.length === 0) || !isConnected || isProcessing}
                aria-label={isProcessing ? 'Sending message...' : 'Send message'}
                title={!isConnected ? 'Cannot send while offline' : 
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
        </form>
      )}
    </div>
  );
}));

ProInputAreaEnhanced.displayName = 'ProInputAreaEnhanced';

export default ProInputAreaEnhanced;
