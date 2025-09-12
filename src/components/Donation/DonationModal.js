/**
 * Donation Modal Component
 * Encourages users to support the free app with donations
 */

import React, { useState, useEffect } from 'react';
import donationService from '../../services/donationService';
import './DonationModal.css';

const DonationModal = ({ isOpen, onClose, userStats = {}, darkMode = false, trigger = 'manual' }) => {
  const [selectedAmount, setSelectedAmount] = useState(5);
  const [customAmount, setCustomAmount] = useState('');
  const [donationMessage, setDonationMessage] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const [donationResult, setDonationResult] = useState(null);
  const [donationStats, setDonationStats] = useState(null);

  // Load donation stats and messaging
  useEffect(() => {
    if (isOpen) {
      const stats = donationService.getDonationStats();
      setDonationStats(stats);
    }
  }, [isOpen]);

  const donationAmounts = donationService.getDonationAmounts();
  const messageData = donationService.getDonationMessage(userStats);

  const handleAmountSelect = (amount) => {
    setSelectedAmount(amount);
    setCustomAmount('');
  };

  const handleCustomAmountChange = (e) => {
    const value = e.target.value.replace(/[^0-9.]/g, '');
    setCustomAmount(value);
    if (value) {
      setSelectedAmount(parseFloat(value));
    }
  };

  const handleDonate = async () => {
    const amount = customAmount ? parseFloat(customAmount) : selectedAmount;
    
    if (!amount || amount < 1) {
      alert('Please enter a valid donation amount ($1 minimum)');
      return;
    }

    setIsProcessing(true);

    try {
      const result = await donationService.processDonation(amount, donationMessage, paymentMethod);
      setDonationResult(result);
      
      if (result.success) {
        setShowThankYou(true);
        // Auto close after showing thank you
        setTimeout(() => {
          onClose();
          setShowThankYou(false);
          setDonationResult(null);
        }, 5000);
      }
    } catch (error) {
      console.error('Donation error:', error);
      setDonationResult({
        success: false,
        message: 'Something went wrong. Please try again.'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    if (!isProcessing) {
      onClose();
      // Reset state
      setTimeout(() => {
        setShowThankYou(false);
        setDonationResult(null);
        setSelectedAmount(5);
        setCustomAmount('');
        setDonationMessage('');
      }, 300);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`donation-modal-overlay ${darkMode ? 'dark' : ''}`}>
      <div className="donation-modal">
        {showThankYou && donationResult?.success ? (
          /* Thank You Screen */
          <div className="donation-thank-you">
            <div className="thank-you-header">
              <div className="thank-you-icon">🙏</div>
              <h2>{donationService.getThankYouMessage(selectedAmount).title}</h2>
              <p>{donationService.getThankYouMessage(selectedAmount).message}</p>
            </div>
            
            <div className="donation-receipt">
              <div className="receipt-item">
                <span>Donation Amount:</span>
                <span className="amount">${selectedAmount}</span>
              </div>
              <div className="receipt-item">
                <span>Transaction ID:</span>
                <span className="transaction-id">{donationResult.donation?.transactionId}</span>
              </div>
              <div className="receipt-item">
                <span>Date:</span>
                <span>{new Date().toLocaleDateString()}</span>
              </div>
            </div>

            <div className="supporter-badge">
              <div className="badge-icon">{donationService.getThankYouMessage(selectedAmount).badge === 'champion' ? '🏆' : 
                                          donationService.getThankYouMessage(selectedAmount).badge === 'super' ? '🌟' : 
                                          donationService.getThankYouMessage(selectedAmount).badge === 'premium' ? '💎' : 
                                          donationService.getThankYouMessage(selectedAmount).badge === 'growth' ? '🚀' : 
                                          donationService.getThankYouMessage(selectedAmount).badge === 'development' ? '🍕' : '☕'}</div>
              <p>You're now a <strong>{donationService.getThankYouMessage(selectedAmount).title}</strong>!</p>
            </div>

            <button className="close-thank-you-btn" onClick={handleClose}>
              Continue Using App
            </button>
          </div>
        ) : (
          /* Donation Form */
          <>
            {/* Header */}
            <div className="donation-header">
              <div>
                <h2>{messageData.title}</h2>
                <p className="donation-subtitle">{messageData.subtitle}</p>
              </div>
              <button className="close-btn" onClick={handleClose} disabled={isProcessing}>
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="donation-content">
              {/* Impact Statement */}
              <div className="impact-statement">
                <div className="impact-item">
                  <span className="impact-icon">📞</span>
                  <div>
                    <strong>Free Calling</strong>
                    <p>Keep international calling free for everyone</p>
                  </div>
                </div>
                <div className="impact-item">
                  <span className="impact-icon">🚀</span>
                  <div>
                    <strong>New Features</strong>
                    <p>Fund development of exciting new capabilities</p>
                  </div>
                </div>
                <div className="impact-item">
                  <span className="impact-icon">🌍</span>
                  <div>
                    <strong>Global Reach</strong>
                    <p>Help us serve users worldwide</p>
                  </div>
                </div>
              </div>

              {/* Donation Amounts */}
              <div className="donation-amounts">
                <h3>Choose an amount:</h3>
                <div className="amount-grid">
                  {donationAmounts.map((option) => (
                    <button
                      key={option.amount}
                      className={`amount-btn ${selectedAmount === option.amount && !customAmount ? 'selected' : ''} ${option.popular ? 'popular' : ''}`}
                      onClick={() => handleAmountSelect(option.amount)}
                      disabled={isProcessing}
                    >
                      {option.popular && <span className="popular-badge">Most Popular</span>}
                      <span className="amount-label">{option.label}</span>
                      <span className="amount-description">{option.description}</span>
                    </button>
                  ))}
                </div>

                {/* Custom Amount */}
                <div className="custom-amount">
                  <label>Or enter a custom amount:</label>
                  <div className="custom-input-group">
                    <span className="currency-symbol">$</span>
                    <input
                      type="text"
                      placeholder="0.00"
                      value={customAmount}
                      onChange={handleCustomAmountChange}
                      disabled={isProcessing}
                      className="custom-amount-input"
                    />
                  </div>
                </div>
              </div>

              {/* Optional Message */}
              <div className="donation-message">
                <label>Leave a message (optional):</label>
                <textarea
                  placeholder="Thanks for creating this amazing free app!"
                  value={donationMessage}
                  onChange={(e) => setDonationMessage(e.target.value)}
                  disabled={isProcessing}
                  maxLength={200}
                />
                <div className="character-count">{donationMessage.length}/200</div>
              </div>

              {/* Payment Method */}
              <div className="payment-method">
                <label>Payment method:</label>
                <div className="payment-options">
                  <button
                    className={`payment-btn ${paymentMethod === 'card' ? 'selected' : ''}`}
                    onClick={() => setPaymentMethod('card')}
                    disabled={isProcessing}
                  >
                    💳 Credit Card
                  </button>
                  <button
                    className={`payment-btn ${paymentMethod === 'paypal' ? 'selected' : ''}`}
                    onClick={() => setPaymentMethod('paypal')}
                    disabled={isProcessing}
                  >
                    🅿️ PayPal
                  </button>
                </div>
              </div>

              {/* Error Display */}
              {donationResult && !donationResult.success && (
                <div className="donation-error">
                  <span className="error-icon">⚠️</span>
                  <span>{donationResult.message}</span>
                </div>
              )}

              {/* Donation Button */}
              <div className="donation-actions">
                <button
                  className="donate-btn"
                  onClick={handleDonate}
                  disabled={isProcessing || (!selectedAmount && !customAmount)}
                >
                  {isProcessing ? (
                    <>
                      <span className="loading-spinner"></span>
                      Processing...
                    </>
                  ) : (
                    <>💝 Donate ${customAmount || selectedAmount}</>
                  )}
                </button>
                
                <p className="donation-note">
                  🔒 Secure payment • 💝 100% goes to app development • 🙏 Thank you!
                </p>
              </div>

              {/* Stats (if available) */}
              {donationStats && (
                <div className="donation-stats">
                  <p className="stats-text">
                    💰 Community has donated <strong>${donationStats.yearly}</strong> this year
                    {donationStats.donationCount > 0 && (
                      <> • 🎉 <strong>{donationStats.donationCount}</strong> supporters</>
                    )}
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DonationModal;