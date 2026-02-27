import React, { useState, useEffect, useCallback, useRef } from 'react';
import './GifPicker.css';

// â”€â”€ Tenor API (v2) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Uses the official demo key for development. Set REACT_APP_TENOR_API_KEY in
// your .env to replace it in production.
const TENOR_KEY = process.env.REACT_APP_TENOR_API_KEY || 'LIVDSRZULELA';
const TENOR_BASE = 'https://tenor.googleapis.com/v2';
const TENOR_PARAMS = `key=${TENOR_KEY}&limit=24&media_filter=gif,tinygif&content_filter=medium&ar_range=all`;

const normalizeTenor = (item) => ({
  id: item.id,
  url: item.media_formats?.gif?.url || item.media_formats?.tinygif?.url || '',
  previewUrl: item.media_formats?.tinygif?.url || item.media_formats?.gif?.url || '',
  name: item.title || item.content_description || 'GIF',
  width: (item.media_formats?.gif?.dims || item.media_formats?.tinygif?.dims || [480, 270])[0],
  height: (item.media_formats?.gif?.dims || item.media_formats?.tinygif?.dims || [480, 270])[1],
  size: item.media_formats?.gif?.size || 0,
});

const fetchTenor = async (endpoint) => {
  const res = await fetch(`${TENOR_BASE}/${endpoint}&${TENOR_PARAMS}`);
  if (!res.ok) throw new Error(`Tenor ${res.status}`);
  const data = await res.json();
  return (data.results || []).map(normalizeTenor);
};

// â”€â”€ localStorage helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const RECENT_KEY = 'quibish_recent_gifs';
const FAVS_KEY   = 'quibish_fav_gifs';
const MAX_RECENT = 16;

const readLS = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch (_) { return fallback; }
};
const writeLS = (key, val) => {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch (_) {}
};

// â”€â”€ Category chips â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const CATEGORIES = [
  { query: 'trending',   label: '\uD83D\uDD25 Trending' },
  { query: 'reactions',  label: '\uD83D\uDE02 Reactions' },
  { query: 'love',       label: '\u2764\uFE0F Love' },
  { query: 'funny',      label: '\uD83D\uDE06 Funny' },
  { query: 'excited',    label: '\uD83C\uDF89 Excited' },
  { query: 'sad',        label: '\uD83D\uDE22 Sad' },
  { query: 'animals',    label: '\uD83D\uDC31 Animals' },
  { query: 'sports',     label: '\u26BD Sports' },
  { query: 'food',       label: '\uD83C\uDF55 Food' },
  { query: 'thumbs up',  label: '\uD83D\uDC4D Approve' },
];

// â”€â”€ Fallback mock GIFs (shown when Tenor is unreachable) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const MOCK_GIFS = [
  { id: 'm1', url: 'https://media.giphy.com/media/3oKIPnAiaMCws8nOsE/giphy.gif', previewUrl: 'https://media.giphy.com/media/3oKIPnAiaMCws8nOsE/giphy.gif', name: 'Happy Dance',   width: 480, height: 270, size: 1024000 },
  { id: 'm2', url: 'https://media.giphy.com/media/l0MYrLAFex1R71l0A/giphy.gif', previewUrl: 'https://media.giphy.com/media/l0MYrLAFex1R71l0A/giphy.gif', name: 'Funny Cat',    width: 480, height: 360, size: 856000  },
  { id: 'm3', url: 'https://media.giphy.com/media/3o7TKTDn976rzVgky4/giphy.gif', previewUrl: 'https://media.giphy.com/media/3o7TKTDn976rzVgky4/giphy.gif', name: 'Excited',      width: 400, height: 300, size: 975000  },
  { id: 'm4', url: 'https://media.giphy.com/media/l1J9u3TZfpmeDLkD6/giphy.gif', previewUrl: 'https://media.giphy.com/media/l1J9u3TZfpmeDLkD6/giphy.gif', name: 'Thumbs Up',    width: 480, height: 480, size: 642000  },
  { id: 'm5', url: 'https://media.giphy.com/media/3o7aD2saalBwwftBIY/giphy.gif', previewUrl: 'https://media.giphy.com/media/3o7aD2saalBwwftBIY/giphy.gif', name: 'Party Time',   width: 500, height: 375, size: 1200000 },
  { id: 'm6', url: 'https://media.giphy.com/media/26AHPxxnSw1L9T1rW/giphy.gif', previewUrl: 'https://media.giphy.com/media/26AHPxxnSw1L9T1rW/giphy.gif', name: 'Mind Blown',   width: 480, height: 270, size: 890000  },
  { id: 'm7', url: 'https://media.giphy.com/media/l3vR85PnGsBwu1PFK/giphy.gif', previewUrl: 'https://media.giphy.com/media/l3vR85PnGsBwu1PFK/giphy.gif', name: 'Love Hearts',  width: 480, height: 360, size: 756000  },
  { id: 'm8', url: 'https://media.giphy.com/media/3o6Zt0hNCfak3QCqsw/giphy.gif', previewUrl: 'https://media.giphy.com/media/3o6Zt0hNCfak3QCqsw/giphy.gif', name: 'Crying Sad',   width: 400, height: 400, size: 623000  },
];

