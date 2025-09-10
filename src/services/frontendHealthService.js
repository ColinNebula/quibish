/**
 * Frontend Health Check Service
 * Validates frontend dependencies, API connectivity, and system readiness
 */

class FrontendHealthService {
  constructor() {
    this.checks = new Map();
    this.initialized = false;
    this.startupTime = null;
    this.initializationSteps = [];
  }

  /**
   * Initialize the frontend with comprehensive checks
   */
  async initialize() {
    this.startupTime = Date.now();
    console.log('🚀 Starting frontend initialization...');

    try {
      // Step 1: Environment validation
      await this.validateEnvironment();
      
      // Step 2: Dependencies check
      await this.validateDependencies();
      
      // Step 3: Local storage check
      await this.validateLocalStorage();
      
      // Step 4: API connectivity
      await this.validateAPIConnectivity();
      
      // Step 5: Authentication system
      await this.validateAuthentication();
      
      // Step 6: Essential services
      await this.validateEssentialServices();

      this.initialized = true;
      const initTime = Date.now() - this.startupTime;
      
      console.log(`✅ Frontend initialization completed in ${initTime}ms`);
      console.log('🎯 Application is ready to launch');
      
      return {
        success: true,
        initializationTime: initTime,
        steps: this.initializationSteps
      };

    } catch (error) {
      console.error('❌ Frontend initialization failed:', error.message);
      console.error('📋 Completed steps:', this.initializationSteps.map(s => s.name).join(', '));
      
      return {
        success: false,
        error: error.message,
        initializationTime: Date.now() - this.startupTime,
        steps: this.initializationSteps
      };
    }
  }

  /**
   * Validate browser environment and capabilities
   */
  async validateEnvironment() {
    const stepName = 'Environment Validation';
    console.log(`🌐 ${stepName}...`);
    
    try {
      // Check browser capabilities
      const capabilities = {
        localStorage: typeof Storage !== 'undefined',
        sessionStorage: typeof sessionStorage !== 'undefined',
        fetch: typeof fetch !== 'undefined',
        webRTC: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
        notifications: 'Notification' in window,
        serviceWorker: 'serviceWorker' in navigator,
        webSocket: typeof WebSocket !== 'undefined'
      };

      const missingCapabilities = Object.entries(capabilities)
        .filter(([, supported]) => !supported)
        .map(([name]) => name);

      if (missingCapabilities.length > 0) {
        console.warn('⚠️ Some browser capabilities are missing:', missingCapabilities.join(', '));
      }

      // Check viewport and screen information
      const viewport = {
        width: window.innerWidth,
        height: window.innerHeight,
        pixelRatio: window.devicePixelRatio || 1,
        isMobile: window.innerWidth <= 768
      };

      this.addStep(stepName, 'success', 
        `Browser ready, viewport: ${viewport.width}x${viewport.height}, mobile: ${viewport.isMobile}`);
    } catch (error) {
      this.addStep(stepName, 'failed', error.message);
      throw error;
    }
  }

  /**
   * Validate React and essential dependencies
   */
  async validateDependencies() {
    const stepName = 'Dependencies Check';
    console.log(`📦 ${stepName}...`);
    
    try {
      // Check React
      if (typeof window.React === 'undefined' && typeof require === 'undefined') {
        console.warn('⚠️ React not detected in global scope, but this is normal in production builds');
      }

      // Check essential globals and APIs
      const essentials = {
        'JSON': typeof JSON !== 'undefined',
        'Promise': typeof Promise !== 'undefined',
        'Map': typeof Map !== 'undefined',
        'Set': typeof Set !== 'undefined',
        'Array.from': typeof Array.from === 'function',
        'Object.assign': typeof Object.assign === 'function'
      };

      const missing = Object.entries(essentials)
        .filter(([, available]) => !available)
        .map(([name]) => name);

      if (missing.length > 0) {
        throw new Error(`Missing essential JavaScript features: ${missing.join(', ')}`);
      }

      this.addStep(stepName, 'success', 'All essential dependencies validated');
    } catch (error) {
      this.addStep(stepName, 'failed', error.message);
      throw error;
    }
  }

  /**
   * Validate local storage and session management
   */
  async validateLocalStorage() {
    const stepName = 'Local Storage Check';
    console.log(`💾 ${stepName}...`);
    
    try {
      // Test localStorage
      const testKey = 'healthcheck_test';
      const testValue = 'test_value_' + Date.now();
      
      localStorage.setItem(testKey, testValue);
      const retrieved = localStorage.getItem(testKey);
      localStorage.removeItem(testKey);
      
      if (retrieved !== testValue) {
        throw new Error('localStorage read/write test failed');
      }

      // Test sessionStorage
      sessionStorage.setItem(testKey, testValue);
      const sessionRetrieved = sessionStorage.getItem(testKey);
      sessionStorage.removeItem(testKey);
      
      if (sessionRetrieved !== testValue) {
        throw new Error('sessionStorage read/write test failed');
      }

      // Check for existing user session
      const existingSession = localStorage.getItem('currentUser');
      const hasSession = existingSession !== null;

      this.addStep(stepName, 'success', 
        `Storage validated, existing session: ${hasSession ? 'found' : 'none'}`);
    } catch (error) {
      this.addStep(stepName, 'failed', error.message);
      throw error;
    }
  }

  /**
   * Validate API connectivity and backend health
   */
  async validateAPIConnectivity() {
    const stepName = 'API Connectivity';
    console.log(`🔗 ${stepName}...`);
    
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5001';
      
      // Test basic connectivity with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
      
      const response = await fetch(`${backendUrl}/api/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API health check failed with status: ${response.status}`);
      }

