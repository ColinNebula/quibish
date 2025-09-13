/**
 * PWA Shortcuts and Deep Linking Service
 * Handles app shortcuts, share targets, and deep linking for enhanced smartphone integration
 */

class PWAShortcutService {
  constructor() {
    this.shortcuts = {
      'new-chat': this.handleNewChat.bind(this),
      'voice-call': this.handleVoiceCall.bind(this),
      'video-call': this.handleVideoCall.bind(this),
      'share-file': this.handleShareFile.bind(this),
      'share': this.handleShareTarget.bind(this)
    };
    
    this.init();
  }

  init() {
    // Handle URL parameters for shortcuts and deep links
    this.handleUrlParameters();
    
    // Listen for navigation events
    window.addEventListener('popstate', () => {
      this.handleUrlParameters();
    });
    
    // Handle file sharing from other apps
    this.setupFileHandling();
    
    // Handle share target
    this.setupShareTarget();
    
    console.log('✅ PWA Shortcut Service initialized');
  }

  handleUrlParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action');
    
    if (action && this.shortcuts[action]) {
      console.log(`🚀 Handling PWA shortcut: ${action}`);
      this.shortcuts[action](urlParams);
    }
  }

  // Handle "New Chat" shortcut
  handleNewChat(urlParams) {
    // Trigger new chat creation
    this.dispatchCustomEvent('pwa-new-chat', {
      source: 'shortcut',
      timestamp: Date.now()
    });
  }

  // Handle "Voice Call" shortcut
  handleVoiceCall(urlParams) {
    const contact = urlParams.get('contact');
    
    this.dispatchCustomEvent('pwa-voice-call', {
      source: 'shortcut',
      contact: contact,
      timestamp: Date.now()
    });
  }

  // Handle "Video Call" shortcut
  handleVideoCall(urlParams) {
    const contact = urlParams.get('contact');
    
    this.dispatchCustomEvent('pwa-video-call', {
      source: 'shortcut',
      contact: contact,
      timestamp: Date.now()
    });
  }

  // Handle "Share File" shortcut
  handleShareFile(urlParams) {
    this.dispatchCustomEvent('pwa-share-file', {
      source: 'shortcut',
      timestamp: Date.now()
    });
  }

  // Handle share target from other apps
  async handleShareTarget(urlParams) {
    try {
      // Extract shared data
      const title = urlParams.get('title') || '';
      const text = urlParams.get('text') || '';
      const url = urlParams.get('url') || '';
      
      // Handle file sharing
      if (urlParams.get('file')) {
        const fileData = urlParams.get('file');
        this.handleSharedFiles([fileData]);
        return;
      }
      
      // Handle text/URL sharing
      const sharedData = {
        title,
        text,
        url,
        source: 'share-target',
        timestamp: Date.now()
      };
      
      this.dispatchCustomEvent('pwa-share-received', sharedData);
      
      console.log('📤 Received shared content:', sharedData);
    } catch (error) {
      console.error('❌ Failed to handle share target:', error);
    }
  }

  // Setup file handling for PWA file handlers
  setupFileHandling() {
    // Listen for file drops and opens
    window.addEventListener('DOMContentLoaded', () => {
      if ('launchQueue' in window) {
        window.launchQueue.setConsumer((launchParams) => {
          if (launchParams.files && launchParams.files.length) {
            this.handleSharedFiles(launchParams.files);
          }
        });
      }
    });
  }

  // Setup share target handling
  setupShareTarget() {
    // Handle POST requests from share target
    if (window.location.pathname === '/' && window.location.search.includes('action=share')) {
      // Parse form data if this was a POST request
      this.handleShareTarget(new URLSearchParams(window.location.search));
    }
  }

  // Handle shared files
  async handleSharedFiles(files) {
    try {
      const processedFiles = [];
      
      for (const file of files) {
        if (file instanceof File) {
          processedFiles.push({
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: file.lastModified,
            file: file
          });
        } else if (window.FileSystemFileHandle && file instanceof window.FileSystemFileHandle) {
          const fileData = await file.getFile();
          processedFiles.push({
            name: fileData.name,
            size: fileData.size,
            type: fileData.type,
            lastModified: fileData.lastModified,
            file: fileData,
            handle: file
          });
        }
      }
      
      this.dispatchCustomEvent('pwa-files-shared', {
        files: processedFiles,
        source: 'file-handler',
        timestamp: Date.now()
      });
      
      console.log('📁 Received shared files:', processedFiles);
    } catch (error) {
      console.error('❌ Failed to handle shared files:', error);
    }
  }

  // Dispatch custom events for the app to handle
  dispatchCustomEvent(eventName, data) {
    const event = new CustomEvent(eventName, {
      detail: data,
      bubbles: true,
      cancelable: true
    });
    
    window.dispatchEvent(event);
  }

  // Add dynamic shortcut (for frequent contacts)
  addDynamicShortcut(id, name, url, iconUrl) {
    if ('shortcuts' in navigator) {
      navigator.shortcuts.add({
        id: id,
        name: name,
        shortName: name.substring(0, 10),
        description: `Quick access to ${name}`,
        url: url,
        icons: [
          {
            src: iconUrl || '/logo192.png',
            sizes: '192x192',
            type: 'image/png'
          }
        ]
      }).then(() => {
        console.log(`✅ Added dynamic shortcut: ${name}`);
      }).catch((error) => {
        console.error('❌ Failed to add dynamic shortcut:', error);
      });
    }
  }

  // Update app shortcuts based on user behavior
  updateShortcuts(frequentContacts) {
    if (!Array.isArray(frequentContacts) || !('shortcuts' in navigator)) {
      return;
    }
    
    try {
      // Clear existing dynamic shortcuts
      navigator.shortcuts.clear();
      
      // Add shortcuts for frequent contacts
      frequentContacts.slice(0, 4).forEach((contact, index) => {
        this.addDynamicShortcut(
          `contact-${contact.id}`,
          `Chat with ${contact.name}`,
          `/?action=new-chat&contact=${contact.id}`,
          contact.avatar
        );
      });
    } catch (error) {
      console.error('❌ Failed to update shortcuts:', error);
    }
  }

  // Handle protocol URLs (web+quibish://)
  handleProtocolUrl(url) {
    try {
      const protocolUrl = new URL(url);
      const action = protocolUrl.searchParams.get('action');
      const data = Object.fromEntries(protocolUrl.searchParams);
      
      this.dispatchCustomEvent('pwa-protocol-handled', {
        action,
        data,
        source: 'protocol',
        timestamp: Date.now()
      });
      
      console.log('🔗 Handled protocol URL:', { action, data });
    } catch (error) {
      console.error('❌ Failed to handle protocol URL:', error);
    }
  }

  // Install app prompt handling
  async promptInstall() {
    if (window.deferredPrompt) {
      try {
        window.deferredPrompt.prompt();
        const { outcome } = await window.deferredPrompt.userChoice;
        
        console.log(`📱 PWA install prompt outcome: ${outcome}`);
        
        if (outcome === 'accepted') {
          this.dispatchCustomEvent('pwa-installed', {
            source: 'prompt',
            timestamp: Date.now()
          });
        }
        
        window.deferredPrompt = null;
        return outcome === 'accepted';
      } catch (error) {
        console.error('❌ Failed to prompt install:', error);
        return false;
      }
    }
    
    return false;
  }

  // Check if app is installable
  isInstallable() {
    return !!window.deferredPrompt;
  }

  // Check if app is installed
  isInstalled() {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone === true;
  }

  // Get app capabilities
  getCapabilities() {
    return {
      serviceWorker: 'serviceWorker' in navigator,
      pushNotifications: 'PushManager' in window,
      fileSystemAccess: 'showOpenFilePicker' in window,
      shareTarget: 'share' in navigator,
      shortcuts: 'shortcuts' in navigator,
      protocolHandlers: 'registerProtocolHandler' in navigator,
      badging: 'setAppBadge' in navigator,
      webShare: 'share' in navigator,
      contactPicker: 'contacts' in navigator,
      installed: this.isInstalled(),
      installable: this.isInstallable()
    };
  }
}

// Create global instance
const pwaShortcutService = new PWAShortcutService();

// Export utility functions
export const pwaUtils = {
  // Handle app shortcuts programmatically
  triggerShortcut: (action, params = {}) => {
    const url = new URL(window.location.origin);
    url.searchParams.set('action', action);
    
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
    
    window.history.pushState({}, '', url.toString());
    pwaShortcutService.handleUrlParameters();
  },
  
  // Share content using Web Share API
  shareContent: async (data) => {
    if ('share' in navigator) {
      try {
        await navigator.share(data);
        return true;
      } catch (error) {
        console.error('❌ Failed to share:', error);
        return false;
      }
    }
    return false;
  },
  
  // Add app badge
  setBadge: (count) => {
    if ('setAppBadge' in navigator) {
      navigator.setAppBadge(count).catch(console.error);
    }
  },
  
  // Clear app badge
  clearBadge: () => {
    if ('clearAppBadge' in navigator) {
      navigator.clearAppBadge().catch(console.error);
    }
  }
};

export default pwaShortcutService;