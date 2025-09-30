import React, { createContext, useContext, useState, useEffect } from 'react';
import { secureTokenManager } from '../services/secureTokenManager';
import { logActivity, ACTIVITY_TYPES } from '../components/Home/UserActivityService';
import persistentStorageService from '../services/persistentStorageService';

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
      console.log('🔄 Initializing authentication...');
      
      // Use persistent storage service to get user data
      const storedUser = persistentStorageService.getUserData();
      const storedToken = persistentStorageService.getAuthToken();
      const isRemembered = persistentStorageService.getRememberMe();
      
      console.log('📦 Storage check:', {
        hasUser: !!storedUser,
        hasToken: !!storedToken,
        remembered: isRemembered
      });
      
      if (storedToken && storedUser) {
        try {
          setToken(storedToken);
          setRememberMe(isRemembered);
          
          // Try to fetch fresh user profile data from backend
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
              const timeoutId = setTimeout(() => controller.abort(), 2000);
              
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
                  
                  // Update persistent storage with fresh profile
                  persistentStorageService.setUserData(freshUserData, isRemembered);
                  
                  console.log('✅ Restored session with fresh profile data:', { 
                    remembered: isRemembered, 
                    user: freshUserData.username,
                    theme: freshUserData.theme,
                    language: freshUserData.language
                  });
                } else {
                  // Fallback to stored data if profile fetch fails
                  setCurrentUser(storedUser);
                  console.log('📱 Used stored session data (profile fetch failed):', { remembered: isRemembered, user: storedUser.username });
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
              setCurrentUser(storedUser);
              console.log('💾 Using stored session data (offline mode):', { remembered: isRemembered, user: storedUser.username });
            }
          } else {
            // Skip backend call entirely and use stored data
            setCurrentUser(storedUser);
            console.log('💾 Using stored session data (offline mode - backend unavailable):', { 
              remembered: isRemembered, 
              user: storedUser.username 
            });
          }
        } catch (error) {
          console.error('❌ Error initializing auth with stored data:', error);
          // Clear corrupted data
          persistentStorageService.clearAllData();
        }
      } else {
        console.log('🔍 No valid session found');
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
      // Store using persistent storage service
      persistentStorageService.setRememberMe(remember);
      persistentStorageService.setAuthToken(newToken, remember);
      persistentStorageService.setUserData(userData, remember);
      
      console.log(`🔐 User session saved persistently (${remember ? 'remembered' : 'temporary'})`);
      
      // Also try secure token manager
      try {
        await secureTokenManager.setToken(newToken);
        await secureTokenManager.clearInsecureStorage();
      } catch (error) {
        console.warn('⚠️ Secure token storage failed, using persistent storage fallback');
      }
      
      // Log login activity
      logActivity(ACTIVITY_TYPES.LOGIN, { 
        userId: userData.id || 'anonymous',
        method: 'manual',
        remembered: remember,
        secure: true
      });
    } catch (error) {
      console.error('❌ Error storing session data:', error);
      // Emergency fallback to old method
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
    
    // Clear all persistent storage
    persistentStorageService.clearAllData();
    
    // Also clear secure token storage
    try {
      await secureTokenManager.clearTokens();
    } catch (error) {
      console.warn('⚠️ Error clearing secure tokens:', error);
    }
    
    console.log('🔐 User session cleared from all storage');
  };

  // Refresh user data
  const refreshUser = async (forceRefresh = false) => {
    if (!currentUser || !token) return;
    
    try {
      if (forceRefresh) {
        // Try to fetch fresh data from backend
        const response = await fetch('http://localhost:5001/api/users/profile', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const profileData = await response.json();
          if (profileData.success && profileData.user) {
            const freshUserData = profileData.user;
            setCurrentUser(freshUserData);
            persistentStorageService.updateUserData(freshUserData);
            console.log('✅ User data refreshed from backend');
            return freshUserData;
          }
        }
      }
      
      // Fallback to stored data
      const storedUser = persistentStorageService.getUserData();
      if (storedUser) {
        setCurrentUser(storedUser);
        console.log('📱 User data refreshed from storage');
        return storedUser;
      }
    } catch (error) {
      console.error('❌ Error refreshing user data:', error);
    }
    
    return currentUser;
  };

  // Update user data
  const updateUser = (updates) => {
    if (!currentUser) return;
    
    const updatedUser = {
      ...currentUser,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    setCurrentUser(updatedUser);
    persistentStorageService.updateUserData(updatedUser);
    
    console.log('👤 User data updated:', Object.keys(updates));
    return updatedUser;
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
        refreshUser,
        updateUser
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
