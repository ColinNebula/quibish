import React, { useState, useEffect, useRef, useMemo } from 'react';
import './DynamicSplashScreen.css';

/**
 * Dynamic application splash screen with advanced animations and particles
 * 
 * @component DynamicSplashScreen
 * @param {Object} props - Component props
 * @param {boolean} props.darkMode - Whether dark mode is enabled
 * @param {string} props.appVersion - Current application version
 * @param {Function} props.onComplete - Callback when splash screen completes
 * @returns {JSX.Element} Rendered splash screen
 */
const DynamicSplashScreen = ({ darkMode = false, appVersion = '1.0.0', onComplete }) => {
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('Initializing...');
  const [showLogo, setShowLogo] = useState(false);
  const [showTitle, setShowTitle] = useState(false);
  const [showTagline, setShowTagline] = useState(false);
  const [particles, setParticles] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  // Loading states and messages
  const loadingStates = useMemo(() => [
    { progress: 10, text: 'Initializing QuibiChat...' },
    { progress: 25, text: 'Loading components...' },
    { progress: 40, text: 'Setting up connection...' },
    { progress: 60, text: 'Preparing interface...' },
    { progress: 80, text: 'Almost ready...' },
    { progress: 95, text: 'Finalizing setup...' },
    { progress: 100, text: 'Welcome to QuibiChat!' }
  ], []);

  // Initialize particles
  useEffect(() => {
    const initParticles = () => {
      const newParticles = [];
      for (let i = 0; i < 50; i++) {
        newParticles.push({
          id: i,
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          size: Math.random() * 3 + 1,
          opacity: Math.random() * 0.5 + 0.2,
          hue: Math.random() * 60 + 200 // Blue-ish colors
        });
      }
      setParticles(newParticles);
    };

    initParticles();
  }, []);

  // Animate particles
  useEffect(() => {
    const animateParticles = () => {
      setParticles(prevParticles => 
        prevParticles.map(particle => {
          let newX = particle.x + particle.vx;
          let newY = particle.y + particle.vy;
          
          // Wrap around screen edges
          if (newX < 0) newX = window.innerWidth;
          if (newX > window.innerWidth) newX = 0;
          if (newY < 0) newY = window.innerHeight;
          if (newY > window.innerHeight) newY = 0;
          
          return {
            ...particle,
            x: newX,
            y: newY,
            opacity: Math.max(0.1, Math.min(0.8, particle.opacity + (Math.random() - 0.5) * 0.02))
          };
        })
      );
      
      animationRef.current = requestAnimationFrame(animateParticles);
    };

    animationRef.current = requestAnimationFrame(animateParticles);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Loading progress simulation
  useEffect(() => {
    let currentStateIndex = 0;
    
    const progressInterval = setInterval(() => {
      if (currentStateIndex < loadingStates.length) {
        const currentState = loadingStates[currentStateIndex];
        setLoadingProgress(currentState.progress);
        setLoadingText(currentState.text);
        currentStateIndex++;
      } else {
        clearInterval(progressInterval);
        if (onComplete) {
          setTimeout(onComplete, 1000); // Delay before calling onComplete
        }
      }
    }, 600);

    return () => clearInterval(progressInterval);
  }, [onComplete, loadingStates]);

  // Staggered element animations
  useEffect(() => {
    const timeouts = [
      setTimeout(() => setShowLogo(true), 300),
      setTimeout(() => setShowTitle(true), 900),
      setTimeout(() => setShowTagline(true), 1500)
    ];

    return () => timeouts.forEach(clearTimeout);
  }, []);

  // Geometric shapes for background
  const renderBackgroundShapes = () => {
    const shapes = [];
    for (let i = 0; i < 8; i++) {
      shapes.push(
        <div
          key={i}
          className={`floating-shape shape-${i + 1}`}
          style={{
            '--delay': `${i * 0.5}s`,
            '--duration': `${8 + i * 2}s`
          }}
        />
      );
    }
    return shapes;
  };

  return (
    <div className={`dynamic-splash-screen ${darkMode ? 'dark' : 'light'}`}>
      {/* Animated background gradient */}
      <div className="animated-background"></div>

      {/* Animated background shapes */}
      <div className="background-shapes">
        {renderBackgroundShapes()}
      </div>

      {/* Particle system */}
      <div className="particles-container">
        {particles.map(particle => (
          <div
            key={particle.id}
            className="particle"
            style={{
              left: `${particle.x}px`,
              top: `${particle.y}px`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              opacity: particle.opacity,
              background: `hsl(${particle.hue}, 70%, 60%)`
            }}
          />
        ))}
      </div>

      {/* Main content */}
      <div className="splash-content">
        {/* Animated logo */}
        <div className={`splash-logo ${showLogo ? 'show' : ''}`}>
          <div className="logo-container">
            <svg 
              width="120" 
              height="120" 
              viewBox="0 0 24 24" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
              className="splash-logo-svg"
            >
              <defs>
                <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#4f46e5" />
                  <stop offset="50%" stopColor="#7c3aed" />
                  <stop offset="100%" stopColor="#0ea5e9" />
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge> 
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              <path 
                d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM20 16H5.17L4.58 16.59L4 17.17V4H20V16Z" 
                fill="url(#logoGradient)"
                filter="url(#glow)"
                className="logo-path-1"
              />
              <path 
                d="M12 15L16 11L12 7L10.59 8.41L13.17 11L10.59 13.59L12 15Z" 
                fill="url(#logoGradient)"
                filter="url(#glow)"
                className="logo-path-2"
              />
              <path 
                d="M6 11H9V13H6V11Z" 
                fill="url(#logoGradient)"
                filter="url(#glow)"
                className="logo-path-3"
              />
            </svg>
            
            {/* Rotating rings around logo */}
            <div className="logo-ring ring-1"></div>
            <div className="logo-ring ring-2"></div>
            <div className="logo-ring ring-3"></div>
          </div>
        </div>

        {/* Animated title */}
        <h1 className={`splash-title ${showTitle ? 'show' : ''}`}>
          <span className="title-letter" style={{'--delay': '0.1s'}}>Q</span>
          <span className="title-letter" style={{'--delay': '0.2s'}}>u</span>
          <span className="title-letter" style={{'--delay': '0.3s'}}>i</span>
          <span className="title-letter" style={{'--delay': '0.4s'}}>b</span>
          <span className="title-letter" style={{'--delay': '0.5s'}}>i</span>
          <span className="title-letter" style={{'--delay': '0.6s'}}>C</span>
          <span className="title-letter" style={{'--delay': '0.7s'}}>h</span>
          <span className="title-letter" style={{'--delay': '0.8s'}}>a</span>
          <span className="title-letter" style={{'--delay': '0.9s'}}>t</span>
        </h1>

        {/* Animated tagline */}
        <div className={`splash-tagline ${showTagline ? 'show' : ''}`}>
          <span className="tagline-word" style={{'--delay': '0.1s'}}>Professional</span>
          <span className="tagline-word" style={{'--delay': '0.3s'}}>Communication</span>
          <span className="tagline-word" style={{'--delay': '0.5s'}}>Platform</span>
        </div>
        
        {/* Dynamic loading indicator */}
        <div className="loading-section">
          {/* Progress bar */}
          <div className="progress-container">
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ width: `${loadingProgress}%` }}
              />
              <div className="progress-glow" style={{ left: `${loadingProgress}%` }} />
            </div>
            <div className="progress-text">{loadingProgress}%</div>
          </div>

          {/* Loading text */}
          <div className="loading-text">{loadingText}</div>

          {/* Pulse indicator */}
          <div className="pulse-indicator">
            <div className="pulse-dot">
              <div className="pulse-ring"></div>
              <div className="pulse-ring"></div>
              <div className="pulse-ring"></div>
            </div>
          </div>
        </div>

        {/* Version with enhanced styling */}
        <div className="splash-version">
          <span className="version-label">Version</span>
          <span className="version-number">v{appVersion}</span>
        </div>
      </div>

      {/* Corner decorations */}
      <div className="corner-decoration top-left"></div>
      <div className="corner-decoration top-right"></div>
      <div className="corner-decoration bottom-left"></div>
      <div className="corner-decoration bottom-right"></div>

      {/* Loading dots animation */}
      <div className="loading-dots-corner">
        <div className="dot"></div>
        <div className="dot"></div>
        <div className="dot"></div>
      </div>
    </div>
  );
};

export default DynamicSplashScreen;
