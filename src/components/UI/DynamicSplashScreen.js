import React, { useState, useEffect } from 'react';
import './DynamicSplashScreen.css';

const DynamicSplashScreen = ({ isVisible = true, darkMode = false, appVersion = "1.0.0", onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('Initializing...');
  const [particles, setParticles] = useState([]);

  // Generate random particles
  useEffect(() => {
    const particleCount = 20;
    const newParticles = Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: Math.random() * 4 + 2,
      duration: Math.random() * 3 + 2,
      delay: Math.random() * 2
    }));
    setParticles(newParticles);
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    const loadingSteps = [
      { progress: 20, text: 'Loading components...' },
      { progress: 40, text: 'Connecting to services...' },
      { progress: 60, text: 'Preparing interface...' },
      { progress: 80, text: 'Finalizing setup...' },
      { progress: 100, text: 'Ready!' }
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < loadingSteps.length) {
        setProgress(loadingSteps[currentStep].progress);
        setLoadingText(loadingSteps[currentStep].text);
        currentStep++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          onComplete && onComplete();
        }, 500);
      }
    }, 300);

    return () => clearInterval(interval);
  }, [isVisible, onComplete]);

  if (!isVisible) return null;

  return (
    <div className={`dynamic-splash-screen ${darkMode ? 'dark-mode' : ''}`}>
      {/* Animated background particles */}
      <div className="splash-particles">
        {particles.map(particle => (
          <div
            key={particle.id}
            className="particle"
            style={{
              left: `${particle.left}%`,
              top: `${particle.top}%`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              animationDuration: `${particle.duration}s`,
              animationDelay: `${particle.delay}s`
            }}
          />
        ))}
      </div>

      {/* Animated ripple circles */}
      <div className="splash-ripples">
        <div className="ripple ripple-1"></div>
        <div className="ripple ripple-2"></div>
        <div className="ripple ripple-3"></div>
      </div>

      {/* Floating geometric shapes */}
      <div className="floating-shapes">
        <div className="shape shape-circle"></div>
        <div className="shape shape-triangle"></div>
        <div className="shape shape-square"></div>
      </div>

      <div className="splash-content">
        <div className="splash-logo">
          <div className="logo-wrapper">
            <div className="logo-glow"></div>
            <h1 className="logo-text">
              <span className="letter" style={{ animationDelay: '0s' }}>Q</span>
              <span className="letter" style={{ animationDelay: '0.1s' }}>u</span>
              <span className="letter" style={{ animationDelay: '0.2s' }}>i</span>
              <span className="letter" style={{ animationDelay: '0.3s' }}>b</span>
              <span className="letter" style={{ animationDelay: '0.4s' }}>i</span>
              <span className="letter" style={{ animationDelay: '0.5s' }}>s</span>
              <span className="letter" style={{ animationDelay: '0.6s' }}>h</span>
            </h1>
          </div>
          <p className="version">v{appVersion}</p>
          <div className="tagline">Connect. Chat. Create.</div>
        </div>
        <div className="splash-progress">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progress}%` }}
            >
              <div className="progress-shimmer"></div>
            </div>
          </div>
          <p className="loading-text">
            <span className="loading-icon">⚡</span>
            {loadingText}
          </p>
          <div className="loading-dots">
            <span className="dot"></span>
            <span className="dot"></span>
            <span className="dot"></span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DynamicSplashScreen;