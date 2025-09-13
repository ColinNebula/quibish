/**
 * Donation Prompt Component
 * Small, non-intrusive prompt to encourage donations
 */

import React, { useState, useEffect } from 'react';
import donationService from '../../services/donationService';
import './DonationPrompt.css';

const DonationPrompt = ({ 
  userStats = {}, 
  darkMode = false, 
  onOpenDonation, 
  position = 'bottom-right',
  autoShow = true 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [supporterBadge, setSupporterBadge] = useState(null);

  useEffect(() => {
    if (autoShow && !isDismissed) {
      // Check if user should see donation prompt
      const shouldShow = donationService.shouldShowDonationPrompt(userStats);
      if (shouldShow) {
        // Show after a delay to not be intrusive
        const timer = setTimeout(() => {
          setIsVisible(true);
        }, 10000); // Show after 10 seconds of usage

        return () => clearTimeout(timer);
      }
    }

    // Check for supporter badge
    const badge = donationService.getSupporterBadge();
    setSupporterBadge(badge);
  }, [userStats, autoShow, isDismissed]);

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    // Don't show again for this session
    sessionStorage.setItem('donation_prompt_dismissed', 'true');
  };

  const handleDonate = () => {
    setIsVisible(false);
    if (onOpenDonation) {
      onOpenDonation();
    }
  };

  // Don't show if already dismissed this session
  useEffect(() => {
    const dismissed = sessionStorage.getItem('donation_prompt_dismissed');
    if (dismissed) {
      setIsDismissed(true);
    }
  }, []);

  if (isDismissed) {
    // Show supporter badge if user has donated
    return supporterBadge ? (
      <div className={`supporter-badge-display ${position} ${darkMode ? 'dark' : ''}`}>
        <div className="badge-content">
          <span className="badge-icon">{supporterBadge.icon}</span>
          <span className="badge-title">{supporterBadge.title}</span>
        </div>
      </div>
    ) : null;
  }

  if (!isVisible) return null;

  const messageData = donationService.getDonationMessage(userStats);

  return (
    <div className={`donation-prompt ${position} ${darkMode ? 'dark' : ''}`}>
      <div className="prompt-content">
        <div className="prompt-header">
          <div className="prompt-icon">💝</div>
          <div className="prompt-text">
            <div className="prompt-title">Love this free app?</div>
            <div className="prompt-subtitle">Help us keep it free for everyone!</div>
          </div>
          <button className="prompt-close" onClick={handleDismiss}>✕</button>
        </div>
        
        <div className="prompt-actions">
          <button className="donate-now-btn" onClick={handleDonate}>
            💝 Donate
          </button>
          <button className="maybe-later-btn" onClick={handleDismiss}>
            Maybe Later
          </button>
        </div>
      </div>

      <div className="prompt-stats">
        💰 Help us reach our goal of keeping this 100% free!
      </div>
    </div>
  );
};

export default DonationPrompt;