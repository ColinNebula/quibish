import React, { useState, useEffect, Suspense } from 'react';
import './App.css';
import './AppProfessional.css';

import ProChat from './components/Home/ProChat';
import Login from './components/Login';
import Register from './components/Register';
import LoadingSpinner from './components/UI/LoadingSpinner';
import DynamicSplashScreen from './components/UI/DynamicSplashScreen';
import ErrorBoundary from './components/ErrorHandling/ErrorBoundary';
import { useAuth } from './context/AuthContext';
import ConnectionStatus from './components/ConnectionStatus/ConnectionStatus';

const App = () => {
  const { isAuthenticated, user, loading: authLoading, logout } = useAuth();
  const [view, setView] = useState('login');
  const [darkMode, setDarkMode] = useState(() => {
    const savedMode = localStorage.getItem('quibish-dark-mode');
    return savedMode ? JSON.parse(savedMode) : false;
  });

  // Mock conversations data
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
  
  const handleLogin = () => setView('home');
  const handleLogout = () => { logout(); setView('login'); };
  const handleRegister = () => setView('register');
  const handleBackToLogin = () => setView('login');
  const toggleDarkMode = () => setDarkMode(prev => !prev);
  
  if (authLoading) return <LoadingSpinner size="large" message="Loading..." />;
  
  return (
    <ErrorBoundary>
      <div className={`app ${darkMode ? 'dark-mode' : ''}`}>
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
          ) : (
            <div className="auth-container">
              {view === 'login' && (
                <Login 
                  onLogin={handleLogin} 
                  switchToRegister={handleRegister}
                />
              )}
              {view === 'register' && (
                <Register 
                  onRegister={handleLogin} 
                  switchToLogin={handleBackToLogin}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default App;
