import React, { useState, useRef, useEffect } from 'react';
import './Login.css';
import './AuthStyles.css';
import { authService, checkApiConnection } from '../services/apiClient';

const Register = ({ onRegisterSuccess, switchToLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formTouched, setFormTouched] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverStatus, setServerStatus] = useState('checking');
  const [demoMode, setDemoMode] = useState(false);
  
  const usernameRef = useRef(null);
  
  // Focus username field on component mount and check server connection
  useEffect(() => {
    if (usernameRef.current) {
      usernameRef.current.focus();
    }
    
    // Check server connection on load
    checkApiConnection().then(isConnected => {
      if (!isConnected) {
        console.log('API server appears to be offline');
        setError('Server connection failed. Registration may not work.');
        setServerStatus('offline');
        setDemoMode(true);
      } else {
        console.log('API server is online');
        setServerStatus('online');
      }
    });
  }, []);

  // Enhanced validation with specific field errors
  const validateForm = () => {
    setFormTouched(true);
    const errors = {};
    
    // Username validation
    if (!username.trim()) {
      errors.username = 'Username is required';
    } else if (username.length < 3) {
      errors.username = 'Username must be at least 3 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      errors.username = 'Username can only contain letters, numbers and underscore';
    }
    
    // Email validation
    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    // Password validation
    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    
    // Confirm password validation
    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // Handle demo mode registration
  const handleDemoRegistration = () => {
    console.log('Using demo mode registration');
    
    // In demo mode, we'll simulate a successful registration
    const userData = {
      id: Date.now(),
      username: username,
      email: email
    };
    
    // Store new user in local storage for demo mode
    const demoUsers = JSON.parse(localStorage.getItem('demoUsers') || '[]');
    demoUsers.push({
      username: username,
      email: email,
      password: password,
      id: userData.id
    });
    localStorage.setItem('demoUsers', JSON.stringify(demoUsers));
    
    // Create a simulated token
    const token = 'demo-token-' + Date.now().toString().slice(-6);
    
    // Save session and notify parent
    authService.saveUserSession(userData, token, true);
    onRegisterSuccess(userData, token);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Enhanced validation
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);
    
    // If in demo mode, use local registration
    if (demoMode) {
      setTimeout(() => {
        setLoading(false);
        handleDemoRegistration();
      }, 1000); // Simulate network delay
      return;
    }
    
    try {
      console.log('Register Component - Attempting registration for:', { username, email });
      
      // Call the auth service
      const data = await authService.register(username, email, password);
      console.log('Register Component - Registration response:', data);
      
      // Validation with detailed error messages
      if (!data) {
        console.error('Register Component - Empty response received');
        throw new Error('No response from server');
      }
      
      if (!data.user) {
        console.error('Register Component - Missing user data in response');
        throw new Error('User data missing from response');
      }
      
      if (!data.token) {
        console.error('Register Component - Missing token in response');
        throw new Error('Authentication token missing from response');
      }
      
      // Registration successful
      console.log('Register Component - Registration successful');
      onRegisterSuccess(data.user, data.token);
    } catch (err) {
      console.error('Register Component - Registration error:', err);
      
      // Handle different types of errors with specific messages
      if (err.response) {
        // Server responded with an error status
        const responseData = err.response.data;
        console.error('Register Component - Server error response:', responseData);
        
        if (responseData.error) {
          setError(responseData.error);
        } else if (responseData.message) {
          setError(responseData.message);
        } else {
          setError(`Server error: ${err.response.status}`);
        }
      } else if (err.request) {
        // Request made but no response received (network error)
        console.error('Register Component - Network error, no response received');
        setError('Unable to connect to server. Please check your internet connection and try again.');
        
        // Let's check API connection and provide more helpful message
        checkApiConnection().then(isConnected => {
          if (!isConnected) {
            setError('Server appears to be offline. Please try again later or use demo mode.');
            setDemoMode(true);
          }
        });
      } else {
        // Something else went wrong (likely a client-side error)
        console.error('Register Component - Other error:', err.message);
        setError(err.message || 'Registration failed. Please try again.');
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
              <span className="brand-emoji">✨</span>
            </div>
            <div className="brand-content">
              <h2 className="brand-title">Create Account</h2>
              <p className="brand-subtitle">Join the conversation and get started</p>
            </div>
          </div>
          <div className="decorative-line"></div>
        </div>
        
        {serverStatus !== 'checking' && (
          <div className={`server-status ${serverStatus}`}>
            <div className="status-indicator"></div>
            <div className="status-text">
              {serverStatus === 'online' ? 'Server Online' : 'Server Offline - Demo Mode'}
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <div className="input-wrapper">
              <input
                id="username"
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                onBlur={() => setFormTouched(true)}
                ref={usernameRef}
                required
                placeholder="Choose a username"
                className={formTouched && fieldErrors.username ? 'error-input' : ''}
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
            {formTouched && fieldErrors.username && (
              <div className="field-error">{fieldErrors.username}</div>
            )}
          </div>
          
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <div className="input-wrapper">
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onBlur={() => setFormTouched(true)}
                required
                placeholder="Your email address"
                className={formTouched && fieldErrors.email ? 'error-input' : ''}
              />
              {email && (
                <button 
                  type="button" 
                  className="clear-input" 
                  onClick={() => setEmail('')}
                  aria-label="Clear email"
                >
                  ✕
                </button>
              )}
            </div>
            {formTouched && fieldErrors.email && (
              <div className="field-error">{fieldErrors.email}</div>
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
                placeholder="Choose a password"
                className={formTouched && fieldErrors.password ? 'error-input' : ''}
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
            {formTouched && fieldErrors.password && (
              <div className="field-error">{fieldErrors.password}</div>
            )}
          </div>
          
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <div className="input-wrapper">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                onBlur={() => setFormTouched(true)}
                required
                placeholder="Confirm your password"
                className={formTouched && fieldErrors.confirmPassword ? 'error-input' : ''}
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            {formTouched && fieldErrors.confirmPassword && (
              <div className="field-error">{fieldErrors.confirmPassword}</div>
            )}
          </div>
          
          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? (
              <span className="button-with-loader">
                <span className="loader"></span>
                <span>Creating account...</span>
              </span>
            ) : (
              <span>Sign Up</span>
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
          Already have an account?{' '}
          <button className="text-button" onClick={switchToLogin}>
            Log In
          </button>
        </div>
        
        <div className="demo-mode-switch">
          <label className="checkbox-container">
            <input
              type="checkbox"
              checked={demoMode}
              onChange={e => setDemoMode(e.target.checked)}
            />
            <span className="checkmark"></span>
            Use Demo Mode {demoMode && "(Account will be stored locally)"}
          </label>
        </div>
      </div>
    </div>
  );
};

export default Register;
