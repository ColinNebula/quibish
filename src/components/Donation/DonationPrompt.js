import React, { useState, useEffect } from 'react';
import './DonationPrompt.css';

const DonationPrompt = ({ isVisible, onClose, onOpenDonation, onDismiss }) => {
  const [currentPrompt, setCurrentPrompt] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [timeLeft, setTimeLeft] = useState(10);
  const [isCountingDown, setIsCountingDown] = useState(false);

  const prompts = [
    {
      id: 'support',
      emoji: '❤️',
      title: 'Love Quibish?',
      message: 'Help us keep the app free and add amazing new features!',
      buttonText: 'Support Us',
      color: '#ff6b6b'
    },
    {
      id: 'coffee',
      emoji: '☕',
      title: 'Buy us a coffee?',
      message: 'Your support helps fuel late-night coding sessions and server costs.',
      buttonText: 'Get Coffee',
      color: '#8b4513'
    },
    {
      id: 'growth',
      emoji: '🚀',
      title: 'Help Quibish grow!',
      message: 'Every contribution helps us reach more users and build better features.',
      buttonText: 'Contribute',
      color: '#667eea'
    },
    {
      id: 'community',
      emoji: '🎉',
      title: 'Join our supporters!',
      message: 'Be part of the community that makes Quibish possible for everyone.',
      buttonText: 'Join Community',
      color: '#28a745'
    },
    {
      id: 'future',
      emoji: '🌟',
      title: 'Shape our future!',
      message: 'Your support helps prioritize features and improvements you want to see.',
      buttonText: 'Shape Future',
      color: '#ffc107'
    }
  ];

  // Cycle through prompts
  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentPrompt(prev => (prev + 1) % prompts.length);
        setIsAnimating(false);
      }, 300);
    }, 4000);

    return () => clearInterval(interval);
  }, [isVisible, prompts.length]);

  // Auto-dismiss countdown
  useEffect(() => {
    if (!isVisible || !isCountingDown) return;

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          onDismiss('auto');
          setIsCountingDown(false);
          return 10;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isVisible, isCountingDown, onDismiss]);

  // Handle dismiss
  const handleDismiss = (reason = 'manual') => {
    setIsCountingDown(false);
    setTimeLeft(10);
    onDismiss(reason);
  };

  // Handle later button
  const handleLater = () => {
    setIsCountingDown(true);
  };

  // Handle donate button
  const handleDonate = () => {
    onOpenDonation();
    onClose();
  };

  if (!isVisible) return null;

  const prompt = prompts[currentPrompt];

  return (
    <div className="donation-prompt-overlay">
      <div className="donation-prompt" style={{ '--prompt-color': prompt.color }}>
        <button className="prompt-close" onClick={onClose}>
          ×
        </button>

        <div className={`prompt-content ${isAnimating ? 'animating' : ''}`}>
          <div className="prompt-emoji">{prompt.emoji}</div>
          <h3 className="prompt-title">{prompt.title}</h3>
          <p className="prompt-message">{prompt.message}</p>
        </div>

        <div className="prompt-actions">
          <button 
            className="prompt-btn secondary"
            onClick={isCountingDown ? () => handleDismiss('manual') : handleLater}
          >
            {isCountingDown ? `Dismiss (${timeLeft}s)` : 'Maybe Later'}
          </button>
          <button 
            className="prompt-btn primary"
            onClick={handleDonate}
          >
            {prompt.buttonText}
          </button>
        </div>

        <div className="prompt-indicators">
          {prompts.map((_, index) => (
            <div 
              key={index}
              className={`indicator ${index === currentPrompt ? 'active' : ''}`}
              onClick={() => setCurrentPrompt(index)}
            />
          ))}
        </div>

        <div className="prompt-footer">
          <span className="prompt-note">
            🔒 Secure donation • Cancel anytime
          </span>
        </div>
      </div>
    </div>
  );
};

export default DonationPrompt;