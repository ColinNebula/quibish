import React, { useState, useEffect } from 'react';
import './DynamicSplashScreen.css';

const DynamicSplashScreen = ({ isVisible, onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('Initializing...');

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
    <div className="dynamic-splash-screen">
      <div className="splash-content">
        <div className="splash-logo">
          <h1>Quibish</h1>
        </div>
        <div className="splash-progress">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="loading-text">{loadingText}</p>
        </div>
      </div>
    </div>
  );
};

export default DynamicSplashScreen;