import React, { useState, useEffect, useCallback } from 'react';
import './GifPicker.css';

const GifPicker = ({ isOpen, onClose, onGifSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [gifs, setGifs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [trending, setTrending] = useState([]);

  // Mock trending GIFs with enhanced data structure
  const mockTrendingGifs = [
    { 
      id: '1', 
      url: 'https://media.giphy.com/media/3oKIPnAiaMCws8nOsE/giphy.gif', 
      name: 'Happy Dance',
      title: 'Happy',
      size: 1024000,
      width: 480,
      height: 270
    },
    { 
      id: '2', 
      url: 'https://media.giphy.com/media/l0MYrLAFex1R71l0A/giphy.gif', 
      name: 'Funny Cat',
      title: 'Funny',
      size: 856000,
      width: 480,
      height: 360
    },
    { 
      id: '3', 
      url: 'https://media.giphy.com/media/3o7TKTDn976rzVgky4/giphy.gif', 
      name: 'Excited Jump',
      title: 'Excited',
      size: 975000,
      width: 400,
      height: 300
    },
    { 
      id: '4', 
      url: 'https://media.giphy.com/media/l1J9u3TZfpmeDLkD6/giphy.gif', 
      name: 'Thumbs Up',
      title: 'Approval',
      size: 642000,
      width: 480,
      height: 480
    },
    { 
      id: '5', 
      url: 'https://media.giphy.com/media/3o7aD2saalBwwftBIY/giphy.gif', 
      name: 'Party Time',
      title: 'Celebration',
      size: 1200000,
      width: 500,
      height: 375
    },
    { 
      id: '6', 
      url: 'https://media.giphy.com/media/26AHPxxnSw1L9T1rW/giphy.gif', 
      name: 'Mind Blown',
      title: 'Surprised',
      size: 890000,
      width: 480,
      height: 270
    },
    { 
      id: '7', 
      url: 'https://media.giphy.com/media/l3vR85PnGsBwu1PFK/giphy.gif', 
      name: 'Love Hearts',
      title: 'Love',
      size: 756000,
      width: 480,
      height: 360
    },
    { 
      id: '8', 
      url: 'https://media.giphy.com/media/3o6Zt0hNCfak3QCqsw/giphy.gif', 
      name: 'Crying Sad',
      title: 'Sad',
      size: 623000,
      width: 400,
      height: 400
    }
  ];

  // Load trending GIFs on mount
  useEffect(() => {
    if (isOpen) {
      setTrending(mockTrendingGifs);
      setGifs(mockTrendingGifs);
    }
  }, [isOpen]);

  // Search for GIFs with improved logic
  const searchGifs = useCallback(async (query) => {
    if (!query.trim()) {
      setGifs(trending);
      return;
    }

    setLoading(true);
    try {
      // Enhanced mock search that includes name and title
      const mockResults = mockTrendingGifs.filter(gif => 
        gif.title.toLowerCase().includes(query.toLowerCase()) ||
        gif.name.toLowerCase().includes(query.toLowerCase())
      );
      
      // If no results, show some fallback GIFs
      if (mockResults.length === 0) {
        setGifs(trending.slice(0, 3)); // Show first 3 trending as fallback
      } else {
        setGifs(mockResults);
      }
    } catch (error) {
      console.error('GIF search failed:', error);
      setGifs(trending.slice(0, 3)); // Fallback to trending
    }
    setLoading(false);
  }, [trending, mockTrendingGifs]);

  // Handle keyboard navigation and escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Focus the search input when opened
      setTimeout(() => {
        const searchInput = document.querySelector('.gif-search-input');
        if (searchInput) searchInput.focus();
      }, 100);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Handle search input change with improved debouncing
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    // Clear previous timeout
    if (window.gifSearchTimeout) {
      clearTimeout(window.gifSearchTimeout);
    }
    
    // Debounce search
    window.gifSearchTimeout = setTimeout(() => {
      searchGifs(value);
    }, 300);
  };

  // Handle GIF selection
  const handleGifSelect = (gif) => {
    console.log('GIF selected:', gif);
    onGifSelect(gif);
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
              <p>Loading GIFs...</p>
              <span>Finding the perfect reaction</span>
            </div>
          ) : gifs.length > 0 ? (
            gifs.map((gif) => (
              <div
                key={gif.id}
                className="gif-item"
                onClick={() => handleGifSelect(gif)}
                role="button"
                tabIndex={0}
                aria-label={`Select ${gif.name || gif.title} GIF`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleGifSelect(gif);
                  }
                }}
              >
                <img
                  src={gif.url}
                  alt={gif.name || gif.title}
                  loading="lazy"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.style.background = '#f0f0f0';
                    e.target.parentElement.innerHTML += '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#999;font-size:12px;">Failed to load</div>';
                  }}
                />
                <div className="gif-overlay">
                  <span>{gif.name || gif.title}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="no-results">
              <p>No GIFs found</p>
              <span>Try searching for something else</span>
              <button 
                className="reset-search-btn"
                onClick={() => {
                  setSearchTerm('');
                  setGifs(trending);
                }}
              >
                Show Trending
              </button>
            </div>
          )}
        </div>
        
        {!searchTerm && (
          <div className="gif-categories">
            <h4>Popular Categories</h4>
            <div className="category-buttons">
              {['Happy', 'Funny', 'Love', 'Sad', 'Excited', 'Surprised', 'Celebration', 'Approval'].map(category => (
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