import React, { useState, useRef, useEffect, useCallback } from 'react';
import { performSearch, getSearchSuggestions, quickSearch, SEARCH_TYPES, RESULT_TYPES } from '../../services/searchService';
import './EnhancedSearch.css';

/**
 * Enhanced Search Component with comprehensive search capabilities
 * 
 * @component EnhancedSearch
 * @param {Object} props - Component props
 * @param {boolean} props.isActive - Whether search is currently active
 * @param {Function} props.onToggle - Function to toggle search visibility
 * @param {Function} props.onResultSelect - Function called when a result is selected
 * @param {boolean} props.darkMode - Dark mode state
 * @param {string} props.placeholder - Search input placeholder
 */
const EnhancedSearch = ({
  isActive = false,
  onToggle,
  onResultSelect,
  darkMode = false,
  placeholder = "Search conversations, users, messages, files..."
}) => {
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState(SEARCH_TYPES.ALL);
  const [results, setResults] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [quickResults, setQuickResults] = useState([]);
  
  const searchInputRef = useRef(null);
  const searchContainerRef = useRef(null);
  const resultsRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  // Focus input when search becomes active
  useEffect(() => {
    if (isActive && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isActive]);

  // Close search when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        if (onToggle) onToggle(false);
      }
    };

    if (isActive) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isActive, onToggle]);

  // Debounced search function
  const debouncedSearch = useCallback(async (searchQuery, type) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      if (searchQuery.trim().length >= 2) {
        setIsLoading(true);
        try {
          const searchResults = await performSearch(searchQuery, type);
          setResults(searchResults);
        } catch (error) {
          console.error('Search error:', error);
          setResults([]);
        } finally {
          setIsLoading(false);
        }
      } else {
        setResults([]);
        setIsLoading(false);
      }
    }, 300);
  }, []);

  // Handle input change
  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    setSelectedIndex(-1);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (value.trim().length === 0) {
      setResults([]);
      setSuggestions([]);
      setQuickResults([]);
      return;
    }

    // Get quick results for instant feedback
    const quick = quickSearch(value);
    setQuickResults(quick);

    // Get suggestions
    const searchSuggestions = getSearchSuggestions(value);
    setSuggestions(searchSuggestions);

    // Perform full search with debounce
    debouncedSearch(value, searchType);
  };

  // Handle search type change
  const handleSearchTypeChange = (type) => {
    setSearchType(type);
    if (query.trim().length >= 2) {
      debouncedSearch(query, type);
    }
  };

  // Handle key navigation
  const handleKeyDown = (e) => {
    const currentResults = results.length > 0 ? results : quickResults;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < currentResults.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : currentResults.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && currentResults[selectedIndex]) {
          handleResultSelect(currentResults[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setQuery('');
        setResults([]);
        setQuickResults([]);
        setSuggestions([]);
        if (onToggle) onToggle(false);
        break;
      default:
        // No action needed for other keys
        break;
    }
  };

  // Handle result selection
  const handleResultSelect = (result) => {
    if (onResultSelect) {
      onResultSelect(result);
    }
    setQuery('');
    setResults([]);
    setQuickResults([]);
    setSuggestions([]);
    if (onToggle) onToggle(false);
  };

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion) => {
    setQuery(suggestion.text);
    setSuggestions([]);
    debouncedSearch(suggestion.text, searchType);
    searchInputRef.current?.focus();
  };

  // Handle clear search
  const handleClear = () => {
    setQuery('');
    setResults([]);
    setQuickResults([]);
    setSuggestions([]);
    searchInputRef.current?.focus();
  };

  // Get icon for result type
  const getResultIcon = (type) => {
    switch (type) {
      case RESULT_TYPES.CONVERSATION:
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" fill="currentColor"/>
          </svg>
        );
      case RESULT_TYPES.MESSAGE:
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H6l-4 4V6c0-1.1.9-2 2-2z" fill="currentColor"/>
          </svg>
        );
      case RESULT_TYPES.USER:
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="currentColor"/>
          </svg>
        );
      case RESULT_TYPES.IMAGE:
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" fill="currentColor"/>
          </svg>
        );
      case RESULT_TYPES.VIDEO:
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" fill="currentColor"/>
          </svg>
        );
      case RESULT_TYPES.AUDIO:
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" fill="currentColor"/>
          </svg>
        );
      default:
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" fill="currentColor"/>
          </svg>
        );
    }
  };

  // Render search filters
  const renderFilters = () => (
    <div className="search-filters">
      {Object.values(SEARCH_TYPES).map(type => (
        <button
          key={type}
          className={`search-filter ${searchType === type ? 'active' : ''}`}
          onClick={() => handleSearchTypeChange(type)}
        >
          {type.charAt(0).toUpperCase() + type.slice(1)}
        </button>
      ))}
    </div>
  );

  // Render search result
  const renderResult = (result, index) => (
    <div
      key={`${result.type}-${result.id}`}
      className={`search-result ${selectedIndex === index ? 'selected' : ''}`}
      onClick={() => handleResultSelect(result)}
    >
      <div className="search-result-icon">
        {result.avatar ? (
          <img src={result.avatar} alt="" className="result-avatar" />
        ) : result.thumbnail ? (
          <img src={result.thumbnail} alt="" className="result-thumbnail" />
        ) : (
          getResultIcon(result.type)
        )}
      </div>
      <div className="search-result-content">
        <div className="search-result-title">{result.title}</div>
        <div className="search-result-subtitle">{result.subtitle}</div>
        {result.description && (
          <div className="search-result-description">{result.description}</div>
        )}
      </div>
      <div className="search-result-type">
        {result.type}
      </div>
    </div>
  );

  if (!isActive) return null;

  const currentResults = results.length > 0 ? results : quickResults;
  const showSuggestions = suggestions.length > 0 && query.length > 0 && currentResults.length === 0;

  return (
    <div className={`enhanced-search ${darkMode ? 'dark' : ''}`} ref={searchContainerRef}>
      <div className="search-input-container">
        <div className="search-input-wrapper">
          <div className="search-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="currentColor"/>
            </svg>
          </div>
          
          <input
            ref={searchInputRef}
            type="text"
            className="search-input"
            placeholder={placeholder}
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
          />
          
          {query && (
            <button className="search-clear" onClick={handleClear}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor"/>
              </svg>
            </button>
          )}
          
          <button 
            className="search-filters-toggle"
            onClick={() => setShowFilters(!showFilters)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z" fill="currentColor"/>
            </svg>
          </button>
        </div>
        
        {showFilters && renderFilters()}
      </div>

      {/* Search Results */}
      {(currentResults.length > 0 || isLoading) && (
        <div className="search-results" ref={resultsRef}>
          {isLoading ? (
            <div className="search-loading">
              <div className="loading-spinner"></div>
              <span>Searching...</span>
            </div>
          ) : (
            <>
              {currentResults.length > 0 && (
                <div className="search-results-header">
                  {results.length > 0 ? `${results.length} results` : 'Quick results'}
                </div>
              )}
              
              <div className="search-results-list">
                {currentResults.map((result, index) => renderResult(result, index))}
              </div>
              
              {results.length === 0 && quickResults.length > 0 && query.length >= 2 && (
                <div className="search-footer">
                  Type more characters for detailed results
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Search Suggestions */}
      {showSuggestions && (
        <div className="search-suggestions">
          <div className="search-suggestions-header">Suggestions</div>
          <div className="search-suggestions-list">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                className="search-suggestion"
                onClick={() => handleSuggestionSelect(suggestion)}
              >
                <span className="suggestion-icon">{suggestion.icon}</span>
                <span className="suggestion-text">{suggestion.text}</span>
                <span className="suggestion-type">{suggestion.type}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* No Results */}
      {query.length >= 2 && !isLoading && currentResults.length === 0 && suggestions.length === 0 && (
        <div className="search-no-results">
          <div className="no-results-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="currentColor"/>
            </svg>
          </div>
          <div className="no-results-title">No results found</div>
          <div className="no-results-subtitle">
            Try searching for conversations, users, messages, or files
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedSearch;
