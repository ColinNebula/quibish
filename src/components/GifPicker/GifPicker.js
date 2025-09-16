import React, { useState, useEffect, useCallback } from 'react';
import './GifPicker.css';

const GifPicker = ({ isOpen, onClose, onSelectGif }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [gifs, setGifs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [trending, setTrending] = useState([]);

  // Mock trending GIFs
  const mockTrendingGifs = [
    { id: '1', url: 'https://media.giphy.com/media/3oKIPnAiaMCws8nOsE/giphy.gif', title: 'Happy' },
    { id: '2', url: 'https://media.giphy.com/media/l0MYrLAFex1R71l0A/giphy.gif', title: 'Funny' },
    { id: '3', url: 'https://media.giphy.com/media/3o7TKTDn976rzVgky4/giphy.gif', title: 'Excited' },
    { id: '4', url: 'https://media.giphy.com/media/l1J9u3TZfpmeDLkD6/giphy.gif', title: 'Thumbs Up' },
    { id: '5', url: 'https://media.giphy.com/media/3o7aD2saalBwwftBIY/giphy.gif', title: 'Celebration' }
  ];

  // Load trending GIFs on mount
  useEffect(() => {
    if (isOpen) {
      setTrending(mockTrendingGifs);
      setGifs(mockTrendingGifs);
    }
  }, [isOpen]);

  // Search for GIFs
  const searchGifs = useCallback(async (query) => {
    if (!query.trim()) {
      setGifs(trending);
      return;
    }

    setLoading(true);
    try {
      // Mock search results based on query
      const mockResults = mockTrendingGifs.filter(gif => 
        gif.title.toLowerCase().includes(query.toLowerCase())
      );
      
      setGifs(mockResults);
    } catch (error) {
      console.error('GIF search failed:', error);
      setGifs([]);
    }
    setLoading(false);
  }, [trending]);

  // Handle search input change
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    // Debounce search
    const timeoutId = setTimeout(() => {
      searchGifs(value);
    }, 300);
    
    return () => clearTimeout(timeoutId);
  };

  // Handle GIF selection
  const handleGifSelect = (gif) => {
    onSelectGif(gif);
    onClose();
  };

  // Handle click outside to close
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="gif-picker-overlay" onClick={handleOverlayClick}>
      <div className="gif-picker-modal">
        <div className="gif-picker-header">
          <h3>Choose a GIF</h3>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>
        
        <div className="gif-search">
          <input
            type="text"
            placeholder="Search for GIFs..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="gif-search-input"
          />
        </div>
        
        <div className="gif-grid">
          {loading ? (
            <div className="gif-loading">
              <div className="loading-spinner"></div>
              <p>Searching...</p>
            </div>
          ) : gifs.length > 0 ? (
            gifs.map((gif) => (
              <div
                key={gif.id}
                className="gif-item"
                onClick={() => handleGifSelect(gif)}
              >
                <img
                  src={gif.url}
                  alt={gif.title}
                  loading="lazy"
                />
                <div className="gif-overlay">
                  <span>{gif.title}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="no-results">
              <p>No GIFs found</p>
              <span>Try a different search term</span>
            </div>
          )}
        </div>
        
        {!searchTerm && (
          <div className="gif-categories">
            <h4>Popular Categories</h4>
            <div className="category-buttons">
              {['Happy', 'Funny', 'Love', 'Sad', 'Excited', 'Thumbs Up'].map(category => (
                <button
                  key={category}
                  className="category-btn"
                  onClick={() => {
                    setSearchTerm(category);
                    searchGifs(category);
                  }}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GifPicker;