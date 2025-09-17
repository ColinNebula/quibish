import React, { createContext, useContext, useState, useEffect } from 'react';
import { secureTokenManager } from '../services/secureTokenManager';
import { logActivity, ACTIVITY_TYPES } from '../components/Home/UserActivityService';

// Create the auth context
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rememberMe, setRememberMe] = useState(false);

  // Check for stored user data on mount
  useEffect(() => {
    const initializeAuth = async () => {
      // Check both localStorage (remember me) and sessionStorage (current session)
      const localToken = localStorage.getItem('authToken');
      const sessionToken = sessionStorage.getItem('authToken');
      const localUser = localStorage.getItem('user');
      const sessionUser = sessionStorage.getItem('user');
      
      // Prioritize localStorage if it exists (remember me was checked)
      let storedToken = null;
      let storedUser = null;
      let isRemembered = false;
      
      if (localToken && localUser) {
        storedToken = localToken;
        storedUser = localUser;
        isRemembered = true;
        console.log('Found remembered session in localStorage');
      } else if (sessionToken && sessionUser) {
        storedToken = sessionToken;
        storedUser = sessionUser;
        isRemembered = false;
        console.log('Found temporary session in sessionStorage');
      }
      
      // Clear any corrupted or mismatched data
      if (!storedToken || !storedUser) {
        localStorage.removeItem('user');
        localStorage.removeItem('authToken');
        sessionStorage.removeItem('user');
        sessionStorage.removeItem('authToken');
      }
      
      if (storedToken && storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          setToken(storedToken);
          setRememberMe(isRemembered);
          
          // Try to fetch fresh user profile data from backend to get latest settings
          // But first check if backend is available to avoid console errors
          const isDevelopmentMode = process.env.NODE_ENV === 'development' && window.location.hostname === 'localhost';
          const offlineMode = process.env.REACT_APP_OFFLINE_MODE === 'true';
          let shouldTryBackend = !offlineMode;
          
          // Quick backend availability check in development
          if (isDevelopmentMode && !offlineMode) {
            try {
              const quickController = new AbortController();
              const quickTimeout = setTimeout(() => quickController.abort(), 500);
              
              const quickCheck = await fetch('http://localhost:5001/api/health', {
                method: 'HEAD',
                signal: quickController.signal
              });
              
              clearTimeout(quickTimeout);
              shouldTryBackend = quickCheck.ok;
            } catch {
              shouldTryBackend = false;
              console.log('📡 Backend server not available - using offline mode');
            }
          }
          
          if (shouldTryBackend) {
            try {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout for actual requests
              
              const response = await fetch('http://localhost:5001/api/users/profile', {
                headers: {
                  'Authorization': `Bearer ${storedToken}`,
                  'Content-Type': 'application/json'
                },
                signal: controller.signal
              });
              
              clearTimeout(timeoutId);
              
              if (response.ok) {
                const profileData = await response.json();
                if (profileData.success && profileData.user) {
                  // Use fresh profile data from backend
                  const freshUserData = profileData.user;
                  setCurrentUser(freshUserData);
                  
                  // Update stored user data with fresh profile
                  const storage = isRemembered ? localStorage : sessionStorage;
                  storage.setItem('user', JSON.stringify(freshUserData));
                  
                  console.log('✅ Restored session with fresh profile data:', { 
                    remembered: isRemembered, 
                    user: freshUserData.username,
                    theme: freshUserData.theme,
                    language: freshUserData.language
                  });
                } else {
                  // Fallback to stored data if profile fetch fails
                  setCurrentUser(userData);
                  console.log('📱 Used stored session data (profile fetch failed):', { remembered: isRemembered, user: userData.username });
                }
              } else {
                // If token is invalid, clear session
                throw new Error('Invalid token');
              }
            } catch (fetchError) {
              // Suppress connection errors and work in offline mode
              if (fetchError.name === 'AbortError') {
                console.log('🔄 Backend connection timeout - working in offline mode');
              } else if (fetchError.message.includes('Failed to fetch') || fetchError.message.includes('ERR_CONNECTION_REFUSED')) {
                console.log('📡 Backend server not available - working in offline mode');
              } else {
                console.warn('⚠️ Could not fetch fresh profile, using stored data:', fetchError.message);
              }
              // Fallback to stored user data (offline mode)
              setCurrentUser(userData);
              console.log('💾 Using stored session data (offline mode):', { remembered: isRemembered, user: userData.username });
            }
          } else {
            // Skip backend call entirely and use stored data
            setCurrentUser(userData);
            console.log('💾 Using stored session data (offline mode - backend unavailable):', { 
              remembered: isRemembered, 
              user: userData.username 
            });
          }
        } catch (error) {
          console.error('Error parsing stored user data:', error);
          // Clear corrupted data
          localStorage.removeItem('user');
          localStorage.removeItem('authToken');
          sessionStorage.removeItem('user');
          sessionStorage.removeItem('authToken');
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  // Handle login with secure token storage
  const login = async (userData, newToken, remember = false) => {
    setCurrentUser(userData);
    setToken(newToken);
    setRememberMe(remember);
    
    try {
      // Store token securely using secure token manager
      await secureTokenManager.setToken(newToken);
      
      // Clear any old insecure storage
      await secureTokenManager.clearInsecureStorage();
      
      // Store user data (less sensitive than token)
      const storage = remember ? localStorage : sessionStorage;
      storage.setItem('user', JSON.stringify(userData));
      
      console.log(`🔐 User session saved securely (${remember ? 'remembered' : 'temporary'})`);
      
      // Log login activity
      logActivity(ACTIVITY_TYPES.LOGIN, { 
        userId: userData.id || 'anonymous',
        method: 'manual',
        remembered: remember,
        secure: true
      });
    } catch (error) {
      console.error('Error storing token securely:', error);
      // Fallback to old method if secure storage fails
      const storage = remember ? localStorage : sessionStorage;
      storage.setItem('authToken', newToken);
      storage.setItem('user', JSON.stringify(userData));
    }
  };

  // Handle logout (clear all storage securely)
  const logout = async () => {
    if (currentUser) {
      logActivity(ACTIVITY_TYPES.LOGOUT, { 
        userId: currentUser.id || 'anonymous' 
      });
    }
    setCurrentUser(null);
    setToken(null);
    setRememberMe(false);
    
    // Clear secure token storage
    await secureTokenManager.clearTokens();
    
    // Clear user data from both storage types
    localStorage.removeItem('user');
    sessionStorage.removeItem('user');
    
    console.log('🔐 User session cleared securely from all storage');
  };

  // Refresh user data
  const refreshUser = () => {
    // In a REST implementation, you could make an API call here to refresh user data
    console.log('User refresh requested - implement if needed');
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!token,
        user: currentUser,
        token,
        loading,
        rememberMe,
        login,
        logout,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
