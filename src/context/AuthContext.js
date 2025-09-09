import React, { createContext, useState, useContext, useEffect } from 'react';
import { logActivity, ACTIVITY_TYPES } from '../components/Home/UserActivityService';

// Create the auth context
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rememberMe, setRememberMe] = useState(false);

  // Check for stored user data on mount and fetch fresh profile data
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
      
      if (storedToken && storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          setToken(storedToken);
          setRememberMe(isRemembered);
          
          // Try to fetch fresh user profile data from backend to get latest settings
          try {
            const response = await fetch('http://localhost:5001/api/users/profile', {
              headers: {
                'Authorization': `Bearer ${storedToken}`,
                'Content-Type': 'application/json'
              }
            });
            
            if (response.ok) {
              const profileData = await response.json();
              if (profileData.success && profileData.user) {
                // Use fresh profile data from backend
                const freshUserData = profileData.user;
                setCurrentUser(freshUserData);
                
                // Update stored user data with fresh profile
                const storage = isRemembered ? localStorage : sessionStorage;
                storage.setItem('user', JSON.stringify(freshUserData));
                
                console.log('Restored session with fresh profile data:', { 
                  remembered: isRemembered, 
                  user: freshUserData.username,
                  theme: freshUserData.theme,
                  language: freshUserData.language
                });
              } else {
                // Fallback to stored data if profile fetch fails
                setCurrentUser(userData);
                console.log('Used stored session data (profile fetch failed):', { remembered: isRemembered, user: userData.username });
              }
            } else {
              // If token is invalid, clear session
              throw new Error('Invalid token');
            }
          } catch (fetchError) {
            console.warn('Could not fetch fresh profile, using stored data:', fetchError.message);
            // Fallback to stored user data
            setCurrentUser(userData);
            console.log('Used stored session data (offline/error):', { remembered: isRemembered, user: userData.username });
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

  // Handle login with remember me preference
  const login = (userData, newToken, remember = false) => {
    setCurrentUser(userData);
    setToken(newToken);
    setRememberMe(remember);
    
    // Clear existing data to prevent conflicts
    localStorage.removeItem('user');
    localStorage.removeItem('authToken');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('authToken');
    
    // Store in appropriate storage based on remember preference
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem('user', JSON.stringify(userData));
    storage.setItem('authToken', newToken);
    
    console.log(`User session saved to ${remember ? 'localStorage (remembered)' : 'sessionStorage (temporary)'}`);
    
    // Log login activity
    logActivity(ACTIVITY_TYPES.LOGIN, { 
      userId: userData.id || 'anonymous',
      method: 'manual',
      remembered: remember
    });
  };

  // Handle logout (clear all storage)
  const logout = () => {
    if (currentUser) {
      logActivity(ACTIVITY_TYPES.LOGOUT, { 
        userId: currentUser.id || 'anonymous' 
      });
    }
    setCurrentUser(null);
    setToken(null);
    setRememberMe(false);
    
    // Clear both storage types
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('user');
    
    console.log('User session cleared from all storage');
  };

  // Refresh user data from backend
  const refreshUser = async () => {
    if (!token) {
      console.warn('No token available for user refresh');
      return false;
    }

    try {
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
          
          // Update stored user data with fresh profile
          const storage = rememberMe ? localStorage : sessionStorage;
          storage.setItem('user', JSON.stringify(freshUserData));
          
          console.log('User data refreshed successfully');
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Error refreshing user data:', error);
      return false;
    }
  };

  // Update user data in context and storage
  const updateUser = (updatedUserData) => {
    const mergedUser = { ...currentUser, ...updatedUserData };
    setCurrentUser(mergedUser);
    
    // Update stored user data
    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem('user', JSON.stringify(mergedUser));
    
    console.log('User data updated in context');
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