// â”€â”€ Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const GifPicker = ({ isOpen, onClose, onGifSelect }) => {
  const [tab, setTab]           = useState('trending'); // 'trending' | 'recent' | 'favorites'
  const [searchTerm, setSearchTerm] = useState('');
  const [gifs, setGifs]         = useState([]);
  const [loading, setLoading]   = useState(false);
  const [nextPos, setNextPos]   = useState('');   // Tenor pagination cursor
  const [hasMore, setHasMore]   = useState(false);
  const [recentGifs, setRecentGifs]   = useState(() => readLS(RECENT_KEY, []));
  const [favoriteGifs, setFavoriteGifs] = useState(() => readLS(FAVS_KEY, []));
  const debounceRef = useRef(null);
  const searchInputRef = useRef(null);

  // favoriteIds set for O(1) lookup
  const favoriteIds = new Set(favoriteGifs.map(g => g.id));

  // \u2500\u2500 Load trending on open, reset on close \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  useEffect(() => {
    if (!isOpen) return;
    setSearchTerm('');
    setTab('trending');
    loadTrending();
    setTimeout(() => searchInputRef.current?.focus(), 150);
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Escape key to close
  useEffect(() => {
    if (!isOpen) return;
    const fn = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, [isOpen, onClose]);

  // \u2500\u2500 Fetch helpers \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  const loadTrending = useCallback(async () => {
    setLoading(true);
    try {
      const results = await fetchTenor('featured?');
      setGifs(results);
      setHasMore(results.length >= 24);
      setNextPos('');
    } catch (_) {
      setGifs(MOCK_GIFS);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const searchGifs = useCallback(async (query, cursor = '') => {
    if (!query.trim()) { loadTrending(); return; }
    setLoading(true);
    const posParam = cursor ? `&pos=${cursor}` : '';
    try {
      const res = await fetch(
        `${TENOR_BASE}/search?q=${encodeURIComponent(query)}${posParam}&${TENOR_PARAMS}`
      );
      if (!res.ok) throw new Error(`Tenor ${res.status}`);
      const data = await res.json();
      const results = (data.results || []).map(normalizeTenor);
      if (cursor) {
        setGifs(prev => [...prev, ...results]);
      } else {
        setGifs(results);
      }
      setNextPos(data.next || '');
      setHasMore(!!data.next && results.length >= 24);
    } catch (_) {
      if (!cursor) {
        const q = query.toLowerCase();
        const filtered = MOCK_GIFS.filter(g => g.name.toLowerCase().includes(q));
        setGifs(filtered.length ? filtered : MOCK_GIFS);
        setHasMore(false);
      }
    } finally {
      setLoading(false);
    }
  }, [loadTrending]);

  // \u2500\u2500 Search input with debounce \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchTerm(val);
    setNextPos('');
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchGifs(val), 350);
  };

  const handleCategoryClick = (query) => {
    setSearchTerm(query);
    setNextPos('');
    setTab('trending');
    clearTimeout(debounceRef.current);
    searchGifs(query);
  };

  // \u2500\u2500 Favorites toggle \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  const toggleFavorite = useCallback((e, gif) => {
    e.stopPropagation();
    setFavoriteGifs(prev => {
      const already = prev.some(g => g.id === gif.id);
      const next = already ? prev.filter(g => g.id !== gif.id) : [gif, ...prev];
      writeLS(FAVS_KEY, next);
      return next;
    });
  }, []);

  // \u2500\u2500 GIF selection (saves to recent) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  const handleGifClick = useCallback((gif) => {
    setRecentGifs(prev => {
      const deduped = [gif, ...prev.filter(g => g.id !== gif.id)].slice(0, MAX_RECENT);
      writeLS(RECENT_KEY, deduped);
      return deduped;
    });
    onGifSelect(gif);
    onClose();
  }, [onGifSelect, onClose]);

  // \u2500\u2500 Load more (pagination) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  const handleLoadMore = () => {
    if (!loading && hasMore) searchGifs(searchTerm, nextPos);
  };

  // \u2500\u2500 Render helpers \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  const renderGifItem = (gif) => (
    <div
      key={gif.id}
      className="gif-item"
      onClick={() => handleGifClick(gif)}
      role="button"
      tabIndex={0}
      aria-label={`Select ${gif.name} GIF`}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleGifClick(gif); } }}
    >
      <img
        src={gif.previewUrl || gif.url}
        alt={gif.name}
        loading="lazy"
        style={{ aspectRatio: `${gif.width}/${gif.height}` }}
        onError={(e) => { e.target.src = gif.url; }}
      />
      <button
        className={`gif-fav-btn${favoriteIds.has(gif.id) ? ' active' : ''}`}
        onClick={(e) => toggleFavorite(e, gif)}
        aria-label={favoriteIds.has(gif.id) ? 'Remove from favorites' : 'Add to favorites'}
        title={favoriteIds.has(gif.id) ? 'Remove favorite' : 'Add to favorites'}
      >
        {favoriteIds.has(gif.id) ? '\u2665\ufe0f' : '\u2661'}
      </button>
      <div className="gif-overlay"><span>{gif.name}</span></div>
    </div>
  );

  const displayGifs = tab === 'recent'    ? recentGifs
                    : tab === 'favorites' ? favoriteGifs
                    : gifs;

  if (!isOpen) return null;

  return (
    <div className="gif-picker-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="gif-picker-modal">
        {/* Header */}
        <div className="gif-picker-header">
          <span className="gif-header-logo">GIF</span>
          <h3>Choose a GIF</h3>
          <button className="close-btn" onClick={onClose} aria-label="Close GIF picker">\u00d7</button>
        </div>

        {/* Search bar */}
        <div className="gif-search">
          <span className="gif-search-icon">\ud83d\udd0d</span>
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search Tenor..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="gif-search-input"
          />
          {searchTerm && (
            <button className="gif-search-clear" onClick={() => { setSearchTerm(''); setNextPos(''); loadTrending(); }} aria-label="Clear search">\u00d7</button>
          )}
        </div>

        {/* Tab bar */}
        <div className="gif-tabs">
          {[['trending', '\ud83d\udd25 GIFs'], ['recent', '\ud83d\udd52 Recent'], ['favorites', '\u2665\ufe0f Saved']].map(([id, label]) => (
            <button
              key={id}
              className={`gif-tab${tab === id ? ' active' : ''}`}
              onClick={() => setTab(id)}
            >
              {label}
              {id === 'recent' && recentGifs.length > 0 && <span className="gif-tab-badge">{recentGifs.length}</span>}
              {id === 'favorites' && favoriteGifs.length > 0 && <span className="gif-tab-badge">{favoriteGifs.length}</span>}
            </button>
          ))}
        </div>

        {/* Category chips */}
        {tab === 'trending' && !searchTerm && (
          <div className="gif-categories">
            {CATEGORIES.map(({ query, label }) => (
              <button key={query} className="category-btn" onClick={() => handleCategoryClick(query)}>
                {label}
              </button>
            ))}
          </div>
        )}

        {/* GIF grid */}
        <div className="gif-grid">
          {loading && displayGifs.length === 0 ? (
            <div className="gif-loading">
              <div className="loading-spinner"></div>
              <p>Loading GIFs\u2026</p>
            </div>
          ) : displayGifs.length > 0 ? (
            <>
              {displayGifs.map(renderGifItem)}
              {tab === 'trending' && hasMore && (
                <button className="gif-load-more" onClick={handleLoadMore} disabled={loading}>
                  {loading ? 'Loading\u2026' : 'Load more'}
                </button>
              )}
            </>
          ) : (
            <div className="no-results">
              {tab === 'recent' ? (
                <>
                  <p>\ud83d\udd52 No recently used GIFs</p>
                  <span>GIFs you send will appear here</span>
                </>
              ) : tab === 'favorites' ? (
                <>
                  <p>\u2665\ufe0f No saved GIFs</p>
                  <span>Tap the heart icon on any GIF to save it</span>
                </>
              ) : (
                <>
                  <p>No GIFs found</p>
                  <span>Try a different search term</span>
                  <button className="reset-search-btn" onClick={() => { setSearchTerm(''); setNextPos(''); loadTrending(); }}>Show Trending</button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Tenor attribution (required by Tenor API terms) */}
        <div className="gif-footer">
          <span>Powered by</span>
          <img src="https://www.gstatic.com/tenor/web/attribution/via_tenor_logo_grey.svg" alt="Tenor" className="gif-tenor-logo" onError={(e) => { e.target.style.display='none'; e.target.previousSibling.textContent='Powered by Tenor'; }} />
        </div>
      </div>
    </div>
  );
};

export default GifPicker;
