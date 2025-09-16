import React, { useState, useRef, useEffect } from 'react';
import './Login.css';
import './AuthStyles.css';
import { authService, checkApiConnection } from '../services/apiClient';
import emailValidationService from '../services/emailValidationService';
// import EmailVerificationModal from './EmailVerification/EmailVerificationModal'; // Temporarily disabled
import { initializeIPhoneProAuth, iPhoneProUtils } from '../utils/iPhoneProAuthUtils';

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
  
  // Email verification states
  const [verificationData, setVerificationData] = useState(null);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, feedback: [] });
  
  const usernameRef = useRef(null);
  
  // Focus username field on component mount and check server connection
  useEffect(() => {
    if (usernameRef.current) {
      usernameRef.current.focus();
    }
    
    // Initialize iPhone Pro enhancements
    initializeIPhoneProAuth();
    iPhoneProUtils.addIPhoneProClass();
    
    // Check server connection on load
    checkApiConnection().then(isConnected => {
      if (!isConnected) {
        console.log('API server appears to be offline');
        setError('Server connection failed. Please try again later.');
        setServerStatus('offline');
      } else {
        console.log('API server is online');
        setServerStatus('online');
      }
    });
  }, []);

  // Password strength checker
  useEffect(() => {
    if (password) {
      const strength = calculatePasswordStrength(password);
      setPasswordStrength(strength);
    } else {
      setPasswordStrength({ score: 0, feedback: [] });
    }
  }, [password]);

  // Calculate password strength
  const calculatePasswordStrength = (password) => {
    let score = 0;
    const feedback = [];
    
    if (password.length >= 8) {
      score += 1;
    } else {
      feedback.push('Use at least 8 characters');
    }
    
    if (/[a-z]/.test(password)) {
      score += 1;
    } else {
      feedback.push('Include lowercase letters');
    }
    
    if (/[A-Z]/.test(password)) {
      score += 1;
    } else {
      feedback.push('Include uppercase letters');
    }
    
    if (/\d/.test(password)) {
      score += 1;
    } else {
      feedback.push('Include numbers');
    }
    
    if (/[^\w\s]/.test(password)) {
      score += 1;
    } else {
      feedback.push('Include special characters');
    }
    
    return { score, feedback };
  };

  // Enhanced validation with specific field errors
  const validateForm = () => {
    setFormTouched(true);
    const errors = {};
    
    // Username validation
    if (!username.trim()) {
      errors.username = 'Username is required';
    } else if (username.length < 3) {
      errors.username = 'Username must be at least 3 characters';
    } else if (username.length > 20) {
      errors.username = 'Username must be less than 20 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      errors.username = 'Username can only contain letters, numbers and underscore';
    } else if (/^\d/.test(username)) {
      errors.username = 'Username cannot start with a number';
    }
    
    // Email validation
    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Please enter a valid email address';
    } else if (email.length > 254) {
      errors.email = 'Email address is too long';
    }
    
    // Password validation
    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    } else if (passwordStrength.score < 3) {
      errors.password = 'Password is too weak. Please strengthen it.';
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Enhanced validation
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);
    
    // Handle demo mode
    if (demoMode) {
      setTimeout(() => {
        console.log('Using demo mode registration');
        
        const userData = {
          id: Date.now(),
          username: username,
          email: email
        };
        
        const token = 'offline-token-' + Date.now().toString().slice(-6);
        authService.saveUserSession(userData, token, true);
        onRegisterSuccess(userData, token);
        setLoading(false);
      }, 1000);
      return;
    }
    
    try {
      console.log('Register Component - Starting email verification for:', { username, email });
      
      // Send verification email
      const verificationResult = await emailValidationService.sendVerificationEmail(
        email,
        username,
        password // This will be encrypted in production
      );
      
      if (verificationResult.success) {
        setVerificationData({
          verificationId: verificationResult.verificationId,
          email: email,
          expiresAt: verificationResult.expiresAt
        });
        setShowVerificationModal(true);
      }
    } catch (err) {
      console.error('Register Component - Email verification error:', err);
      setError(err.message || 'Failed to send verification email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle successful email verification
  const handleVerificationSuccess = async (userData) => {
    try {
      setLoading(true);
      
      // Now complete the registration with the backend
      const data = await authService.register(userData.username, userData.email, userData.password);
      
      if (data && data.user && data.token) {
        setShowVerificationModal(false);
        onRegisterSuccess(data.user, data.token);
      } else {
        throw new Error('Registration failed after email verification');
      }
    } catch (err) {
      console.error('Register Component - Registration completion error:', err);
      setError(err.message || 'Failed to complete registration. Please try again.');
      setShowVerificationModal(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="auth-form tall-form">
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
      
      {/* Email Verification Modal - Temporarily disabled */}
      {/* {verificationData && (
        <EmailVerificationModal
          isOpen={showVerificationModal}
          onClose={() => {
            setShowVerificationModal(false);
            setVerificationData(null);
          }}
          verificationId={verificationData.verificationId}
          email={verificationData.email}
          onVerificationSuccess={handleVerificationSuccess}
        />
      )} */}
    </div>
  );
};

export default Register;
