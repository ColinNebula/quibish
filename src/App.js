import React, { useState, useEffect } from 'react';
import './App.css';
import './AppProfessional.css';
import './styles/mobile-first-responsive.css';
import './styles/input-container-responsive-fix.css';
import './styles/mobile-content-fix.css';
import './styles/mobile-animation-fix.css';
import './styles/image-display-fix.css';

import ProChat from './components/Home/ProChat';
import Login from './components/Login';
import Register from './components/Register';
import LoadingSpinner from './components/UI/LoadingSpinner';
import DynamicSplashScreen from './components/UI/DynamicSplashScreen';
import ErrorBoundary from './components/ErrorHandling/ErrorBoundary';
import PWAStatus from './components/ServiceWorker/PWAStatus';
import InstallPrompt from './components/PWA/InstallPrompt';
import { useAuth } from './context/AuthContext';
import ConnectionStatus from './components/ConnectionStatus/ConnectionStatus';
import pwaUtils from './utils/pwaUtils';
import pwaShortcutService from './services/pwaShortcutService';

const App = () => {
  const { isAuthenticated, user, loading: authLoading, logout } = useAuth();
  const [view, setView] = useState('login');
  const [showSplash, setShowSplash] = useState(() => {
    // Only show splash screen once per session
    const hasSeenSplash = sessionStorage.getItem('quibish-splash-seen');
    return !hasSeenSplash;
  });
  const [darkMode, setDarkMode] = useState(() => {
    const savedMode = localStorage.getItem('quibish-dark-mode');
    return savedMode ? JSON.parse(savedMode) : false;
  });
  const [appInitialized, setAppInitialized] = useState(false);
  const [initializationError, setInitializationError] = useState(null);

  // Mock conversations data - moved up before useEffect that uses it
  const [conversations] = useState([
    {
      id: 1,
      name: 'Sarah Johnson',
      avatar: 'https://ui-avatars.com/api/?name=Sarah+Johnson&background=8b5cf6&color=fff&size=40',
      lastMessage: 'Hey! Are we still on for lunch today?',
      lastMessageTime: '2m',
      unreadCount: 2,
      isOnline: true,
      isPinned: true,
      isMuted: false,
      messageStatus: 'delivered',
      timestamp: new Date(Date.now() - 120000)
    },
    {
      id: 2,
      name: 'Team Alpha',
      avatar: 'https://ui-avatars.com/api/?name=Team+Alpha&background=10b981&color=fff&size=40',
      lastMessage: 'Mike: The deployment went smoothly 🚀',
      lastMessageTime: '15m',
      unreadCount: 5,
      isOnline: false,
      isPinned: false,
      isMuted: false,
      messageStatus: 'read',
      timestamp: new Date(Date.now() - 900000)
    },
    {
      id: 3,
      name: 'Alex Chen',
      avatar: 'https://ui-avatars.com/api/?name=Alex+Chen&background=f59e0b&color=fff&size=40',
      lastMessage: 'Thanks for the code review!',
      lastMessageTime: '1h',
      unreadCount: 0,
      isOnline: true,
      isPinned: false,
      isMuted: true,
      messageStatus: 'sent',
      timestamp: new Date(Date.now() - 3600000)
    },
    {
      id: 4,
      name: 'Design Team',
      avatar: 'https://ui-avatars.com/api/?name=Design+Team&background=ef4444&color=fff&size=40',
      lastMessage: 'Lisa: New mockups are ready for review',
      lastMessageTime: '3h',
      unreadCount: 1,
      isOnline: false,
      isPinned: true,
      isMuted: false,
      messageStatus: 'delivered',
      timestamp: new Date(Date.now() - 10800000)
    },
    {
      id: 5,
      name: 'Mom',
      avatar: 'https://ui-avatars.com/api/?name=Mom&background=ec4899&color=fff&size=40',
      lastMessage: 'Don\'t forget to call grandma today! ❤️',
      lastMessageTime: '5h',
      unreadCount: 0,
      isOnline: false,
      isPinned: false,
      isMuted: false,
      messageStatus: 'read',
      timestamp: new Date(Date.now() - 18000000)
    }
  ]);

  const [currentConversation] = useState(conversations[0]);

  // Handle view changes based on authentication state
  useEffect(() => {
    if (isAuthenticated && user && !authLoading) {
      console.log('App - User authenticated, setting view to home');
      setView('home');
    } else if (!isAuthenticated && !authLoading) {
      console.log('App - User not authenticated, ensuring login view');
      if (view === 'home') {
        setView('login');
      }
    }
  }, [isAuthenticated, user, authLoading, view]);

  // Sync dark mode with user's theme preference
  useEffect(() => {
    if (user && user.theme) {
      const isDark = user.theme === 'dark';
      setDarkMode(isDark);
      localStorage.setItem('quibish-dark-mode', JSON.stringify(isDark));
    }
  }, [user]);

  // Initialize frontend health service
  useEffect(() => {
    // Simplified initialization - skip complex services for now
    const initializeApp = async () => {
      try {
        console.log('🚀 Starting Quibish App...');
        
        // Set initialization complete immediately to skip complex setup
        setAppInitialized(true);
        console.log('✅ App initialized successfully');
      } catch (error) {
        console.error('❌ App initialization failed:', error);
        setInitializationError(error.message);
        // Still allow app to load
        setAppInitialized(true);
      }
    };

    initializeApp();
  }, []);

  // Handle PWA shortcuts and deep links
  useEffect(() => {
    const handlePWAEvents = () => {
      // Handle new chat shortcut
      window.addEventListener('pwa-new-chat', (event) => {
        console.log('📱 PWA: New chat shortcut triggered');
        if (isAuthenticated) {
          setView('home');
          // You can add additional logic here to open a new chat
        }
      });

      // Handle voice call shortcut
      window.addEventListener('pwa-voice-call', (event) => {
        console.log('📱 PWA: Voice call shortcut triggered', event.detail);
        if (isAuthenticated) {
          setView('home');
          // Trigger voice call functionality
          pwaUtils.triggerShortcut('voice-call', { initiated: 'shortcut' });
        }
      });

      // Handle video call shortcut
      window.addEventListener('pwa-video-call', (event) => {
        console.log('📱 PWA: Video call shortcut triggered', event.detail);
        if (isAuthenticated) {
          setView('home');
          // Trigger video call functionality
          pwaUtils.triggerShortcut('video-call', { initiated: 'shortcut' });
        }
      });

      // Handle file sharing
      window.addEventListener('pwa-files-shared', (event) => {
        console.log('📁 PWA: Files shared', event.detail);
        if (isAuthenticated) {
          setView('home');
          // Handle shared files
          const { files } = event.detail;
          console.log('Processing shared files:', files);
        }
      });

      // Handle share target
      window.addEventListener('pwa-share-received', (event) => {
        console.log('📤 PWA: Content shared', event.detail);
        if (isAuthenticated) {
          setView('home');
          // Handle shared content
          const { title, text, url } = event.detail;
          console.log('Processing shared content:', { title, text, url });
        }
      });

      // Handle app installation
      window.addEventListener('pwa-installed', (event) => {
        console.log('📱 PWA: App installed', event.detail);
        // Show welcome message or setup flow
      });
    };

    handlePWAEvents();

    // Update app shortcuts based on frequent contacts
    if (isAuthenticated && conversations.length > 0) {
      const frequentContacts = conversations
        .filter(conv => conv.lastMessageTime)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 4)
        .map(conv => ({
          id: conv.id,
          name: conv.name,
          avatar: conv.avatar
        }));
      
      pwaShortcutService.updateShortcuts(frequentContacts);
    }
  }, [isAuthenticated, conversations]);
  
  // Dark mode persistence and CSS class management
  useEffect(() => {
    localStorage.setItem('quibish-dark-mode', JSON.stringify(darkMode));
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    if (darkMode) {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  }, [darkMode]);
  
  const handleLogin = () => {
    console.log('App - handleLogin called, waiting for auth state update');
    // Don't immediately set view to 'home', let the auth state update handle it
  };
  const handleLogout = () => { logout(); setView('login'); };
  const handleRegister = () => {
    console.log('App - handleRegister called, redirecting to login');
    setView('login'); // After successful registration, go to login
  };
  const switchToRegister = () => {
    console.log('App - switchToRegister called');
    setView('register');
  };
  const handleBackToLogin = () => setView('login');
  const toggleDarkMode = () => setDarkMode(prev => !prev);
  const handleSplashComplete = () => {
    setShowSplash(false);
    sessionStorage.setItem('quibish-splash-seen', 'true');
  };
  
  if (authLoading) {
    return <LoadingSpinner size="large" message="Loading..." />;
  }
  
  // Show initialization status
  if (!appInitialized) {
    return (
      <LoadingSpinner 
        size="large" 
        message={initializationError ? 
          `Initialization failed: ${initializationError}` : 
          "Initializing application..."
        } 
      />
    );
  }
  
  // Show splash screen on first load
  if (showSplash) {
    return (
      <DynamicSplashScreen 
        isVisible={true}
        darkMode={darkMode}
        appVersion="1.0.0"
        onComplete={handleSplashComplete}
      />
    );
  }
  
  return (
    <ErrorBoundary>
      <div className={`app smartphone-optimized ${darkMode ? 'dark-mode' : ''}`}>
        <div className="app-content">
          {isAuthenticated && user && !authLoading ? (
            <>
              <ConnectionStatus compact={true} />
              <ProChat 
                user={user} 
                conversations={conversations}
                currentConversation={currentConversation}
                onLogout={handleLogout} 
                darkMode={darkMode}
                onToggleDarkMode={toggleDarkMode}
              />
            </>
          ) : authLoading ? (
            <LoadingSpinner size="large" message="Signing you in..." />
          ) : (
            <div className="auth-container">
              {view === 'login' && (
                <Login 
                  onLogin={handleLogin} 
                  switchToRegister={switchToRegister}
                />
              )}
              {view === 'register' && (
                <Register 
                  onRegisterSuccess={handleRegister} 
                  switchToLogin={handleBackToLogin}
                />
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* PWA Status (development only) */}
      <PWAStatus />
      
      {/* PWA Install Prompt */}
      <InstallPrompt />
    </ErrorBoundary>
  );
};

export default App;