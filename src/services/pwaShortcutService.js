// PWA Shortcut Service
class PWAShortcutService {
  constructor() {
    this.shortcuts = [];
    this.isInitialized = false;
  }

  init() {
    if (this.isInitialized) return;
    
    try {
      // Register PWA shortcuts if supported
      if ('serviceWorker' in navigator && 'shortcuts' in navigator) {
        this.registerShortcuts();
      }
      
      this.isInitialized = true;
    } catch (error) {
      console.warn('PWA Shortcuts not supported:', error);
    }
  }

  registerShortcuts() {
    const shortcuts = [
      {
        name: 'New Chat',
        short_name: 'Chat',
        description: 'Start a new conversation',
        url: '/?action=new-chat',
        icons: [{ src: '/logo192.png', sizes: '192x192' }]
      },
      {
        name: 'Profile',
        short_name: 'Profile',
        description: 'View your profile',
        url: '/?action=profile',
        icons: [{ src: '/logo192.png', sizes: '192x192' }]
      }
    ];
    
    this.shortcuts = shortcuts;
  }

  getShortcuts() {
    return this.shortcuts;
  }
}

// PWA Utils
export const pwaUtils = {
  isInstalled() {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone === true ||
           document.referrer.includes('android-app://');
  },

  canInstall() {
    return 'beforeinstallprompt' in window;
  },

  getDisplayMode() {
    if (this.isInstalled()) return 'standalone';
    return 'browser';
  }
};

export default new PWAShortcutService();