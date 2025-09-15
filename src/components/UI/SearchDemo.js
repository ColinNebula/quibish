import React, { useState } from 'react';
import EnhancedSearch from '../UI/EnhancedSearch';
import './SearchDemo.css';

/**
 * Demo component to showcase the Enhanced Search functionality
 * 
 * @component SearchDemo
 */
const SearchDemo = () => {
  const [searchActive, setSearchActive] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [lastSelectedResult, setLastSelectedResult] = useState(null);

  const handleResultSelect = (result) => {
    setLastSelectedResult(result);
    console.log('Selected search result:', result);
    
    // Show result details in a modal or sidebar in a real app
    alert(`Selected: ${result.title} (${result.type})`);
  };

  const toggleSearch = () => {
    setSearchActive(!searchActive);
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  return (
    <div className={`search-demo ${darkMode ? 'dark' : ''}`}>
      <div className="search-demo-header">
        <h1>Enhanced Search Demo</h1>
        <p>Experience comprehensive search across conversations, users, messages, and media files</p>
        
        <div className="search-demo-controls">
          <button 
            className="demo-button primary"
            onClick={toggleSearch}
          >
            {searchActive ? 'Close Search' : 'Open Search'}
          </button>
          
          <button 
            className="demo-button secondary"
            onClick={toggleDarkMode}
          >
            {darkMode ? 'Light Mode' : 'Dark Mode'}
          </button>
        </div>
      </div>

      <div className="search-demo-content">
        <div className="search-demo-features">
          <div className="feature-card">
            <div className="feature-icon">💬</div>
            <h3>Conversations</h3>
            <p>Search through all your conversations and find specific chats quickly</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">💬</div>
            <h3>Messages</h3>
            <p>Find specific messages across all conversations with content highlighting</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">👥</div>
            <h3>Users</h3>
            <p>Search for users by name, username, or profile information</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">📸</div>
            <h3>Images</h3>
            <p>Find shared photos and images with thumbnail previews</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">🎥</div>
            <h3>Videos</h3>
            <p>Locate video files and clips shared in conversations</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">🎵</div>
            <h3>Audio</h3>
            <p>Search through voice messages and audio files</p>
          </div>
        </div>

        <div className="search-demo-instructions">
          <h2>Try These Search Examples:</h2>
          <ul>
            <li><strong>"john"</strong> - Find users and conversations with John</li>
            <li><strong>"meeting"</strong> - Search for messages about meetings</li>
            <li><strong>"vacation"</strong> - Find vacation-related content</li>
            <li><strong>"presentation"</strong> - Look for presentation files</li>
            <li><strong>"birthday"</strong> - Find birthday photos and messages</li>
          </ul>
        </div>

        {lastSelectedResult && (
          <div className="search-demo-result">
            <h2>Last Selected Result:</h2>
            <div className="result-preview">
              <div className="result-type">{lastSelectedResult.type}</div>
              <div className="result-title">{lastSelectedResult.title}</div>
              <div className="result-subtitle">{lastSelectedResult.subtitle}</div>
              {lastSelectedResult.description && (
                <div className="result-description">{lastSelectedResult.description}</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Search Component */}
      <EnhancedSearch
        isActive={searchActive}
        onToggle={setSearchActive}
        onResultSelect={handleResultSelect}
        darkMode={darkMode}
        placeholder="Search conversations, users, messages, photos, videos, audio files..."
      />
    </div>
  );
};

export default SearchDemo;
