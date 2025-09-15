// Mock API service for testing connection features
export class MockAPIService {
  static instance = null;
  
  constructor() {
    this.isOnline = true;
    this.responseDelay = 100;
    this.errorRate = 0.1; // 10% error rate
    this.latency = 50;
  }
  
  static getInstance() {
    if (!MockAPIService.instance) {
      MockAPIService.instance = new MockAPIService();
    }
    return MockAPIService.instance;
  }
  
  // Simulate network conditions
  setNetworkConditions(options) {
    if (options.isOnline !== undefined) this.isOnline = options.isOnline;
    if (options.responseDelay !== undefined) this.responseDelay = options.responseDelay;
    if (options.errorRate !== undefined) this.errorRate = options.errorRate;
    if (options.latency !== undefined) this.latency = options.latency;
  }
  
  // Mock health check endpoint
  async healthCheck() {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (!this.isOnline || Math.random() < this.errorRate) {
          reject(new Error('Network error'));
        } else {
          resolve({
            status: 'ok',
            timestamp: Date.now(),
            latency: this.latency + Math.random() * 50
          });
        }
      }, this.responseDelay + Math.random() * 100);
    });
  }
  
  // Mock message sending
  async sendMessage(message) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (!this.isOnline || Math.random() < this.errorRate) {
          reject(new Error('Failed to send message'));
        } else {
          resolve({
            ...message,
            id: Date.now() + Math.random(),
            status: 'sent',
            serverTimestamp: new Date().toISOString()
          });
        }
      }, this.responseDelay + Math.random() * 200);
    });
  }
  
  // Simulate network quality changes
  simulateNetworkChanges() {
    const conditions = [
      { isOnline: true, responseDelay: 50, errorRate: 0.02, latency: 30 },   // Excellent
      { isOnline: true, responseDelay: 100, errorRate: 0.05, latency: 80 },  // Good
      { isOnline: true, responseDelay: 300, errorRate: 0.15, latency: 200 }, // Fair
      { isOnline: true, responseDelay: 800, errorRate: 0.3, latency: 500 },  // Poor
      { isOnline: false, responseDelay: 0, errorRate: 1, latency: 0 }        // Offline
    ];
    
    let currentIndex = 0;
    
    setInterval(() => {
      if (Math.random() < 0.3) { // 30% chance to change conditions
        currentIndex = (currentIndex + 1) % conditions.length;
        this.setNetworkConditions(conditions[currentIndex]);
        console.log('Network conditions changed:', conditions[currentIndex]);
      }
    }, 10000); // Check every 10 seconds
  }
}

// Setup mock API intercepts
export const setupMockAPI = () => {
  const mockAPI = MockAPIService.getInstance();
  
  // Start simulating network changes
  mockAPI.simulateNetworkChanges();
  
  // Intercept fetch requests to /api/health
  const originalFetch = window.fetch;
  window.fetch = async (url, options) => {
    if (url.includes('/api/health')) {
      try {
        const result = await mockAPI.healthCheck();
        return {
          ok: true,
          status: 200,
          json: async () => result
        };
      } catch (error) {
        return {
          ok: false,
          status: 500,
          statusText: error.message
        };
      }
    }
    
    // For other requests, use original fetch
    return originalFetch(url, options);
  };
  
  return mockAPI;
};

export default MockAPIService;
