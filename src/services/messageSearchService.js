/**
 * Ultra-fast Message Search Service
 * Uses WebAssembly for blazing-fast search across thousands of messages
 */

class MessageSearchService {
  constructor() {
    this.module = null;
    this.searchEngine = null;
    this.isReady = false;
    this.indexed = false;
  }

  async initialize() {
    if (this.isReady) return;

    try {
      const createModule = await import('/wasm/message_search.js');
      this.module = await createModule.default();
      this.searchEngine = new this.module.MessageSearchEngine();
      this.isReady = true;
      console.log('✅ Message Search engine loaded');
    } catch (error) {
      console.warn('⚠️ Search engine unavailable, using fallback:', error);
    }
  }

  /**
   * Index messages for searching
   */
  async indexMessages(messages) {
    if (!this.isReady) await this.initialize();
    if (!this.searchEngine) return;

    try {
      // Clear previous index
      this.searchEngine.clear();

      // Index all messages
      messages.forEach(msg => {
        this.searchEngine.indexMessage(
          msg.id,
          msg.text || '',
          msg.user?.name || msg.sender || 'Unknown',
          msg.timestamp || new Date().toISOString()
        );
      });

      this.indexed = true;
      console.log(`📇 Indexed ${messages.length} messages`);
    } catch (error) {
      console.error('Indexing error:', error);
    }
  }

  /**
   * Fast exact search
   */
  async search(query) {
    if (!this.isReady) await this.initialize();
    if (!this.searchEngine || !this.indexed) return [];

    const startTime = performance.now();
    
    try {
      const resultIds = this.searchEngine.search(query);
      const duration = performance.now() - startTime;
      
      console.log(`🔍 Search completed in ${duration.toFixed(2)}ms (${resultIds.length} results)`);
      
      return resultIds;
    } catch (error) {
      console.error('Search error:', error);
      return [];
    }
  }

  /**
   * Fuzzy search with typo tolerance
   */
  async fuzzySearch(query, maxDistance = 2) {
    if (!this.isReady) await this.initialize();
    if (!this.searchEngine || !this.indexed) return [];

    const startTime = performance.now();
    
    try {
      const resultIds = this.searchEngine.fuzzySearch(query, maxDistance);
      const duration = performance.now() - startTime;
      
      console.log(`🔍 Fuzzy search completed in ${duration.toFixed(2)}ms (${resultIds.length} results)`);
      
      return resultIds;
    } catch (error) {
      console.error('Fuzzy search error:', error);
      return [];
    }
  }

  /**
   * Pattern search with wildcards
   * Use * for any characters, ? for single character
   */
  async patternSearch(pattern) {
    if (!this.isReady) await this.initialize();
    if (!this.searchEngine || !this.indexed) return [];

    try {
      return this.searchEngine.patternSearch(pattern);
    } catch (error) {
      console.error('Pattern search error:', error);
      return [];
    }
  }

  /**
   * Search by sender name
   */
  async searchBySender(sender) {
    if (!this.isReady) await this.initialize();
    if (!this.searchEngine || !this.indexed) return [];

    try {
      return this.searchEngine.searchBySender(sender);
    } catch (error) {
      console.error('Sender search error:', error);
      return [];
    }
  }

  /**
   * Multi-field search (text + sender)
   */
  async multiFieldSearch(query) {
    if (!this.isReady) await this.initialize();
    if (!this.searchEngine || !this.indexed) return [];

    try {
      return this.searchEngine.multiFieldSearch(query);
    } catch (error) {
      console.error('Multi-field search error:', error);
      return [];
    }
  }

  /**
   * Get search statistics
   */
  getStats() {
    if (!this.searchEngine) return { indexed: 0 };

    return {
      indexed: this.searchEngine.getMessageCount(),
      ready: this.isReady
    };
  }
}

export default new MessageSearchService();
