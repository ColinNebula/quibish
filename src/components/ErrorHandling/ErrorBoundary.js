import React, { Component } from 'react';
import './ErrorBoundary.css';

/**
 * Error boundary component that catches JavaScript errors in child components
 * and displays a fallback UI instead of crashing the entire application
 * 
 * @component ErrorBoundary
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  /**
   * Update state when an error occurs
   * 
   * @param {Error} error - The error that was thrown
   * @returns {Object} Updated state
   */
  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  /**
   * Catch errors in any components below and log them
   * 
   * @param {Error} error - The error that was thrown
   * @param {Object} errorInfo - Component stack information
   */
  componentDidCatch(error, errorInfo) {
    // Log the error to an error reporting service
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    
    // Could also send to a logging service:
    // logErrorToService(error, errorInfo);
  }

  /**
   * Handle retry button click to reset the error state
   */
  handleRetry = () => {
    this.setState({ 
      hasError: false,
      error: null,
      errorInfo: null
    });
  }

  render() {
    if (this.state.hasError) {
      // Render fallback UI
      return (
        <div className="error-boundary">
          <div className="error-container">
            <div className="error-icon">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-1-7v2h2v-2h-2zm0-8v6h2V7h-2z" fill="currentColor"/>
              </svg>
            </div>
            <h2 className="error-title">Something went wrong</h2>
            <p className="error-message">
              We're sorry, but there was a problem loading this part of the application.
            </p>
            
            {this.props.showDetails && this.state.error && (
              <details className="error-details">
                <summary>Error details</summary>
                <pre>{this.state.error.toString()}</pre>
                <pre>{this.state.errorInfo?.componentStack}</pre>
              </details>
            )}
            
            <div className="error-actions">
              <button 
                className="retry-button" 
                onClick={this.handleRetry}
              >
                Try Again
              </button>
              
              <button 
                className="report-button"
                onClick={() => window.location.reload()}
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    // If there's no error, render children normally
    return this.props.children;
  }
}

export default ErrorBoundary;
