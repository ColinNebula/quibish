import React, { useState } from 'react';
import { useMutation } from '@apollo/client';
import { REGISTER_USER } from '../../services/authOperations';
import './Register.css';

/**
 * Register component for user registration
 * 
 * @component Register
 * @param {Object} props - Component props
 * @param {Function} props.onRegisterSuccess - Callback function called after successful registration
 * @param {Function} props.switchToLogin - Function to switch to login view
 * @returns {JSX.Element} Rendered component
 */
const Register = ({ onRegisterSuccess, switchToLogin }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  
  // Apollo mutation hook for registration
  const [registerUser, { loading }] = useMutation(REGISTER_USER, {
    onCompleted: (data) => {
      // Extract token and user data from the response
      const { token, user } = data.register;
      
      // Call the onRegisterSuccess callback with user data and token
      if (onRegisterSuccess) {
        onRegisterSuccess(user, token);
      }
    },
    onError: (error) => {
      setError(error.message || 'Registration failed. Please try again.');
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Reset error state
    setError('');
    
    // Validate inputs
    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    
    try {
      // Execute the register mutation
      await registerUser({ 
        variables: { 
          name,
          email, 
          password 
        } 
      });
    } catch (err) {
      // This catch block handles any errors not caught by the onError callback
      setError('An unexpected error occurred. Please try again.');
      console.error('Registration error:', err);
    }
  };

  return (
    <div className="register-container">
      <div className="register-card">
        <div className="register-header">
          <h2>Create an Account</h2>
          <p>Join QuibiChat today</p>
        </div>
        
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="register-form">
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              disabled={loading}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              disabled={loading}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a password"
              disabled={loading}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="confirm-password">Confirm Password</label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              disabled={loading}
            />
          </div>
          
          <button 
            type="submit" 
            className={`register-button ${loading ? 'loading' : ''}`}
            disabled={loading}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>
        
        <div className="register-footer">
          <p>Already have an account? <button className="text-button" onClick={switchToLogin}>Sign in</button></p>
        </div>
      </div>
    </div>
  );
};

export default Register;
