// Advanced Search Service with Full-Text Indexing
import persistentStorageService from './persistentStorageService';

class SearchService {
  constructor() {
    this.searchHistory = [];
    this.searchIndex = new Map(); // In-memory search index
    this.maxHistoryItems = 50;
    this.loadSearchHistory();
  }

  // Initialize or get IndexedDB for search index
  async initIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('QuibishSearchDB', 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create object stores if they don't exist
        if (!db.objectStoreNames.contains('searchIndex')) {
          const indexStore = db.createObjectStore('searchIndex', { keyPath: 'term' });
          indexStore.createIndex('term', 'term', { unique: true });
        }
        
        if (!db.objectStoreNames.contains('searchHistory')) {
          const historyStore = db.createObjectStore('searchHistory', { keyPath: 'id', autoIncrement: true });
          historyStore.createIndex('timestamp', 'timestamp', { unique: false });
          historyStore.createIndex('query', 'query', { unique: false });
        }
      };
    });
  }

  // Build search index from messages
  async buildSearchIndex(messages) {
    console.log('🔍 Building search index from', messages.length, 'messages...');
    
    this.searchIndex.clear();
    
    for (const message of messages) {
      if (!message.text) continue;
      
      // Tokenize message text
      const tokens = this.tokenize(message.text);
      
      for (const token of tokens) {
        if (!this.searchIndex.has(token)) {
          this.searchIndex.set(token, []);
        }
        this.searchIndex.get(token).push({
          messageId: message.id,
          conversationId: message.conversationId,
          userId: message.userId,
          timestamp: message.timestamp,
          text: message.text,
          type: message.type || 'text'
        });
      }
    }
    
    // Save to IndexedDB for persistence
    try {
      const db = await this.initIndexedDB();
      const transaction = db.transaction(['searchIndex'], 'readwrite');
      const store = transaction.objectStore('searchIndex');
      
      // Clear old index
      store.clear();
      
      // Add new index entries
      for (const [term, results] of this.searchIndex.entries()) {
        store.add({ term, results });
      }
      
      console.log('✅ Search index built with', this.searchIndex.size, 'unique terms');
    } catch (error) {
      console.error('❌ Failed to save search index to IndexedDB:', error);
    }
  }

  // Tokenize text into searchable terms
  tokenize(text) {
    if (!text) return [];
    
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Remove punctuation
      .split(/\s+/) // Split on whitespace
      .filter(token => token.length >= 2) // Minimum 2 characters
      .filter(token => !this.isStopWord(token)); // Remove stop words
  }

  // Check if word is a common stop word
  isStopWord(word) {
    const stopWords = new Set([
      'the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but',
      'in', 'with', 'to', 'for', 'of', 'as', 'by', 'that', 'this', 'it'
    ]);
    return stopWords.has(word);
  }

  // Fuzzy match for typo tolerance
  calculateLevenshteinDistance(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  // Find similar terms for fuzzy matching
  findSimilarTerms(query, maxDistance = 2) {
    const similarTerms = [];
    
    for (const term of this.searchIndex.keys()) {
      const distance = this.calculateLevenshteinDistance(query, term);
      if (distance <= maxDistance) {
        similarTerms.push({ term, distance });
      }
    }
    
    return similarTerms.sort((a, b) => a.distance - b.distance);
  }

  // Advanced search with filters
  async search(query, filters = {}) {
    const {
      conversationId = null,
      userId = null,
      messageType = null,
      dateFrom = null,
      dateTo = null,
      hasAttachments = null,
      fuzzyMatch = true,
      limit = 100,
      offset = 0
    } = filters;

    console.log('🔍 Searching for:', query, 'with filters:', filters);

    // If index is empty, build it first
    if (this.searchIndex.size === 0) {
      const messages = persistentStorageService.getMessages();
      await this.buildSearchIndex(messages);
    }

    const queryTokens = this.tokenize(query);
    let results = [];

    // Search for exact matches
    for (const token of queryTokens) {
      if (this.searchIndex.has(token)) {
        results.push(...this.searchIndex.get(token));
      }

      // Fuzzy matching for typos
      if (fuzzyMatch) {
        const similarTerms = this.findSimilarTerms(token, 2);
        for (const { term } of similarTerms) {
          if (this.searchIndex.has(term)) {
            const fuzzyResults = this.searchIndex.get(term).map(r => ({
              ...r,
              fuzzyMatch: true,
              matchedTerm: term
            }));
            results.push(...fuzzyResults);
          }
        }
      }
    }

    // Remove duplicates based on messageId
    const uniqueResults = Array.from(
      new Map(results.map(item => [item.messageId, item])).values()
    );

    // Apply filters
    let filteredResults = uniqueResults;

    if (conversationId) {
      filteredResults = filteredResults.filter(r => r.conversationId === conversationId);
    }

    if (userId) {
      filteredResults = filteredResults.filter(r => r.userId === userId);
    }

    if (messageType) {
      filteredResults = filteredResults.filter(r => r.type === messageType);
    }

    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      filteredResults = filteredResults.filter(r => new Date(r.timestamp) >= fromDate);
    }

    if (dateTo) {
      const toDate = new Date(dateTo);
      filteredResults = filteredResults.filter(r => new Date(r.timestamp) <= toDate);
    }

    if (hasAttachments !== null) {
      filteredResults = filteredResults.filter(r => {
        const hasAttachment = r.attachments && r.attachments.length > 0;
        return hasAttachments ? hasAttachment : !hasAttachment;
      });
    }

    // Sort by relevance (number of matching tokens) and recency
    filteredResults.sort((a, b) => {
      // Sort by timestamp (most recent first)
      return new Date(b.timestamp) - new Date(a.timestamp);
    });

    // Add search to history
    if (query.trim().length > 0) {
      this.addToSearchHistory({
        query,
        filters,
        resultCount: filteredResults.length,
        timestamp: new Date().toISOString()
      });
    }

    // Apply pagination
    const paginatedResults = filteredResults.slice(offset, offset + limit);

    return {
      success: true,
      results: paginatedResults,
      total: filteredResults.length,
      query,
      filters,
      page: Math.floor(offset / limit) + 1,
      totalPages: Math.ceil(filteredResults.length / limit),
      hasMore: offset + limit < filteredResults.length
    };
  }

  // Search messages with highlighting
  async searchWithHighlights(query, filters = {}) {
    const searchResult = await this.search(query, filters);
    
    // Add highlights to results
    const queryTokens = this.tokenize(query);
    searchResult.results = searchResult.results.map(result => ({
      ...result,
      highlightedText: this.highlightText(result.text, queryTokens)
    }));

    return searchResult;
  }

  // Highlight matching terms in text
  highlightText(text, terms) {
    let highlightedText = text;
    
    for (const term of terms) {
      const regex = new RegExp(`\\b(${term})\\b`, 'gi');
      highlightedText = highlightedText.replace(regex, '<mark>$1</mark>');
    }
    
    return highlightedText;
  }

  // Get search suggestions based on partial query
  async getSearchSuggestions(partialQuery, limit = 10) {
    const suggestions = new Set();
    const lowerQuery = partialQuery.toLowerCase();

    // Get suggestions from search index
    for (const term of this.searchIndex.keys()) {
      if (term.startsWith(lowerQuery)) {
        suggestions.add(term);
        if (suggestions.size >= limit) break;
      }
    }

    // Get suggestions from search history
    const historySuggestions = this.searchHistory
      .filter(h => h.query.toLowerCase().includes(lowerQuery))
      .slice(0, limit - suggestions.size)
      .map(h => h.query);

    historySuggestions.forEach(s => suggestions.add(s));

    return Array.from(suggestions).slice(0, limit);
  }

  // Load search history from storage
  loadSearchHistory() {
    try {
      const stored = localStorage.getItem('quibish_search_history');
      if (stored) {
        this.searchHistory = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load search history:', error);
      this.searchHistory = [];
    }
  }

  // Save search history to storage
  saveSearchHistory() {
    try {
      localStorage.setItem('quibish_search_history', JSON.stringify(this.searchHistory));
    } catch (error) {
      console.error('Failed to save search history:', error);
    }
  }

  // Add to search history
  addToSearchHistory(searchData) {
    // Remove duplicates
    this.searchHistory = this.searchHistory.filter(h => h.query !== searchData.query);
    
    // Add to beginning
    this.searchHistory.unshift(searchData);
    
    // Limit history size
    if (this.searchHistory.length > this.maxHistoryItems) {
      this.searchHistory = this.searchHistory.slice(0, this.maxHistoryItems);
    }
    
    this.saveSearchHistory();
  }

  // Get search history
  getSearchHistory(limit = 10) {
    return this.searchHistory.slice(0, limit);
  }

  // Clear search history
  clearSearchHistory() {
    this.searchHistory = [];
    this.saveSearchHistory();
  }

  // Update search index when new message is added
  async indexMessage(message) {
    if (!message.text) return;

    const tokens = this.tokenize(message.text);
    
    for (const token of tokens) {
      if (!this.searchIndex.has(token)) {
        this.searchIndex.set(token, []);
      }
      
      this.searchIndex.get(token).push({
        messageId: message.id,
        conversationId: message.conversationId,
        userId: message.userId,
        timestamp: message.timestamp,
        text: message.text,
        type: message.type || 'text'
      });
    }
  }

  // Remove message from search index
  async removeFromIndex(messageId) {
    for (const [term, results] of this.searchIndex.entries()) {
      const filtered = results.filter(r => r.messageId !== messageId);
      if (filtered.length === 0) {
        this.searchIndex.delete(term);
      } else {
        this.searchIndex.set(term, filtered);
      }
    }
  }

  // Get search statistics
  getSearchStats() {
    return {
      indexedTerms: this.searchIndex.size,
      totalMessages: Array.from(this.searchIndex.values()).reduce((sum, arr) => sum + arr.length, 0),
      historyCount: this.searchHistory.length,
      lastSearched: this.searchHistory.length > 0 ? this.searchHistory[0].timestamp : null
    };
  }

  // Clear search index
  clearSearchIndex() {
    this.searchIndex.clear();
    console.log('🧹 Search index cleared');
  }
}

// Export singleton instance
export const searchService = new SearchService();
export default searchService;
