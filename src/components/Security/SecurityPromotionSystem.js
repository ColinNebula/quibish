import React, { useState, useEffect } from 'react';
import SecurityDashboard from './SecurityDashboard';
import TwoFactorPromotionBanner from './TwoFactorPromotionBanner';
import LoginSecurityPrompt from './LoginSecurityPrompt';
import TwoFactorSetup from '../TwoFactorAuth/TwoFactorSetup';

/**
 * Example integration component showing how to use the 2FA promotion system
 */
const SecurityPromotionSystem = ({ user, onUserUpdate }) => {
  const [showSecurityDashboard, setShowSecurityDashboard] = useState(false);
  const [showTwoFactorSetup, setShowTwoFactorSetup] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  // Show login prompt after successful login (you would trigger this from your login flow)
  useEffect(() => {
    const hasJustLoggedIn = sessionStorage.getItem('just-logged-in');
    if (hasJustLoggedIn) {
      sessionStorage.removeItem('just-logged-in');
      setShowLoginPrompt(true);
    }
  }, []);

  const handleEnable2FA = () => {
    setShowTwoFactorSetup(true);
    setShowSecurityDashboard(false);
    setShowLoginPrompt(false);
  };

  const handle2FASetupComplete = () => {
    setShowTwoFactorSetup(false);
    // Refresh user data to reflect 2FA status
    if (onUserUpdate) {
      onUserUpdate();
    }
  };

  return (
    <>
      {/* Banner that appears at the top of pages for users without 2FA */}
      <TwoFactorPromotionBanner
        onEnable2FA={handleEnable2FA}
        onDismiss={(duration) => {
          console.log(`2FA banner dismissed for ${duration}`);
        }}
      />

      {/* Login prompt that appears after successful login */}
      {showLoginPrompt && (
        <LoginSecurityPrompt
          onEnable2FA={handleEnable2FA}
          onDismiss={() => setShowLoginPrompt(false)}
          onClose={() => setShowLoginPrompt(false)}
        />
      )}

      {/* Security dashboard - can be opened from settings or profile */}
      {showSecurityDashboard && (
        <SecurityDashboard
          onEnable2FA={handleEnable2FA}
          onClose={() => setShowSecurityDashboard(false)}
        />
      )}

      {/* 2FA Setup Modal */}
      {showTwoFactorSetup && (
        <TwoFactorSetup
          onClose={() => setShowTwoFactorSetup(false)}
          onSetupComplete={handle2FASetupComplete}
        />
      )}

      {/* Example buttons to trigger different components */}
      <div style={{ padding: '20px', position: 'fixed', bottom: '20px', right: '20px', background: 'white', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <h4>Security Demo Controls</h4>
        <button onClick={() => setShowSecurityDashboard(true)}>
          Open Security Dashboard
        </button>
        <br />
        <button onClick={() => setShowLoginPrompt(true)} style={{ marginTop: '8px' }}>
          Show Login Prompt
        </button>
        <br />
        <button onClick={handleEnable2FA} style={{ marginTop: '8px' }}>
          Enable 2FA
        </button>
      </div>
    </>
  );
};

export default SecurityPromotionSystem;