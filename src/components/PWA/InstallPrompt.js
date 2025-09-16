import React, { useState, useEffect } from 'react';
import './InstallPrompt.css';

const InstallPrompt = () => {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;

    installPrompt.prompt();
    const result = await installPrompt.userChoice;
    
    if (result.outcome === 'accepted') {
      console.log('PWA install accepted');
    }
    
    setInstallPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setInstallPrompt(null);
  };

  if (!showPrompt || !installPrompt) {
    return null;
  }

  return (
    <div className="install-prompt">
      <div className="install-prompt-content">
        <div className="install-icon">📱</div>
        <div className="install-text">
          <h3>Install Quibish</h3>
          <p>Add to your home screen for a better experience</p>
        </div>
        <div className="install-actions">
          <button onClick={handleInstall} className="install-btn">
            Install
          </button>
          <button onClick={handleDismiss} className="dismiss-btn">
            ✕
          </button>
        </div>
      </div>
    </div>
  );
};

export default InstallPrompt;