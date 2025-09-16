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

  updateShortcuts(frequentContacts = []) {
    try {
      // Update shortcuts with frequent contacts
      const dynamicShortcuts = frequentContacts.slice(0, 3).map((contact, index) => ({
        name: `Chat with ${contact.name}`,
        short_name: contact.name,
        description: `Start conversation with ${contact.name}`,
        url: `/?action=chat&contact=${contact.id}`,
        icons: [{ src: contact.avatar || '/logo192.png', sizes: '192x192' }]
      }));

      this.shortcuts = [
        ...this.shortcuts.slice(0, 2), // Keep first 2 default shortcuts
        ...dynamicShortcuts
      ];

      console.log('🔗 PWA shortcuts updated with frequent contacts');
    } catch (error) {
      console.warn('Failed to update PWA shortcuts:', error);
    }
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