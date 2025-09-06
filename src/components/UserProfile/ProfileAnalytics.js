import React, { useState, useEffect } from 'react';
import './ProfileAnalytics.css';
import userDataService from '../../services/userDataService';

const ProfileAnalytics = ({ userProfile, onClose }) => {
  const [analytics, setAnalytics] = useState({
    profileViews: 0,
    monthlyViews: 0,
    topViewers: [],
    uploadStats: {
      totalUploads: 0,
      totalViews: 0,
      totalLikes: 0,
      mostViewedContent: null
    },
    activityStats: {
      messagesCount: 0,
      reactionsGiven: 0,
      connectionsCount: 0,
      joinDate: null
    }
  });
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('month');

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        setLoading(true);
        const data = await userDataService.fetchUserAnalytics(userProfile.id, timeframe);
        setAnalytics(data);
      } catch (error) {
        console.error('Error loading analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, [userProfile.id, timeframe]);

  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const StatCard = ({ icon, title, value, subtitle, trend }) => (
    <div className="stat-card">
      <div className="stat-icon">{icon}</div>
      <div className="stat-content">
        <h3>{formatNumber(value)}</h3>
        <p className="stat-title">{title}</p>
        {subtitle && <p className="stat-subtitle">{subtitle}</p>}
        {trend && (
          <div className={`stat-trend ${trend > 0 ? 'positive' : 'negative'}`}>
            {trend > 0 ? '↗️' : '↘️'} {Math.abs(trend)}%
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="analytics-overlay" onClick={onClose}>
      <div className="analytics-modal" onClick={(e) => e.stopPropagation()}>
        <div className="analytics-header">
          <h2>📊 Profile Analytics</h2>
          <div className="timeframe-selector">
            <select 
              value={timeframe} 
              onChange={(e) => setTimeframe(e.target.value)}
            >
              <option value="week">Last 7 days</option>
              <option value="month">Last 30 days</option>
              <option value="quarter">Last 3 months</option>
              <option value="year">Last year</option>
            </select>
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="analytics-content">
          {loading ? (
            <div className="loading-spinner">Loading analytics...</div>
          ) : (
            <>
              {/* Overview Stats */}
              <div className="stats-grid">
                <StatCard
                  icon="👁️"
                  title="Profile Views"
                  value={analytics.profileViews}
                  subtitle="Total views"
                  trend={12}
                />
                <StatCard
                  icon="📈"
                  title="Monthly Growth"
                  value={analytics.monthlyViews}
                  subtitle="Views this month"
                  trend={8}
                />
                <StatCard
                  icon="📁"
                  title="Total Uploads"
                  value={analytics.uploadStats.totalUploads}
                  subtitle="Content shared"
                />
                <StatCard
                  icon="👥"
                  title="Connections"
                  value={analytics.activityStats.connectionsCount}
                  subtitle="People connected"
                  trend={5}
                />
              </div>

              {/* Profile Verification Status */}
              <div className="verification-section">
                <h3>🛡️ Profile Verification</h3>
                <div className="verification-badges">
                  <div className={`verification-badge ${userProfile.email ? 'verified' : 'pending'}`}>
                    <span className="badge-icon">✉️</span>
                    <div className="badge-content">
                      <span className="badge-title">Email Verified</span>
                      <span className="badge-status">
                        {userProfile.email ? 'Verified' : 'Pending verification'}
                      </span>
                    </div>
                  </div>
                  
                  <div className={`verification-badge ${userProfile.phone ? 'verified' : 'pending'}`}>
                    <span className="badge-icon">📱</span>
                    <div className="badge-content">
                      <span className="badge-title">Phone Verified</span>
                      <span className="badge-status">
                        {userProfile.phone ? 'Verified' : 'Add phone number'}
                      </span>
                    </div>
                  </div>
                  
                  <div className={`verification-badge ${userProfile.socialLinks && Object.values(userProfile.socialLinks).some(link => link) ? 'verified' : 'pending'}`}>
                    <span className="badge-icon">🔗</span>
                    <div className="badge-content">
                      <span className="badge-title">Social Links</span>
                      <span className="badge-status">
                        {userProfile.socialLinks && Object.values(userProfile.socialLinks).some(link => link) 
                          ? 'Connected' : 'Add social links'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Content Performance */}
              <div className="content-section">
                <h3>📊 Content Performance</h3>
                <div className="content-stats">
                  <div className="content-stat">
                    <span className="content-icon">👀</span>
                    <div className="content-info">
                      <span className="content-value">{formatNumber(analytics.uploadStats.totalViews)}</span>
                      <span className="content-label">Total Views</span>
                    </div>
                  </div>
                  <div className="content-stat">
                    <span className="content-icon">❤️</span>
                    <div className="content-info">
                      <span className="content-value">{formatNumber(analytics.uploadStats.totalLikes)}</span>
                      <span className="content-label">Reactions Received</span>
                    </div>
                  </div>
                  <div className="content-stat">
                    <span className="content-icon">💬</span>
                    <div className="content-info">
                      <span className="content-value">{formatNumber(analytics.activityStats.messagesCount)}</span>
                      <span className="content-label">Messages Sent</span>
                    </div>
                  </div>
                </div>

                {analytics.uploadStats.mostViewedContent && (
                  <div className="most-viewed">
                    <h4>🏆 Most Viewed Content</h4>
                    <div className="content-preview">
                      <img 
                        src={analytics.uploadStats.mostViewedContent.thumbnail} 
                        alt="Most viewed content" 
                      />
                      <div className="content-details">
                        <span className="content-name">{analytics.uploadStats.mostViewedContent.name}</span>
                        <span className="content-views">
                          {formatNumber(analytics.uploadStats.mostViewedContent.views)} views
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Top Viewers */}
              {analytics.topViewers.length > 0 && (
                <div className="viewers-section">
                  <h3>🔥 Top Profile Viewers</h3>
                  <div className="viewers-list">
                    {analytics.topViewers.slice(0, 5).map((viewer, index) => (
                      <div key={viewer.id} className="viewer-item">
                        <div className="viewer-rank">#{index + 1}</div>
                        <img src={viewer.avatar} alt={viewer.name} className="viewer-avatar" />
                        <div className="viewer-info">
                          <span className="viewer-name">{viewer.name}</span>
                          <span className="viewer-views">{viewer.viewCount} views</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Account Info */}
              <div className="account-section">
                <h3>📅 Account Information</h3>
                <div className="account-info">
                  <div className="info-item">
                    <span className="info-label">Member since:</span>
                    <span className="info-value">
                      {analytics.activityStats.joinDate ? formatDate(analytics.activityStats.joinDate) : 'N/A'}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Account type:</span>
                    <span className="info-value">{userProfile.role || 'Standard'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Status:</span>
                    <span className={`status-badge ${userProfile.isOnline ? 'online' : 'offline'}`}>
                      {userProfile.isOnline ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileAnalytics;