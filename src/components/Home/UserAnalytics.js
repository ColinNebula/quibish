import React, { useState, useEffect } from 'react';
import { getActivityStats, clearActivityLog } from './UserActivityService';
import './UserAnalytics.css';

const UserAnalytics = ({ darkMode }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Load activity statistics
    loadStats();
    
    // Refresh stats every minute
    const interval = setInterval(loadStats, 60000);
    return () => clearInterval(interval);
  }, []);
  
  // Load activity statistics
  const loadStats = () => {
    setLoading(true);
    const activityStats = getActivityStats();
    setStats(activityStats);
    setLoading(false);
  };
  
  // Handle clear activity log
  const handleClearLog = () => {
    const confirmed = window.confirm('Are you sure you want to clear your activity log? This cannot be undone.');
    if (confirmed) {
      clearActivityLog();
      loadStats();
    }
  };
  
  // Format timestamp to readable date
  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };
  
  // Get activity type in a readable format
  const formatActivityType = (type) => {
    return type
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, char => char.toUpperCase());
  };
  
  if (loading) {
    return <div className="user-analytics-loading">Loading activity data...</div>;
  }
  
  return (
    <div className={`user-analytics ${darkMode ? 'dark' : ''}`}>
      <div className="analytics-header">
        <h2>Activity Overview</h2>
        <button 
          className="refresh-button" 
          onClick={loadStats}
          aria-label="Refresh statistics"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 4v6h-6"></path>
            <path d="M1 20v-6h6"></path>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"></path>
            <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14"></path>
          </svg>
        </button>
      </div>
      
      <div className="analytics-summary">
        <div className="analytics-card">
          <h3>Today</h3>
          <div className="stat-item">
            <span className="stat-label">Messages Sent</span>
            <span className="stat-value">{stats.today.messagesSent}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Messages Received</span>
            <span className="stat-value">{stats.today.messagesReceived}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Logins</span>
            <span className="stat-value">{stats.today.logins}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Total Activity</span>
            <span className="stat-value">{stats.today.total}</span>
          </div>
        </div>
        
        <div className="analytics-card">
          <h3>This Week</h3>
          <div className="stat-item">
            <span className="stat-label">Messages Sent</span>
            <span className="stat-value">{stats.week.messagesSent}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Messages Received</span>
            <span className="stat-value">{stats.week.messagesReceived}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Logins</span>
            <span className="stat-value">{stats.week.logins}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Total Activity</span>
            <span className="stat-value">{stats.week.total}</span>
          </div>
        </div>
      </div>
      
      <div className="last-activity">
        <h3>Last Activity</h3>
        {stats.lastActivity ? (
          <div className="last-activity-item">
            <div className="activity-type">
              {formatActivityType(stats.lastActivity.type)}
            </div>
            <div className="activity-time">
              {formatDate(stats.lastActivity.timestamp)}
            </div>
          </div>
        ) : (
          <div className="no-activity">No activity recorded</div>
        )}
      </div>
      
      <div className="analytics-actions">
        <button 
          className="clear-log-button"
          onClick={handleClearLog}
        >
          Clear Activity Log
        </button>
      </div>
    </div>
  );
};

export default UserAnalytics;
