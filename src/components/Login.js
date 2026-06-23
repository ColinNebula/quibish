import React, { useState, useEffect, useRef } from 'react';
import './AuthStyles.css';
import './Login.css';
import { authService, checkApiConnection } from '../services/apiClient';
import { useAuth } from '../context/AuthContext';
// import TwoFactorVerify from './TwoFactorAuth/TwoFactorVerify'; // Temporarily disabled
// import userDataService from '../services/userDataService'; // Temporarily disabled
import { initializeIPhoneProAuth, iPhoneProUtils } from '../utils/iPhoneProAuthUtils';

const Login = ({ onLogin, switchToRegister }) => {
  const { login } = useAuth(); // Get login function from AuthContext
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formTouched, setFormTouched] = useState(false);

  const [serverStatus, setServerStatus] = useState('checking');
  
  const usernameRef = useRef(null);
  
  // Focus username field on component mount and check server connection
  useEffect(() => {
    if (usernameRef.current) {
      usernameRef.current.focus();
    }
    
    // Initialize iPhone Pro enhancements
    initializeIPhoneProAuth();
    iPhoneProUtils.addIPhoneProClass();
    
    const autoLogin = async () => {
      // Check server connection on load
      const isConnected = await checkApiConnection();
      
      if (!isConnected) {
        console.log('API server appears to be offline');
        setServerStatus(window.location.hostname.includes('github.io') ? 'demo' : 'offline');
      } else {
        console.log('API server is online');
        setServerStatus('online');
      }
    };
    
    autoLogin();
  }, []); // Empty dependency array to run only once

  // Validate form fields
  const validateForm = () => {
    setFormTouched(true);
    
    if (!username.trim()) {
      setError('Username or email is required');
      return false;
    }
    
    if (!password) {
      setError('Password is required');
      return false;
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }
    
    return true;
  };



  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate inputs
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('Login Component - Attempting login with:', { username });
      

      
      // Call the auth service (it will handle offline mode automatically)
      const data = await authService.login(username, password);
      console.log('Login Component - Login response:', data);
      
      // Validation with detailed error messages
      if (!data) {
        console.error('Login Component - Empty response received');
        throw new Error('No response from server');
      }

      // Check if 2FA is required
      if (data.requiresTwoFactor) {
        console.log('Login Component - 2FA required but disabled in this build');
        setError('Two-factor authentication is temporarily unavailable. Please sign in again later or contact support.');
        setLoading(false);
        return;
      }
      
      if (!data.user) {
        console.error('Login Component - Missing user data in response');
        throw new Error('User data missing from response');
      }
      
      if (!data.token) {
        console.error('Login Component - Missing token in response');
        throw new Error('Authentication token missing from response');
      }
      
      // Save user session and notify parent component
      console.log('Login Component - Login successful, saving session');
      login(data.user, data.token, rememberMe); // Use AuthContext login
      onLogin(data.user, data.token);

      const usedDemoMode = data?.user?.isDemo || /offline mode/i.test(data?.message || '');
      setServerStatus(usedDemoMode ? 'demo' : 'online');
      
      console.log('Login Component - Session saved and parent notified');
    } catch (err) {
      console.error('Login Component - Login error:', err);
      
      // Handle different types of errors with specific messages
      if (err.response) {
        // Server responded with an error status
        const responseData = err.response.data;
        console.error('Login Component - Server error response:', responseData);
        
        if (responseData.error) {
          setError(responseData.error);
        } else if (responseData.message) {
          setError(responseData.message);
        } else if (err.response.status === 401) {
          setError('Invalid username or password. Please try again.');
        } else if (err.response.status === 404) {
          setError('Server endpoint not found. Is the server running?');
        } else {
          setError(`Server error (${err.response.status}). Please try again later.`);
        }
      } else if (err.request) {
        // Request made but no response received (network error)
        console.error('Login Component - Network error, no response received');
        setError('Unable to connect to server. Please check your internet connection and try again.');
        
        // Let's check API connection and provide more helpful message
        checkApiConnection().then(isConnected => {
          if (!isConnected) {
            setServerStatus(window.location.hostname.includes('github.io') ? 'demo' : 'offline');
            if (!window.location.hostname.includes('github.io')) {
              setError('Server appears to be offline. Please try again later.');
            }
          }
        });
      } else {
        // Something else went wrong (likely a client-side error)
        console.error('Login Component - Other error:', err.message);
        setError(err.message || 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="auth-form">
        <div className="elegant-header">
          <div className="brand-section">
            <div className="brand-icon">
              <span className="brand-emoji">💬</span>
            </div>
            <div className="brand-content">
              <h2 className="brand-title">Welcome Back</h2>
              <p className="brand-subtitle">Sign in to continue your conversation</p>
            </div>
          </div>
          <div className="decorative-line"></div>
        </div>
        
        {serverStatus !== 'checking' && (
          <div className={`server-status ${serverStatus}`}>
            <div className="status-indicator"></div>
            <div className="status-text">
              {serverStatus === 'online' ? 'Server Online' : serverStatus === 'demo' ? 'Demo Mode' : 'Server Offline'}
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username or Email</label>
            <div className="input-wrapper">
              <input
                id="username"
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                onBlur={() => setFormTouched(true)}
                ref={usernameRef}
                required
                autoComplete="username email"
                placeholder="Enter your username or email"
                className={formTouched && !username.trim() ? 'error-input' : ''}
              />
              {username && (
                <button 
                  type="button" 
                  className="clear-input" 
                  onClick={() => setUsername('')}
                  aria-label="Clear username"
                >
                  ✕
                </button>
              )}
            </div>
            {formTouched && !username.trim() && (
              <div className="field-error">Username or email is required</div>
            )}
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="input-wrapper">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                onBlur={() => setFormTouched(true)}
                required
                autoComplete="current-password"
                placeholder="Enter your password"
                className={formTouched && !password ? 'error-input' : ''}
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            {formTouched && !password && (
              <div className="field-error">Password is required</div>
            )}
            {formTouched && password && password.length < 6 && (
              <div className="field-error">Password must be at least 6 characters</div>
            )}
          </div>
          
          <div className="form-options">
            <label className="checkbox-container">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
              />
              <span className="checkmark"></span>
              Remember me
            </label>
            <button type="button" className="forgot-password" onClick={() => console.log('Forgot password clicked')}>Forgot password?</button>
          </div>
          
          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? (
              <span className="button-with-loader">
                <span className="loader"></span>
                <span>Signing in...</span>
              </span>
            ) : (
              <span>Sign In</span>
            )}
          </button>
          
          {error && (
            <div className="auth-error">
              <div className="error-icon">❗</div>
              <div className="error-message">{error}</div>
            </div>
          )}
        </form>
        
        <div className="auth-switch">
          Don't have an account?{' '}
          <button className="text-button" onClick={switchToRegister}>
            Sign Up
          </button>
        </div>
        

        

      </div>
      
    </div>
  );
};

export default Login;
