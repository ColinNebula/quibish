import React, { useState, useCallback } from 'react';
import './GifPicker.css';

const GifPicker = ({ onGifSelect, onClose, isOpen }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('trending');

  // Popular GIF categories
  const categories = [
    { id: 'trending', name: 'Trending', emoji: '🔥' },
    { id: 'reactions', name: 'Reactions', emoji: '😂' },
    { id: 'emotions', name: 'Emotions', emoji: '❤️' },
    { id: 'animals', name: 'Animals', emoji: '🐱' },
    { id: 'sports', name: 'Sports', emoji: '⚽' },
    { id: 'entertainment', name: 'Entertainment', emoji: '🎬' }
  ];

  // Sample GIFs for demonstration (in production, you'd fetch from Giphy API)
  const sampleGifs = {
    trending: [
      {
        id: 1,
        url: 'https://media.giphy.com/media/3o7TKF1fSIs1R19B8Y/giphy.gif',
        preview: 'https://media.giphy.com/media/3o7TKF1fSIs1R19B8Y/200w_d.gif',
        title: 'Success Dance'
      },
      {
        id: 2,
        url: 'https://media.giphy.com/media/26u4lOMA8JKSnL9Uk/giphy.gif',
        preview: 'https://media.giphy.com/media/26u4lOMA8JKSnL9Uk/200w_d.gif',
        title: 'Celebration'
      },
      {
        id: 3,
        url: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif',
        preview: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/200w_d.gif',
        title: 'Mind Blown'
      },
      {
        id: 4,
        url: 'https://media.giphy.com/media/3o6Zt6KHxJTbXCnSvu/giphy.gif',
        preview: 'https://media.giphy.com/media/3o6Zt6KHxJTbXCnSvu/200w_d.gif',
        title: 'Thumbs Up'
      }
    ],
    reactions: [
      {
        id: 5,
        url: 'https://media.giphy.com/media/3o7aCSPqXE5C6T8tBC/giphy.gif',
        preview: 'https://media.giphy.com/media/3o7aCSPqXE5C6T8tBC/200w_d.gif',
        title: 'Shocked'
      },
      {
        id: 6,
        url: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif',
        preview: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/200w_d.gif',
        title: 'Laughing'
      }
    ],
    emotions: [
      {
        id: 7,
        url: 'https://media.giphy.com/media/3o6ZtpvPW6fqxkE1xu/giphy.gif',
        preview: 'https://media.giphy.com/media/3o6ZtpvPW6fqxkE1xu/200w_d.gif',
        title: 'Love Heart'
      }
    ],
    animals: [
      {
        id: 8,
        url: 'https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif',
        preview: 'https://media.giphy.com/media/JIX9t2j0ZTN9S/200w_d.gif',
        title: 'Cute Cat'
      }
    ]
  };

  const handleGifClick = useCallback((gif) => {
    onGifSelect({
      name: `${gif.title}.gif`,
      url: gif.url,
      size: 0, // Would be fetched from API in production
      type: 'image/gif',
      isGif: true
    });
    onClose();
  }, [onGifSelect, onClose]);

  const getCurrentGifs = () => {
    const gifs = sampleGifs[selectedCategory] || sampleGifs.trending;
    if (searchTerm) {
      return gifs.filter(gif =>
        gif.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return gifs;
  };

  if (!isOpen) return null;

  return (
    <div className="gif-picker-overlay">
      <div className="gif-picker">
        <div className="gif-picker-header">
          <h3>Choose a GIF</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="gif-search">
          <input
            type="text"
            placeholder="Search GIFs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="gif-search-input"
          />
        </div>

        <div className="gif-categories">
          {categories.map(category => (
            <button
              key={category.id}
              className={`category-btn ${selectedCategory === category.id ? 'active' : ''}`}
              onClick={() => setSelectedCategory(category.id)}
            >
              <span className="category-emoji">{category.emoji}</span>
              <span className="category-name">{category.name}</span>
            </button>
          ))}
        </div>

        <div className="gif-grid">
          {getCurrentGifs().map(gif => (
            <div
              key={gif.id}
              className="gif-item"
              onClick={() => handleGifClick(gif)}
            >
              <img
                src={gif.preview}
                alt={gif.title}
                className="gif-preview"
              />
              <div className="gif-overlay">
                <span className="gif-title">{gif.title}</span>
              </div>
            </div>
          ))}
        </div>

        {getCurrentGifs().length === 0 && (
          <div className="no-gifs">
            <p>No GIFs found for "{searchTerm}"</p>
            <p>Try a different search term</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GifPicker;