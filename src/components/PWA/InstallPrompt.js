import React, { useState, useEffect } from 'react';
import './InstallPrompt.css';

const InstallPrompt = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [capabilities, setCapabilities] = useState({});

  useEffect(() => {
    // Check if already installed
    const checkInstalled = () => {
      const installed = window.matchMedia('(display-mode: standalone)').matches ||
                       window.navigator.standalone === true;
      setIsInstalled(installed);
      return installed;
    };

    // Get PWA capabilities
    const getCapabilities = () => {
      return {
        serviceWorker: 'serviceWorker' in navigator,
        pushNotifications: 'PushManager' in window,
        fileSystemAccess: 'showOpenFilePicker' in window,
        shareTarget: 'share' in navigator,
        shortcuts: 'shortcuts' in navigator,
        badging: 'setAppBadge' in navigator,
        webShare: 'share' in navigator,
        contactPicker: 'contacts' in navigator
      };
    };

    setCapabilities(getCapabilities());

    if (checkInstalled()) {
      return;
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Show prompt after a delay (don't be too aggressive)
      setTimeout(() => {
        const hasSeenPrompt = localStorage.getItem('quibish-install-prompt-shown');
        const lastShown = localStorage.getItem('quibish-install-prompt-last-shown');
        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
        
        if (!hasSeenPrompt || (lastShown && parseInt(lastShown) < oneDayAgo)) {
          setShowPrompt(true);
        }
      }, 5000);
    };

    // Listen for successful installation
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
      localStorage.setItem('quibish-installed', 'true');
      console.log('📱 Quibish PWA was installed');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      localStorage.setItem('quibish-install-prompt-shown', 'true');
      localStorage.setItem('quibish-install-prompt-last-shown', Date.now().toString());
      
      if (outcome === 'accepted') {
        console.log('📱 User accepted the install prompt');
        setShowPrompt(false);
      } else {
        console.log('📱 User dismissed the install prompt');
        setShowPrompt(false);
      }
      
      setDeferredPrompt(null);
    } catch (error) {
      console.error('❌ Failed to install PWA:', error);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('quibish-install-prompt-shown', 'true');
    localStorage.setItem('quibish-install-prompt-last-shown', Date.now().toString());
  };

  const handleNotNow = () => {
    setShowPrompt(false);
    // Don't mark as permanently shown, allow showing again later
    localStorage.setItem('quibish-install-prompt-last-shown', Date.now().toString());
  };

  if (isInstalled || !showPrompt || !deferredPrompt) {
    return null;
  }

  return (
    <div className="install-prompt-overlay">
      <div className="install-prompt">
        <div className="install-prompt-header">
          <div className="install-prompt-icon">
            <img src="/logo192.png" alt="Quibish" className="install-app-icon" />
          </div>
          <button 
            className="install-prompt-close" 
            onClick={handleDismiss}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        
        <div className="install-prompt-content">
          <h3>Install Quibish</h3>
          <p>Get the full experience with our app! Install Quibish for:</p>
          
          <div className="install-features">
            <div className="install-feature">
              <span className="install-feature-icon">🚀</span>
              <span>Faster loading and better performance</span>
            </div>
            <div className="install-feature">
              <span className="install-feature-icon">📱</span>
              <span>Easy access from your home screen</span>
            </div>
            <div className="install-feature">
              <span className="install-feature-icon">🔔</span>
              <span>Push notifications for new messages</span>
            </div>
            <div className="install-feature">
              <span className="install-feature-icon">📂</span>
              <span>Share files directly to Quibish</span>
            </div>
            {capabilities.shortcuts && (
              <div className="install-feature">
                <span className="install-feature-icon">⚡</span>
                <span>Quick actions and shortcuts</span>
              </div>
            )}
            <div className="install-feature">
              <span className="install-feature-icon">💫</span>
              <span>Works offline with your cached chats</span>
            </div>
          </div>
        </div>
        
        <div className="install-prompt-actions">
          <button 
            className="install-btn-secondary" 
            onClick={handleNotNow}
          >
            Not Now
          </button>
          <button 
            className="install-btn-primary" 
            onClick={handleInstall}
          >
            Install App
          </button>
        </div>
        
        <div className="install-prompt-footer">
          <small>Free • No ads • Secure</small>
        </div>
      </div>
    </div>
  );
};

export default InstallPrompt;