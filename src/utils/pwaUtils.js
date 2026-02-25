// pwaUtils.js - PWA utility functions for service worker and shortcuts

class PWAUtils {
  constructor() {
    this.isSupported = 'serviceWorker' in navigator;
    this.shortcuts = new Map();
    this.initialize();
  }

  initialize() {
    if (!this.isSupported) {
      console.warn('PWA: Service Workers not supported in this browser');
      return;
    }

    // Register service worker if available
    this.registerServiceWorker();
    
    // Initialize shortcuts
    this.initializeShortcuts();
    
    // Handle app install
    this.handleAppInstall();
  }

  async registerServiceWorker() {
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.register(`${process.env.PUBLIC_URL}/sw.js`, { scope: `${process.env.PUBLIC_URL}/` });
        console.log('PWA: Service Worker registered successfully:', registration.scope);
        
        // Handle updates
        registration.addEventListener('updatefound', () => {
          console.log('PWA: Service Worker update found');
        });
      }
    } catch (error) {
      console.error('PWA: Service Worker registration failed:', error);
    }
  }

  initializeShortcuts() {
    // Register available shortcuts
    this.shortcuts.set('voice-call', {
      name: 'Voice Call',
      shortName: 'Call',
      description: 'Start a voice call',
      url: '/?action=voice-call',
      icons: [{ src: '/icons/voice-call-96x96.png', sizes: '96x96' }]
    });

    this.shortcuts.set('video-call', {
      name: 'Video Call',
      shortName: 'Video',
      description: 'Start a video call',
      url: '/?action=video-call',
      icons: [{ src: '/icons/video-call-96x96.png', sizes: '96x96' }]
    });

    this.shortcuts.set('new-message', {
      name: 'New Message',
      shortName: 'Message',
      description: 'Compose a new message',
      url: '/?action=new-message',
      icons: [{ src: '/icons/message-96x96.png', sizes: '96x96' }]
    });
  }

  handleAppInstall() {
    let deferredPrompt;

    window.addEventListener('beforeinstallprompt', (event) => {
      console.log('PWA: Install prompt available');
      event.preventDefault();
      deferredPrompt = event;
      
      // Show custom install button if needed
      this.showInstallButton(deferredPrompt);
    });

    window.addEventListener('appinstalled', (event) => {
      console.log('PWA: App installed successfully');
      deferredPrompt = null;
    });
  }

  showInstallButton(deferredPrompt) {
    // Create install button if it doesn't exist
    if (!document.getElementById('pwa-install-button')) {
      const installButton = document.createElement('button');
      installButton.id = 'pwa-install-button';
      installButton.textContent = 'Install App';
      installButton.className = 'pwa-install-btn';
      
      installButton.addEventListener('click', async () => {
        if (deferredPrompt) {
          deferredPrompt.prompt();
          const result = await deferredPrompt.userChoice;
          console.log('PWA: Install prompt result:', result);
          deferredPrompt = null;
          installButton.style.display = 'none';
        }
      });

      // Add to header or appropriate location (with DOM ready check)
      const addToDOM = () => {
        const header = document.querySelector('header') || document.body;
        if (header) {
          header.appendChild(installButton);
        }
      };
      
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', addToDOM);
      } else {
        addToDOM();
      }
    }
  }

  triggerShortcut(shortcutId, options = {}) {
    const shortcut = this.shortcuts.get(shortcutId);
    
    if (!shortcut) {
      console.warn(`PWA: Unknown shortcut: ${shortcutId}`);
      return false;
    }

    console.log(`PWA: Triggering shortcut: ${shortcut.name}`, options);

    // Dispatch custom event for the app to handle
    const event = new CustomEvent(`pwa-shortcut-${shortcutId}`, {
      detail: { shortcut, options }
    });
    
    window.dispatchEvent(event);
    return true;
  }

  // Share API support
  async share(data) {
    if (!navigator.share) {
      console.warn('PWA: Web Share API not supported');
      return this.fallbackShare(data);
    }

    try {
      await navigator.share(data);
      console.log('PWA: Content shared successfully');
      return true;
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('PWA: Share cancelled by user');
      } else {
        console.error('PWA: Share failed:', error);
      }
      return false;
    }
  }

  fallbackShare(data) {
    // Fallback sharing methods
    if (navigator.clipboard && data.text) {
      navigator.clipboard.writeText(data.text);
      console.log('PWA: Content copied to clipboard');
      return true;
    }
    
    // Create temporary sharing element
    const shareUrl = data.url || window.location.href;
    const shareText = data.text || data.title || 'Check this out!';
    
    const tempInput = document.createElement('input');
    tempInput.value = `${shareText} ${shareUrl}`;
    document.body.appendChild(tempInput);
    tempInput.select();
    document.execCommand('copy');
    document.body.removeChild(tempInput);
    
    console.log('PWA: Content copied to clipboard (fallback)');
    return true;
  }

  // Notification support
  async requestNotificationPermission() {
    if (!('Notification' in window)) {
      console.warn('PWA: Notifications not supported');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      console.warn('PWA: Notification permission denied');
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  async showNotification(title, options = {}) {
    const hasPermission = await this.requestNotificationPermission();
    
    if (!hasPermission) {
      console.warn('PWA: Cannot show notification - permission denied');
      return false;
    }

    const defaultOptions = {
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      tag: 'quibish-notification',
      requireInteraction: false,
      silent: false
    };

    const notificationOptions = { ...defaultOptions, ...options };

    try {
      const notification = new Notification(title, notificationOptions);
      
      notification.onclick = () => {
        window.focus();
        notification.close();
        
        if (options.onClick) {
          options.onClick();
        }
      };

      return notification;
    } catch (error) {
      console.error('PWA: Failed to show notification:', error);
      return false;
    }
  }

  // Check if app is running in standalone mode
  isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone ||
           document.referrer.includes('android-app://');
  }

  // Get app capabilities
  getCapabilities() {
    return {
      serviceWorker: 'serviceWorker' in navigator,
      notifications: 'Notification' in window,
      share: 'share' in navigator,
      clipboard: 'clipboard' in navigator,
      geolocation: 'geolocation' in navigator,
      camera: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
      standalone: this.isStandalone(),
      online: navigator.onLine
    };
  }

  // Handle offline/online status
  setupNetworkHandling() {
    window.addEventListener('online', () => {
      console.log('PWA: Back online');
      document.body.classList.remove('offline');
      document.body.classList.add('online');
    });

    window.addEventListener('offline', () => {
      console.log('PWA: Gone offline');
      document.body.classList.remove('online');
      document.body.classList.add('offline');
    });

    // Set initial state
    if (navigator.onLine) {
      document.body.classList.add('online');
    } else {
      document.body.classList.add('offline');
    }
  }
}

// Create and export singleton instance
const pwaUtils = new PWAUtils();

export default pwaUtils;