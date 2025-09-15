/**
 * PayPal Return Handler Component
 * Handles users returning from PayPal donation flow
 */

import React, { useEffect, useState } from 'react';
import donationService from '../../services/donationService';

const PayPalReturnHandler = () => {
  const [confirmationStatus, setConfirmationStatus] = useState(null);

  useEffect(() => {
    // Check URL parameters for PayPal return
    const urlParams = new URLSearchParams(window.location.search);
    const paymentId = urlParams.get('paymentId');
    const donationId = urlParams.get('donationId');
    const payerId = urlParams.get('PayerID');
    
    if (paymentId && donationId) {
      // Confirm the PayPal donation
      const result = donationService.confirmPayPalDonation(donationId);
      setConfirmationStatus(result);
      
      if (result.success) {
        // Show success message and clean up URL
        setTimeout(() => {
          window.history.replaceState({}, document.title, window.location.pathname);
        }, 3000);
      }
    }
  }, []);

  if (!confirmationStatus) {
    return null; // Don't show anything if not a PayPal return
  }

  return (
    <div className="paypal-return-notification">
      {confirmationStatus.success ? (
        <div className="success-notification">
          <span className="success-icon">✅</span>
          <span>{confirmationStatus.message}</span>
        </div>
      ) : (
        <div className="error-notification">
          <span className="error-icon">❌</span>
          <span>{confirmationStatus.message}</span>
        </div>
      )}
    </div>
  );
};

export default PayPalReturnHandler;