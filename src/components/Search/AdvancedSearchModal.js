// Advanced Search Modal Component
import React, { useState, useEffect, useRef, useCallback } from 'react';
import searchService from '../../services/searchService';
import './AdvancedSearchModal.css';

const AdvancedSearchModal = ({ 
  isOpen, 
  onClose, 
  onResultSelect,
  currentConversationId = null 
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [searchHistory, setSearchHistory] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [selectedResultIndex, setSelectedResultIndex] = useState(-1);
  
  const searchInputRef = useRef(null);
  const resultsRef = useRef(null);

  // Filters state
  const [filters, setFilters] = useState({
    conversationId: currentConversationId,
    userId: null,
    messageType: null,
    dateFrom: null,
    dateTo: null,
    hasAttachments: null,
    fuzzyMatch: true,
    limit: 20,
    offset: 0
  });

  // Load search history on mount
  useEffect(() => {
    if (isOpen) {
      setSearchHistory(searchService.getSearchHistory());
      // Focus search input
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 100);
    }
  }, [isOpen]);

  // Get search suggestions as user types
  useEffect(() => {
    if (query.length >= 2) {
      const fetchSuggestions = async () => {
        const sugg = await searchService.getSearchSuggestions(query, 5);
        setSuggestions(sugg);
      };
      
      const timeoutId = setTimeout(fetchSuggestions, 300);
      return () => clearTimeout(timeoutId);
    } else {
      setSuggestions([]);
    }
  }, [query]);

  // Perform search
  const performSearch = useCallback(async (searchQuery = query, page = 1) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    setSelectedResultIndex(-1);

    try {
      const searchFilters = {
        ...filters,
        offset: (page - 1) * filters.limit
      };

      const searchResult = await searchService.searchWithHighlights(searchQuery, searchFilters);
      
      setResults(searchResult.results);
      setTotalResults(searchResult.total);
      setTotalPages(searchResult.totalPages);
      setCurrentPage(page);
      
      console.log(`✅ Found ${searchResult.total} results for "${searchQuery}"`);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setLoading(false);
      setSuggestions([]); // Hide suggestions after search
    }
  }, [query, filters]);

  // Handle search submit
  const handleSearch = useCallback((e) => {
    e?.preventDefault();
    performSearch(query, 1);
  }, [query, performSearch]);

  // Handle filter change
  const handleFilterChange = useCallback((filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  }, []);

  // Apply filters and re-search
  const applyFilters = useCallback(() => {
    performSearch(query, 1);
    setShowFilters(false);
  }, [query, performSearch]);

  // Clear filters
  const clearFilters = useCallback(() => {
    setFilters({
      conversationId: currentConversationId,
      userId: null,
      messageType: null,
      dateFrom: null,
      dateTo: null,
      hasAttachments: null,
      fuzzyMatch: true,
      limit: 20,
      offset: 0
    });
  }, [currentConversationId]);

  // Handle result click
  const handleResultClick = useCallback((result) => {
    if (onResultSelect) {
      onResultSelect(result);
    }
    onClose();
  }, [onResultSelect, onClose]);

  // Handle pagination
  const goToPage = useCallback((page) => {
    if (page >= 1 && page <= totalPages) {
      performSearch(query, page);
    }
  }, [query, totalPages, performSearch]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowDown':
          e.preventDefault();
          setSelectedResultIndex(prev => 
            prev < results.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedResultIndex(prev => prev > 0 ? prev - 1 : -1);
          break;
        case 'Enter':
          if (selectedResultIndex >= 0 && results[selectedResultIndex]) {
            handleResultClick(results[selectedResultIndex]);
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedResultIndex, onClose, handleResultClick]);

  // Scroll selected result into view
  useEffect(() => {
    if (selectedResultIndex >= 0 && resultsRef.current) {
      const selectedElement = resultsRef.current.children[selectedResultIndex];
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedResultIndex]);

  // Handle suggestion click
  const handleSuggestionClick = useCallback((suggestion) => {
    setQuery(suggestion);
    performSearch(suggestion, 1);
  }, [performSearch]);

  // Handle history item click
  const handleHistoryClick = useCallback((historyItem) => {
    setQuery(historyItem.query);
    setFilters(prev => ({ ...prev, ...historyItem.filters }));
    performSearch(historyItem.query, 1);
  }, [performSearch]);

  // Clear search history
  const handleClearHistory = useCallback(() => {
    searchService.clearSearchHistory();
    setSearchHistory([]);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="advanced-search-modal-overlay" onClick={onClose}>
      <div className="advanced-search-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="search-modal-header">
          <h2>🔍 Advanced Search</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="search-form">
          <div className="search-input-wrapper">
            <span className="search-icon">🔍</span>
            <input
              ref={searchInputRef}
              type="text"
              className="search-input"
              placeholder="Search messages, conversations, users..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoComplete="off"
            />
            {query && (
              <button
                type="button"
                className="clear-query-btn"
                onClick={() => setQuery('')}
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          <div className="search-actions">
            <button 
              type="submit" 
              className="search-btn primary"
              disabled={!query.trim() || loading}
            >
              {loading ? '⏳ Searching...' : '🔍 Search'}
            </button>
            <button
              type="button"
              className={`filter-toggle-btn ${showFilters ? 'active' : ''}`}
              onClick={() => setShowFilters(!showFilters)}
            >
              🎛️ Filters
            </button>
          </div>
        </form>

        {/* Search Suggestions */}
        {suggestions.length > 0 && !loading && (
          <div className="search-suggestions">
            <div className="suggestions-label">Suggestions:</div>
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                className="suggestion-item"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        {/* Filters Panel */}
        {showFilters && (
          <div className="filters-panel">
            <div className="filters-grid">
              {/* Message Type Filter */}
              <div className="filter-group">
                <label>Message Type</label>
                <select
                  value={filters.messageType || ''}
                  onChange={(e) => handleFilterChange('messageType', e.target.value || null)}
                >
                  <option value="">All Types</option>
                  <option value="text">Text</option>
                  <option value="image">Image</option>
                  <option value="video">Video</option>
                  <option value="file">File</option>
                  <option value="voice">Voice</option>
                </select>
              </div>

              {/* Date From Filter */}
              <div className="filter-group">
                <label>From Date</label>
                <input
                  type="date"
                  value={filters.dateFrom || ''}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value || null)}
                />
              </div>

              {/* Date To Filter */}
              <div className="filter-group">
                <label>To Date</label>
                <input
                  type="date"
                  value={filters.dateTo || ''}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value || null)}
                />
              </div>

              {/* Has Attachments Filter */}
              <div className="filter-group">
                <label>Attachments</label>
                <select
                  value={filters.hasAttachments === null ? '' : filters.hasAttachments.toString()}
                  onChange={(e) => {
                    const value = e.target.value;
                    handleFilterChange('hasAttachments', value === '' ? null : value === 'true');
                  }}
                >
                  <option value="">Any</option>
                  <option value="true">With Attachments</option>
                  <option value="false">Without Attachments</option>
                </select>
              </div>

              {/* Fuzzy Match Toggle */}
              <div className="filter-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={filters.fuzzyMatch}
                    onChange={(e) => handleFilterChange('fuzzyMatch', e.target.checked)}
                  />
                  <span>Enable fuzzy matching (typo tolerance)</span>
                </label>
              </div>

              {/* Search Scope */}
              <div className="filter-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={!!filters.conversationId}
                    onChange={(e) => handleFilterChange('conversationId', e.target.checked ? currentConversationId : null)}
                  />
                  <span>Search only in current conversation</span>
                </label>
              </div>
            </div>

            <div className="filters-actions">
              <button className="apply-filters-btn" onClick={applyFilters}>
                ✅ Apply Filters
              </button>
              <button className="clear-filters-btn" onClick={clearFilters}>
                🧹 Clear Filters
              </button>
            </div>
          </div>
        )}

        {/* Search History */}
        {!query && searchHistory.length > 0 && (
          <div className="search-history">
            <div className="history-header">
              <h3>Recent Searches</h3>
              <button className="clear-history-btn" onClick={handleClearHistory}>
                Clear
              </button>
            </div>
            <div className="history-list">
              {searchHistory.map((item, index) => (
                <div
                  key={index}
                  className="history-item"
                  onClick={() => handleHistoryClick(item)}
                >
                  <span className="history-query">🔍 {item.query}</span>
                  <span className="history-count">{item.resultCount} results</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search Results */}
        <div className="search-results-container">
          {loading && (
            <div className="search-loading">
              <div className="loading-spinner"></div>
              <p>Searching messages...</p>
            </div>
          )}

          {!loading && results.length > 0 && (
            <>
              <div className="results-header">
                <span className="results-count">
                  Found {totalResults} result{totalResults !== 1 ? 's' : ''} for "{query}"
                </span>
                <span className="results-page">
                  Page {currentPage} of {totalPages}
                </span>
              </div>

              <div className="search-results" ref={resultsRef}>
                {results.map((result, index) => (
                  <div
                    key={result.messageId}
                    className={`search-result-item ${index === selectedResultIndex ? 'selected' : ''} ${result.fuzzyMatch ? 'fuzzy-match' : ''}`}
                    onClick={() => handleResultClick(result)}
                  >
                    <div className="result-header">
                      <span className="result-user">{result.userId || 'Unknown User'}</span>
                      <span className="result-timestamp">
                        {new Date(result.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div 
                      className="result-text"
                      dangerouslySetInnerHTML={{ __html: result.highlightedText || result.text }}
                    />
                    {result.fuzzyMatch && (
                      <div className="fuzzy-badge" title={`Matched term: ${result.matchedTerm}`}>
                        ~ Fuzzy Match
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="search-pagination">
                  <button
                    className="page-btn"
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    ← Previous
                  </button>
                  
                  <div className="page-numbers">
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          className={`page-number ${currentPage === pageNum ? 'active' : ''}`}
                          onClick={() => goToPage(pageNum)}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    className="page-btn"
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          )}

          {!loading && query && results.length === 0 && (
            <div className="no-results">
              <div className="no-results-icon">🔍</div>
              <h3>No results found</h3>
              <p>Try different keywords or adjust your filters</p>
            </div>
          )}

          {!loading && !query && results.length === 0 && (
            <div className="search-tips">
              <h3>💡 Search Tips</h3>
              <ul>
                <li>Use specific keywords for better results</li>
                <li>Enable fuzzy matching to find messages with typos</li>
                <li>Use date filters to narrow down your search</li>
                <li>Filter by message type (text, image, video, etc.)</li>
                <li>Use keyboard shortcuts: ↑↓ to navigate, Enter to select, Esc to close</li>
              </ul>
            </div>
          )}
        </div>

        {/* Keyboard Shortcuts Help */}
        <div className="search-shortcuts">
          <span className="shortcut">
            <kbd>↑</kbd> <kbd>↓</kbd> Navigate
          </span>
          <span className="shortcut">
            <kbd>Enter</kbd> Select
          </span>
          <span className="shortcut">
            <kbd>Esc</kbd> Close
          </span>
          <span className="shortcut">
            <kbd>Ctrl</kbd> + <kbd>F</kbd> Search
          </span>
        </div>
      </div>
    </div>
  );
};

export default AdvancedSearchModal;
