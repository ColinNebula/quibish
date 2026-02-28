import React, { useState, useEffect, useCallback } from 'react';
import './InstallPrompt.css';

const SNOOZE_KEY  = 'quibish-install-snoozed';
const SNOOZE_DAYS = 3;

const isSnoozed = () => {
  try {
    const ts = localStorage.getItem(SNOOZE_KEY);
    if (!ts) return false;
    return Date.now() - Number(ts) < SNOOZE_DAYS * 24 * 60 * 60 * 1000;
  } catch { return false; }
};

const snooze = () => {
  try { localStorage.setItem(SNOOZE_KEY, String(Date.now())); } catch {}
};

const isStandalone =
  window.matchMedia('(display-mode: standalone)').matches ||
  window.navigator.standalone === true;

const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent) && !window.MSStream;

const FEATURES = [
  { icon: '⚡', label: 'Instant load' },
  { icon: '📡', label: 'Works offline' },
  { icon: '🔔', label: 'Notifications' },
  { icon: '📱', label: 'App feel'       },
];

const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible]               = useState(false);
  const [installing, setInstalling]         = useState(false);

  useEffect(() => {
    if (isStandalone || isSnoozed()) return;

    if (isIOS) {
      // Show iOS instructions after a short delay
      const t = setTimeout(() => setVisible(true), 6000);
      return () => clearTimeout(t);
    }

    const handleBip = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      const t = setTimeout(() => setVisible(true), 4000);
      return () => clearTimeout(t);
    };
    window.addEventListener('beforeinstallprompt', handleBip);
    return () => window.removeEventListener('beforeinstallprompt', handleBip);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setInstalling(false);
    if (outcome === 'accepted') {
      setVisible(false);
    }
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    snooze();
    setVisible(false);
    setDeferredPrompt(null);
  }, []);

  if (!visible) return null;

  return (
    <div className="ipr-overlay" onClick={handleDismiss}>
      <div className="ipr-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Install Quibish">
        <div className="ipr-handle" />
        <button className="ipr-close" onClick={handleDismiss} aria-label="Close">✕</button>

        <div className="ipr-hero">
          <div className="ipr-app-icon">
            <img src="/quibish/logo192.png" alt="Quibish" width="56" height="56" />
          </div>
          <div className="ipr-hero-text">
            <h2 className="ipr-title">Install Quibish</h2>
            <p  className="ipr-subtitle">Fast, offline-ready social experience</p>
          </div>
        </div>

        <div className="ipr-features">
          {FEATURES.map(({ icon, label }) => (
            <div key={label} className="ipr-feature-card">
              <span className="ipr-feature-icon" aria-hidden="true">{icon}</span>
              <span className="ipr-feature-label">{label}</span>
            </div>
          ))}
        </div>

        {isIOS ? (
          <div className="ipr-ios-steps">
            <p className="ipr-ios-intro">Add to your Home Screen in 3 steps:</p>
            <div className="ipr-step">
              <span className="ipr-step-num">1</span>
              <span>Tap the <strong>Share</strong> button <span className="ipr-share-badge">⬆️</span> in Safari's toolbar</span>
            </div>
            <div className="ipr-step">
              <span className="ipr-step-num">2</span>
              <span>Scroll down and tap <strong>Add to Home Screen</strong></span>
            </div>
            <div className="ipr-step">
              <span className="ipr-step-num">3</span>
              <span>Tap <strong>Add</strong> in the top-right corner</span>
            </div>
          </div>
        ) : (
          <>
            <button
              className="ipr-btn-install"
              onClick={handleInstall}
              disabled={installing}
            >
              {installing ? 'Installing…' : '📥  Install app — it\'s free'}
            </button>
            <button className="ipr-btn-later" onClick={handleDismiss}>
              Not now
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default InstallPrompt;