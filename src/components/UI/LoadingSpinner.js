import React from 'react';
import './LoadingSpinner.css';

/**
 * Loading spinner component with different sizes and themes
 * 
 * @component LoadingSpinner
 * @param {Object} props - Component props
 * @param {string} props.size - Size of spinner: 'small', 'medium', or 'large'
 * @param {boolean} props.dark - Whether to use dark theme styling
 * @param {string} props.message - Optional loading message to display
 * @returns {JSX.Element} Rendered loading spinner
 */
const LoadingSpinner = ({ size = 'medium', dark = false, message }) => {
  const spinnerClasses = `loading-spinner ${size} ${dark ? 'dark' : 'light'}`;
  
  return (
    <div className="loading-container">
      <div className={spinnerClasses}>
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
      </div>
      {message && <p className="loading-message">{message}</p>}
    </div>
  );
};

export default LoadingSpinner;
