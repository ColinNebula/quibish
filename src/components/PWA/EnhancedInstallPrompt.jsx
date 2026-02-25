import React, { useState, useEffect } from 'react';
import './EnhancedInstallPrompt.css';

const EnhancedInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed
    const standalone = window.matchMedia('(display-mode: standalone)').matches 
      || window.navigator.standalone 
      || document.referrer.includes('android-app://');
    
    setIsStandalone(standalone);

    // Check if iOS
    const iOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Don't show if already installed
    if (standalone) return;

    // Listen for beforeinstallprompt event
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Show prompt after a delay
      setTimeout(() => {
        const dismissed = localStorage.getItem('pwa-prompt-dismissed');
        if (!dismissed) {
          setShowPrompt(true);
        }
      }, 5000); // Wait 5 seconds before showing
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Show iOS instructions if on iOS and not installed
    if (iOS && !standalone) {
      setTimeout(() => {
        const dismissed = localStorage.getItem('pwa-ios-dismissed');
        if (!dismissed) {
          setShowPrompt(true);
        }
      }, 5000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('✅ PWA installed');
    } else {
      console.log('❌ PWA installation declined');
    }

    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    if (isIOS) {
      localStorage.setItem('pwa-ios-dismissed', 'true');
    } else {
      localStorage.setItem('pwa-prompt-dismissed', 'true');
    }
  };

  if (!showPrompt || isStandalone) return null;

  return (
    <div className="install-prompt-overlay">
      <div className="install-prompt">
        <button className="install-close" onClick={handleDismiss}>✕</button>
        
        <div className="install-icon">
          <img src="/quibish/logo192.png" alt="Quibish" />
        </div>

        <h3>Install Quibish</h3>
        <p>Get the app experience with offline support and faster loading!</p>

        {isIOS ? (
          <div className="ios-instructions">
            <div className="instruction-step">
              <div className="step-number">1</div>
              <p>Tap the <strong>Share</strong> button 
                <span className="ios-icon">□↑</span>
              </p>
            </div>
            <div className="instruction-step">
              <div className="step-number">2</div>
              <p>Scroll down and tap <strong>"Add to Home Screen"</strong> 
                <span className="ios-icon">⊕</span>
              </p>
            </div>
            <div className="instruction-step">
              <div className="step-number">3</div>
              <p>Tap <strong>Add</strong> to install</p>
            </div>
          </div>
        ) : (
          <div className="install-actions">
            <button className="btn-install" onClick={handleInstallClick}>
              <span>📥</span> Install App
            </button>
            <button className="btn-later" onClick={handleDismiss}>
              Maybe Later
            </button>
          </div>
        )}

        <div className="install-features">
          <div className="feature">
            <span className="feature-icon">⚡</span>
            <span>Lightning Fast</span>
          </div>
          <div className="feature">
            <span className="feature-icon">📱</span>
            <span>Native Feel</span>
          </div>
          <div className="feature">
            <span className="feature-icon">🔒</span>
            <span>Offline Ready</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedInstallPrompt;
