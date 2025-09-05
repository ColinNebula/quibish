import React, { useState, useEffect, useRef } from 'react';
import './Login.css';
import './AuthStyles.css';
import { authService, checkApiConnection } from '../services/apiClient';
import { useAuth } from '../context/AuthContext';

const Login = ({ onLogin, switchToRegister }) => {
  const { login } = useAuth(); // Get login function from AuthContext
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formTouched, setFormTouched] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [serverStatus, setServerStatus] = useState('checking');
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
        setError('🌐 No backend server detected. The app is running in demo mode - you can still log in and use all features!');
        setServerStatus('offline');
        setDemoMode(true);
      } else {
        console.log('API server is online');
        setServerStatus('online');
      }
    });
  }, []);

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
    
    // Allow demo credentials to bypass length requirement
    const isDemoCredential = ['demo', 'admin', 'password'].includes(password);
    if (!isDemoCredential && password.length < 6) {
      setError('Password must be at least 6 characters (or use demo credentials)');
      return false;
    }
    
    return true;
  };

  // Handle demo mode login
  // eslint-disable-next-line no-unused-vars
  const handleDemoLogin = () => {
    console.log('Using demo mode login');
    
    // Find a matching demo user based on username and password
    const demoUsers = [
      { username: 'demo', password: 'demo', email: 'demo@quibish.com' },
      { username: 'john', password: 'password', email: 'john@example.com' },
      { username: 'jane', password: 'password', email: 'jane@example.com' },
      { username: 'admin', password: 'admin', email: 'admin@quibish.com' },
      { username: 'alice', password: 'password123', email: 'alice@example.com' },
      { username: 'bob', password: 'password456', email: 'bob@example.com' }
    ];
    
    const demoUser = demoUsers.find(u => 
      (u.username === username || u.email === username) && u.password === password
    );
    
    if (demoUser) {
      const userData = { 
        username: demoUser.username, 
        email: demoUser.email 
      };
      
      login(userData, 'demo-token-local', rememberMe); // Use AuthContext login
      onLogin(userData, 'demo-token-local');
    } else {
      setError('💡 Try these demo credentials: demo/demo, john/password, jane/password, admin/admin, alice/password123, bob/password456, or any username/password combination!');
    }
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
      
      // If in demo mode, handle login directly
      if (demoMode) {
        console.log('Demo mode active, using offline authentication');
        
        // Find a matching demo user
        const demoUsers = [
          { username: 'demo', password: 'demo', email: 'demo@quibish.com', name: 'Demo User' },
          { username: 'john', password: 'password', email: 'john@example.com', name: 'John Doe' },
          { username: 'jane', password: 'password', email: 'jane@example.com', name: 'Jane Smith' },
          { username: 'admin', password: 'admin', email: 'admin@quibish.com', name: 'Admin User' },
          { username: 'alice', password: 'password123', email: 'alice@example.com', name: 'Alice Cooper' },
          { username: 'bob', password: 'password456', email: 'bob@example.com', name: 'Bob Wilson' }
        ];
        
        const demoUser = demoUsers.find(u => 
          (u.username === username || u.email === username) && u.password === password
        );
        
        if (demoUser) {
          const userData = { 
            id: Date.now(),
            username: demoUser.username, 
            email: demoUser.email,
            name: demoUser.name
          };
          
          authService.saveUserSession(userData, 'demo-token-local', rememberMe);
          onLogin(userData, 'demo-token-local');
          return;
        } else {
          throw new Error('Invalid demo credentials');
        }
      }
      
      // Call the auth service (it will handle offline mode automatically)
      const data = await authService.login(username, password);
      console.log('Login Component - Login response:', data);
      
      // Validation with detailed error messages
      if (!data) {
        console.error('Login Component - Empty response received');
        throw new Error('No response from server');
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
      authService.saveUserSession(data.user, data.token, rememberMe);
      onLogin(data.user, data.token);
      
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
            setError('Server appears to be offline. Please try again later or use demo mode.');
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
              {serverStatus === 'online' ? 'Server Online' : 'Server Offline - Demo Mode'}
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
        
        <div className="demo-mode-switch">
          <label className="checkbox-container">
            <input
              type="checkbox"
              checked={demoMode}
              onChange={e => setDemoMode(e.target.checked)}
            />
            <span className="checkmark"></span>
            Use Demo Mode {demoMode && "(Server connection will be ignored)"}
          </label>
        </div>
        
        <div className="demo-accounts">
          <p className="demo-title">Quick Login with Demo Accounts</p>
          <div className="demo-cards">
            <div 
              className="demo-card" 
              onClick={() => {
                setUsername('demo');
                setPassword('demo');
                setError(null);
              }}
            >
              <div className="demo-avatar">D</div>
              <div className="demo-info">
                <div className="demo-name">Demo</div>
                <div className="demo-creds">demo / demo</div>
              </div>
            </div>
            
            <div 
              className="demo-card" 
              onClick={() => {
                setUsername('alice');
                setPassword('password123');
                setError(null);
              }}
            >
              <div className="demo-avatar">A</div>
              <div className="demo-info">
                <div className="demo-name">Alice</div>
                <div className="demo-creds">alice / password123</div>
              </div>
            </div>
            
            <div 
              className="demo-card" 
              onClick={() => {
                setUsername('bob');
                setPassword('password456');
                setError(null);
              }}
            >
              <div className="demo-avatar">B</div>
              <div className="demo-info">
                <div className="demo-name">Bob</div>
                <div className="demo-creds">bob / password456</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
