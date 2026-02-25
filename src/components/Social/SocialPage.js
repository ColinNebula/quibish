import React from 'react';
import NewsFeed from './NewsFeed';
import './SocialPage.css';

/**
 * Social Page Component - Example integration of News Feed
 * 
 * This component demonstrates how to integrate the News Feed
 * into your application with proper layout and structure.
 */
const SocialPage = ({ user }) => {
  if (!user) {
    return (
      <div className="social-page-error">
        <h2>Please log in to view your feed</h2>
      </div>
    );
  }

  return (
    <div className="social-page">
      {/* Left Sidebar - Optional navigation/menu */}
      <aside className="social-sidebar-left">
        <div className="sidebar-section">
          <h3>Menu</h3>
          <nav className="sidebar-nav">
            <a href="#feed" className="nav-item active">
              <span className="nav-icon">🏠</span>
              <span className="nav-label">News Feed</span>
            </a>
            <a href="#profile" className="nav-item">
              <span className="nav-icon">👤</span>
              <span className="nav-label">Profile</span>
            </a>
            <a href="#friends" className="nav-item">
              <span className="nav-icon">👥</span>
              <span className="nav-label">Friends</span>
            </a>
            <a href="#groups" className="nav-item">
              <span className="nav-icon">👨‍👩‍👧‍👦</span>
              <span className="nav-label">Groups</span>
            </a>
            <a href="#messages" className="nav-item">
              <span className="nav-icon">💬</span>
              <span className="nav-label">Messages</span>
            </a>
            <a href="#notifications" className="nav-item">
              <span className="nav-icon">🔔</span>
              <span className="nav-label">Notifications</span>
            </a>
          </nav>
        </div>

        <div className="sidebar-section">
          <h3>Shortcuts</h3>
          <div className="shortcuts">
            <a href="#trending" className="shortcut-item">
              <span className="shortcut-icon">🔥</span>
              <span className="shortcut-label">Trending</span>
            </a>
            <a href="#saved" className="shortcut-item">
              <span className="shortcut-icon">🔖</span>
              <span className="shortcut-label">Saved</span>
            </a>
          </div>
        </div>
      </aside>

      {/* Main Content - News Feed */}
      <main className="social-main">
        <NewsFeed user={user} />
      </main>

      {/* Right Sidebar - Optional widgets */}
      <aside className="social-sidebar-right">
        <div className="widget">
          <h3>Sponsored</h3>
          <div className="sponsored-content">
            <p>Advertisement space</p>
          </div>
        </div>

        <div className="widget">
          <h3>Friend Suggestions</h3>
          <div className="suggestions-list">
            <div className="suggestion-item">
              <div className="suggestion-avatar">👤</div>
              <div className="suggestion-info">
                <div className="suggestion-name">Jane Smith</div>
                <div className="suggestion-mutual">5 mutual friends</div>
              </div>
              <button className="btn-add-friend">Add Friend</button>
            </div>
          </div>
        </div>

        <div className="widget">
          <h3>Trending Topics</h3>
          <div className="trending-list">
            <a href="#tech" className="trending-item">
              <span className="trending-hashtag">#Technology</span>
              <span className="trending-count">12.5K posts</span>
            </a>
            <a href="#news" className="trending-item">
              <span className="trending-hashtag">#News</span>
              <span className="trending-count">8.2K posts</span>
            </a>
            <a href="#sports" className="trending-item">
              <span className="trending-hashtag">#Sports</span>
              <span className="trending-count">6.1K posts</span>
            </a>
          </div>
        </div>
      </aside>
    </div>
  );
};

export default SocialPage;
