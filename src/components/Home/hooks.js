import { useState, useEffect, useCallback, useRef } from 'react';
import { APP_CONFIG, CONNECTION_STATES, STORAGE_KEYS } from './constants';

// Custom hook for managing connection status
export const useConnectionStatus = () => {
  const [connectionStatus, setConnectionStatus] = useState(CONNECTION_STATES.CONNECTED);
  const [connectionQuality, setConnectionQuality] = useState(100);

  useEffect(() => {
    const checkConnection = () => {
      // Simulate connection check
      const quality = Math.random() * 100;
      setConnectionQuality(quality);
      
      if (quality > 80) {
        setConnectionStatus(CONNECTION_STATES.CONNECTED);
      } else if (quality > 60) {
        setConnectionStatus(CONNECTION_STATES.POOR);
      } else if (quality > 30) {
        setConnectionStatus(CONNECTION_STATES.CRITICAL);
      } else {
        setConnectionStatus(CONNECTION_STATES.DISCONNECTED);
      }
    };

    const interval = setInterval(checkConnection, APP_CONFIG.CONNECTION_CHECK_INTERVAL);
    checkConnection(); // Initial check

    return () => clearInterval(interval);
  }, []);

  const getConnectionText = () => {
    switch (connectionStatus) {
      case CONNECTION_STATES.CONNECTED:
        return 'Connected';
      case CONNECTION_STATES.POOR:
        return 'Poor Connection';
      case CONNECTION_STATES.CRITICAL:
        return 'Critical';
      case CONNECTION_STATES.DISCONNECTED:
        return 'Disconnected';
      case CONNECTION_STATES.OFFLINE:
        return 'Offline';
      default:
        return 'Unknown';
    }
  };

  return {
    connectionStatus,
    connectionQuality,
    connectionText: getConnectionText()
  };
};

// Custom hook for managing local storage
export const useLocalStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback((value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  return [storedValue, setValue];
};

// Custom hook for debouncing values
export const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Custom hook for managing scroll behavior
export const useAutoScroll = (dependency, threshold = APP_CONFIG.AUTO_SCROLL_THRESHOLD) => {
  const scrollRef = useRef(null);
  const [isUserScrolling, setIsUserScrolling] = useState(false);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current && !isUserScrolling) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [isUserScrolling]);

  useEffect(() => {
    const scrollElement = scrollRef.current;
    if (!scrollElement) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollElement;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < threshold;
      setIsUserScrolling(!isNearBottom);
    };

    scrollElement.addEventListener('scroll', handleScroll);
    return () => scrollElement.removeEventListener('scroll', handleScroll);
  }, [threshold]);

  useEffect(() => {
    scrollToBottom();
  }, [dependency, scrollToBottom]);

  return { scrollRef, scrollToBottom, isUserScrolling };
};

// Custom hook for managing responsive design
export const useResponsive = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [screenSize, setScreenSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      setScreenSize({ width, height });
      setIsMobile(width < 768);
    };

    handleResize(); // Initial check
    window.addEventListener('resize', handleResize);
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return {
    isMobile,
    screenSize,
    isTablet: screenSize.width >= 768 && screenSize.width < 1024,
    isDesktop: screenSize.width >= 1024
  };
};

// Custom hook for managing file uploads
export const useFileUpload = (onUpload) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState(null);

  const uploadFile = useCallback(async (file) => {
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    try {
      // Simulate upload progress
      const totalSteps = 10;
      for (let i = 0; i <= totalSteps; i++) {
        await new Promise(resolve => setTimeout(resolve, 100));
        setUploadProgress((i / totalSteps) * 100);
      }

      if (onUpload) {
        await onUpload(file);
      }
    } catch (error) {
      setUploadError(error.message);
      console.error('Upload failed:', error);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [onUpload]);

  return {
    uploadFile,
    isUploading,
    uploadProgress,
    uploadError,
    clearError: () => setUploadError(null)
  };
};

// Custom hook for managing keyboard shortcuts
export const useKeyboardShortcuts = (shortcuts) => {
  useEffect(() => {
    const handleKeyDown = (event) => {
      const { key, ctrlKey, metaKey, shiftKey, altKey } = event;
      const modifierKey = ctrlKey || metaKey;

      Object.entries(shortcuts).forEach(([shortcut, callback]) => {
        const [keys, ...modifiers] = shortcut.split('+').reverse();
        
        let matches = key.toLowerCase() === keys.toLowerCase();
        
        if (modifiers.includes('ctrl') || modifiers.includes('cmd')) {
          matches = matches && modifierKey;
        }
        if (modifiers.includes('shift')) {
          matches = matches && shiftKey;
        }
        if (modifiers.includes('alt')) {
          matches = matches && altKey;
        }

        if (matches) {
          event.preventDefault();
          callback(event);
        }
      });
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
};

// Custom hook for managing theme
export const useTheme = () => {
  const [theme, setThemeState] = useLocalStorage(STORAGE_KEYS.THEME, 'light');

  const setTheme = useCallback((newTheme) => {
    setThemeState(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    
    // Apply theme class to body
    document.body.classList.remove('light-theme', 'dark-theme');
    document.body.classList.add(`${newTheme}-theme`);
  }, [setThemeState]);

  useEffect(() => {
    setTheme(theme);
  }, [theme, setTheme]);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  }, [theme, setTheme]);

  return {
    theme,
    setTheme,
    toggleTheme,
    isDark: theme === 'dark'
  };
};

// Custom hook for managing typing indicators
export const useTypingIndicator = (onTypingChange) => {
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef(null);

  const startTyping = useCallback(() => {
    if (!isTyping) {
      setIsTyping(true);
      if (onTypingChange) onTypingChange(true);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      if (onTypingChange) onTypingChange(false);
    }, APP_CONFIG.TYPING_INDICATOR_DELAY);
  }, [isTyping, onTypingChange]);

  const stopTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    setIsTyping(false);
    if (onTypingChange) onTypingChange(false);
  }, [onTypingChange]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return {
    isTyping,
    startTyping,
    stopTyping
  };
};

// Custom hook for managing click outside
export const useClickOutside = (ref, handler) => {
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        handler();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [ref, handler]);
};