      const healthData = await response.json();
      
      // Check startup status
      try {
        const startupResponse = await fetch(`${backendUrl}/api/startup`);
        if (startupResponse.ok) {
          const startupData = await startupResponse.json();
          if (!startupData.initialized) {
            console.warn('⚠️ Backend is still initializing, some features may be limited');
          }
        }
      } catch (startupError) {
        console.warn('⚠️ Could not check backend startup status:', startupError.message);
      }

      this.addStep(stepName, 'success', 
        `API connected to ${backendUrl}, health: ${healthData.status || 'ok'}`);
    } catch (error) {
      // Don't fail completely on API connectivity issues
      // Only log non-connection errors to reduce console noise
      if (error.name !== 'AbortError' && !error.message.includes('Failed to fetch')) {
        console.warn('⚠️ API connectivity issues detected:', error.message);
      }
      this.addStep(stepName, 'warning', 
        `Backend offline - running in standalone mode`);
    }
  }

  /**
   * Validate authentication system
   */
  async validateAuthentication() {
    const stepName = 'Authentication System';
    console.log(`🔐 ${stepName}...`);
    
    try {
      // Check for stored authentication token
      const token = localStorage.getItem('authToken');
      const currentUser = localStorage.getItem('currentUser');
      
      if (token && currentUser) {
        try {
          // Validate token with backend
          const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5001';
          const response = await fetch(`${backendUrl}/api/auth/verify`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            signal: AbortSignal.timeout ? AbortSignal.timeout(3000) : undefined
          });

          if (response.ok) {
            this.addStep(stepName, 'success', 'User authenticated with valid token');
          } else {
            // Token invalid, clear it
            localStorage.removeItem('authToken');
            localStorage.removeItem('currentUser');
            this.addStep(stepName, 'warning', 'Invalid token cleared, user needs to login');
          }
        } catch (authError) {
          // Network error, keep token for offline use
          this.addStep(stepName, 'warning', 'Cannot verify token (offline), keeping for offline use');
        }
      } else {
        this.addStep(stepName, 'success', 'No existing session, ready for login');
      }
    } catch (error) {
      this.addStep(stepName, 'failed', error.message);
      throw error;
    }
  }

  /**
   * Validate essential services (WebRTC for voice calls, etc.)
   */
  async validateEssentialServices() {
    const stepName = 'Essential Services';
    console.log(`🛠️ ${stepName}...`);
    
    try {
      const services = {
        voiceCalls: false,
        fileUploads: false,
        notifications: false
      };

      // Check WebRTC for voice calls
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          // Don't actually request permission, just check if the API is available
          services.voiceCalls = true;
        } catch (error) {
          console.warn('⚠️ Voice call capabilities limited:', error.message);
        }
      }

      // Check File API for uploads
      if (window.File && window.FileReader && window.FileList && window.Blob) {
        services.fileUploads = true;
      }

      // Check Notification API
      if ('Notification' in window) {
        services.notifications = true;
      }

      const enabledServices = Object.entries(services)
        .filter(([, enabled]) => enabled)
        .map(([name]) => name);

      this.addStep(stepName, 'success', 
        `Services ready: ${enabledServices.join(', ') || 'basic functionality only'}`);
    } catch (error) {
      this.addStep(stepName, 'failed', error.message);
      throw error;
    }
  }

  /**
   * Add a step to the initialization log
   */
  addStep(name, status, message) {
    const step = {
      name,
      status,
      message,
      timestamp: new Date().toISOString(),
      duration: this.startupTime ? Date.now() - this.startupTime : 0
    };
    
    this.initializationSteps.push(step);
    
    const emoji = status === 'success' ? '✅' : status === 'warning' ? '⚠️' : '❌';
    console.log(`  ${emoji} ${name}: ${message}`);
  }

  /**
   * Check if the service is initialized
   */
  isInitialized() {
    return this.initialized;
  }

  /**
   * Get initialization status
   */
  getInitializationStatus() {
    return {
      initialized: this.initialized,
      steps: this.initializationSteps,
      startupTime: this.startupTime,
      totalDuration: this.startupTime ? Date.now() - this.startupTime : 0
    };
  }

  /**
   * Run a quick health check (after initialization)
   */
  async runHealthCheck() {
    if (!this.initialized) {
      throw new Error('Service not initialized. Call initialize() first.');
    }

    const checks = {
      localStorage: false,
      apiConnectivity: false,
      authentication: false
    };

    try {
      // Quick localStorage test
      localStorage.setItem('healthcheck', Date.now().toString());
      localStorage.removeItem('healthcheck');
      checks.localStorage = true;
    } catch (error) {
      console.warn('localStorage health check failed:', error.message);
    }

    try {
      // Quick API ping
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5001';
      const response = await fetch(`${backendUrl}/api/health`, {
        method: 'GET',
        signal: AbortSignal.timeout ? AbortSignal.timeout(2000) : undefined
      });
      checks.apiConnectivity = response.ok;
    } catch (error) {
      console.warn('API health check failed:', error.message);
    }

    try {
      // Check authentication state
      const token = localStorage.getItem('authToken');
      checks.authentication = !!token;
    } catch (error) {
      console.warn('Authentication health check failed:', error.message);
    }

    return {
      timestamp: new Date().toISOString(),
      overall: Object.values(checks).every(check => check) ? 'healthy' : 'degraded',
      checks
    };
  }
}

const frontendHealthService = new FrontendHealthService();
export default frontendHealthService;