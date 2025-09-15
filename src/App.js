import React, { useState, useEffect } from 'react';
import './App.css';
import './AppProfessional.css';
import './styles/mobile-first-responsive.css';
import './styles/input-container-responsive-fix.css';
import './styles/mobile-content-fix.css';
import './styles/mobile-animation-fix.css';
import './styles/modernSmartphone.css';
import './styles/advancedTouch.css';
import './styles/nextGenPWA.css';
import './styles/adaptiveUI.css';

import ProChat from './components/Home/ProChat';
import Login from './components/Login';
import Register from './components/Register';
import LoadingSpinner from './components/UI/LoadingSpinner';
import DynamicSplashScreen from './components/UI/DynamicSplashScreen';
import ErrorBoundary from './components/ErrorHandling/ErrorBoundary';
import PWAStatus from './components/ServiceWorker/PWAStatus';
import InstallPrompt from './components/PWA/InstallPrompt';
import TestingDashboard from './components/TestingDashboard/TestingDashboard';
import { useAuth } from './context/AuthContext';
import ConnectionStatus from './components/ConnectionStatus/ConnectionStatus';
import frontendHealthService from './services/frontendHealthService';
import pwaShortcutService, { pwaUtils } from './services/pwaShortcutService';
import mobileInteractionService, { mobileUtils } from './services/mobileInteractionService';
import memoryManager from './services/memoryManagementService';
import lazyLoadingService from './services/lazyLoadingService';
import { initModernViewport } from './utils/modernViewportUtils';
import { initAdvancedTouch } from './utils/advancedTouchSystem';
import { initNextGenPWA } from './services/nextGenPWAService';
import { initSmartphonePerformance } from './utils/smartphonePerformanceOptimizer';
import { initAdaptiveUI } from './utils/adaptiveUIManager';
import { initTestingSuite } from './utils/testingSuite';
import { initValidationSuite } from './utils/compatibilityValidator';
import { PerformanceOptimizer } from './utils/performanceOptimizer';
// Note: imageOptimizationService is auto-initialized

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
  }, [user?.theme]);

  // Initialize frontend health service
  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('🚀 Initializing Quibish Frontend...');
        
        // Initialize core services
        await frontendHealthService.initialize();
        
        // Initialize modern viewport and display support
        console.log('📱 Initializing modern smartphone features...');
        const modernFeatures = await initModernViewport();
        console.log('✨ Modern features initialized:', modernFeatures);
        
        // Initialize advanced touch and haptic feedback
        console.log('🎯 Initializing touch and haptic systems...');
        const touchSystems = initAdvancedTouch();
        console.log('👆 Touch systems initialized:', touchSystems);
        
        // Initialize next-generation PWA features
        console.log('📱 Initializing next-gen PWA features...');
        const pwaFeatures = await initNextGenPWA();
        console.log('🚀 PWA features initialized:', pwaFeatures);
        
        // Initialize smartphone-specific performance optimizations
        console.log('⚡ Initializing smartphone performance optimizations...');
        const performanceFeatures = initSmartphonePerformance();
        console.log('🏎️ Performance optimizations initialized:', performanceFeatures);
        
        // Initialize adaptive UI features for modern displays
        console.log('🎨 Initializing adaptive UI features...');
        const adaptiveFeatures = initAdaptiveUI();
        console.log('📱 Adaptive UI features initialized:', adaptiveFeatures);
        
        // Initialize comprehensive testing suite
        console.log('🧪 Initializing testing and validation tools...');
        const testingTools = initTestingSuite();
        const validationTools = initValidationSuite();
        console.log('✅ Testing suite initialized:', { testingTools, validationTools });
        
        // Initialize existing performance optimization services
        console.log('⚡ Initializing additional performance services...');
        
        // Initialize advanced performance optimizer
        const perfOptimizer = new PerformanceOptimizer();
        await perfOptimizer.initialize();
        console.log('📊 Performance optimizer initialized');
        
        // Memory management setup
        memoryManager.registerCacheManager('lazy-components', lazyLoadingService);
        memoryManager.addMemoryPressureListener((event) => {
          console.log('🧠 Memory pressure detected, optimizing performance');
          // Trigger component cleanup
          lazyLoadingService.cleanupUnusedComponents();
          // Trigger performance optimization
          perfOptimizer.optimizeMemory();
        });
        
        // Set up service worker for advanced caching
        if ('serviceWorker' in navigator) {
          try {
            const registration = await navigator.serviceWorker.register('/sw-advanced.js');
            console.log('🔧 Advanced Service Worker registered:', registration);
          } catch (error) {
            console.warn('Failed to register advanced service worker, using basic SW:', error);
          }
        }
        
        // Preload critical resources
        const criticalResources = [
          '/static/css/main.css',
          '/static/js/main.js',
          '/manifest.json'
        ];
        
        navigator.serviceWorker?.controller?.postMessage({
          type: 'PREFETCH_RESOURCES',
          payload: { urls: criticalResources }
        });
        
        setAppInitialized(true);
        console.log('✅ Frontend initialization completed successfully');
        console.log('📊 Performance optimizations active');
      } catch (error) {
        console.error('❌ Frontend initialization failed:', error);
        setInitializationError(error.message);
        // Don't prevent app loading, just log the error
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
  
  if (authLoading) return <LoadingSpinner size="large" message="Loading..." />;
  
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
      
      {/* Testing Dashboard (development only) */}
      <TestingDashboard />
    </ErrorBoundary>
  );
};

export default App;