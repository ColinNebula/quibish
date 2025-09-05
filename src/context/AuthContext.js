import React, { createContext, useState, useContext, useEffect } from 'react';
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
        setCurrentUser(userData);
        setToken(storedToken);
        setRememberMe(isRemembered);
        console.log('Restored user session:', { remembered: isRemembered, user: userData.username });
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
