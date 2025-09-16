import React, { useState } from 'react';
import './DonationModal.css';

const DonationModal = ({ isOpen, onClose, onDonate }) => {
  const [selectedAmount, setSelectedAmount] = useState(null);
  const [customAmount, setCustomAmount] = useState('');
  const [donationType, setDonationType] = useState('one-time'); // 'one-time' or 'monthly'
  const [selectedMethod, setSelectedMethod] = useState('card');
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    anonymous: false
  });

  const predefinedAmounts = [
    { value: 5, label: '$5', description: 'Coffee for the dev team' },
    { value: 10, label: '$10', description: 'Support server costs' },
    { value: 25, label: '$25', description: 'Help with development' },
    { value: 50, label: '$50', description: 'Sponsor new features' },
    { value: 100, label: '$100', description: 'Major contribution' },
    { value: 250, label: '$250', description: 'VIP supporter' }
  ];

  const paymentMethods = [
    { id: 'card', name: 'Credit/Debit Card', icon: '💳', popular: true },
    { id: 'paypal', name: 'PayPal', icon: '🌐', popular: true },
    { id: 'applepay', name: 'Apple Pay', icon: '🍏', popular: false },
    { id: 'googlepay', name: 'Google Pay', icon: '🌈', popular: false },
    { id: 'crypto', name: 'Cryptocurrency', icon: '₿', popular: false }
  ];

  // Get current amount (custom or selected)
  const getCurrentAmount = () => {
    if (customAmount && !isNaN(parseFloat(customAmount))) {
      return parseFloat(customAmount);
    }
    return selectedAmount;
  };

  // Handle amount selection
  const handleAmountSelect = (amount) => {
    setSelectedAmount(amount);
    setCustomAmount('');
  };

  // Handle custom amount change
  const handleCustomAmountChange = (value) => {
    setCustomAmount(value);
    setSelectedAmount(null);
  };

  // Validate donation amount
  const isValidAmount = () => {
    const amount = getCurrentAmount();
    return amount && amount >= 1 && amount <= 10000;
  };

  // Handle form input changes
  const handleFormChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Validate payment form
  const isFormValid = () => {
    const { email, name, cardNumber, expiryDate, cvv } = formData;
    
    if (selectedMethod === 'card') {
      return email && name && cardNumber && expiryDate && cvv;
    }
    
    return email && name;
  };

  // Process donation
  const handleDonateClick = () => {
    if (!isValidAmount()) {
      alert('Please select a valid donation amount');
      return;
    }
    
    setShowPaymentForm(true);
  };

  // Submit donation
  const handleSubmitDonation = () => {
    if (!isFormValid()) {
      alert('Please fill in all required fields');
      return;
    }

    const donationData = {
      amount: getCurrentAmount(),
      type: donationType,
      method: selectedMethod,
      email: formData.email,
      name: formData.anonymous ? 'Anonymous' : formData.name,
      anonymous: formData.anonymous,
      timestamp: new Date().toISOString()
    };

    // In a real app, this would process the payment
    console.log('Processing donation:', donationData);
    
    if (onDonate) {
      onDonate(donationData);
    }

    // Show success and close
    alert(`Thank you for your ${donationType} donation of $${getCurrentAmount()}!`);
    onClose();
    resetForm();
  };

  // Reset form
  const resetForm = () => {
    setSelectedAmount(null);
    setCustomAmount('');
    setDonationType('one-time');
    setSelectedMethod('card');
    setShowPaymentForm(false);
    setFormData({
      email: '',
      name: '',
      cardNumber: '',
      expiryDate: '',
      cvv: '',
      anonymous: false
    });
  };

  // Handle overlay click
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Go back to amount selection
  const handleBackToAmount = () => {
    setShowPaymentForm(false);
  };

  if (!isOpen) return null;

  return (
    <div className="donation-overlay" onClick={handleOverlayClick}>
      <div className="donation-modal">
        <div className="donation-header">
          <h3>💖 Support Quibish</h3>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        {!showPaymentForm ? (
          <>
            <div className="donation-content">
              <div className="donation-intro">
                <p>
                  Your support helps us keep Quibish free and continuously improve 
                  your communication experience. Every contribution matters!
                </p>
              </div>

              {/* Donation Type Toggle */}
              <div className="donation-type">
                <div className="type-toggle">
                  <button 
                    className={`type-btn ${donationType === 'one-time' ? 'active' : ''}`}
                    onClick={() => setDonationType('one-time')}
                  >
                    One-time
                  </button>
                  <button 
                    className={`type-btn ${donationType === 'monthly' ? 'active' : ''}`}
                    onClick={() => setDonationType('monthly')}
                  >
                    Monthly
                  </button>
                </div>
              </div>

              {/* Amount Selection */}
              <div className="amount-selection">
                <h4>Choose Amount</h4>
                <div className="amount-grid">
                  {predefinedAmounts.map((amount) => (
                    <button
                      key={amount.value}
                      className={`amount-btn ${
                        selectedAmount === amount.value ? 'selected' : ''
                      }`}
                      onClick={() => handleAmountSelect(amount.value)}
                    >
                      <span className="amount-label">{amount.label}</span>
                      <span className="amount-desc">{amount.description}</span>
                    </button>
                  ))}
                </div>

                <div className="custom-amount">
                  <label>Or enter custom amount:</label>
                  <div className="custom-input">
                    <span className="currency">$</span>
                    <input
                      type="number"
                      min="1"
                      max="10000"
                      step="0.01"
                      placeholder="0.00"
                      value={customAmount}
                      onChange={(e) => handleCustomAmountChange(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="payment-methods">
                <h4>Payment Method</h4>
                <div className="methods-grid">
                  {paymentMethods.map((method) => (
                    <button
                      key={method.id}
                      className={`method-btn ${
                        selectedMethod === method.id ? 'selected' : ''
                      } ${method.popular ? 'popular' : ''}`}
                      onClick={() => setSelectedMethod(method.id)}
                    >
                      <span className="method-icon">{method.icon}</span>
                      <span className="method-name">{method.name}</span>
                      {method.popular && <span className="popular-badge">Popular</span>}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="donation-footer">
              <div className="donation-summary">
                {getCurrentAmount() && (
                  <p>
                    <strong>
                      {donationType === 'monthly' ? 'Monthly' : 'One-time'} donation: 
                      ${getCurrentAmount().toFixed(2)}
                    </strong>
                  </p>
                )}
              </div>
              <button 
                className={`donate-btn ${isValidAmount() ? 'enabled' : 'disabled'}`}
                onClick={handleDonateClick}
                disabled={!isValidAmount()}
              >
                {donationType === 'monthly' ? 'Subscribe' : 'Donate'} 
                {getCurrentAmount() ? `$${getCurrentAmount().toFixed(2)}` : ''}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="payment-content">
              <div className="payment-header">
                <button className="back-btn" onClick={handleBackToAmount}>
                  ← Back
                </button>
                <div className="payment-summary">
                  <h4>
                    {donationType === 'monthly' ? 'Monthly' : 'One-time'} 
                    ${getCurrentAmount().toFixed(2)}
                  </h4>
                  <p>via {paymentMethods.find(m => m.id === selectedMethod)?.name}</p>
                </div>
              </div>

              <div className="payment-form">
                <div className="form-group">
                  <label>Email Address *</label>
                  <input
                    type="email"
                    placeholder="your@email.com"
                    value={formData.email}
                    onChange={(e) => handleFormChange('email', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={(e) => handleFormChange('name', e.target.value)}
                    disabled={formData.anonymous}
                  />
                </div>

                <div className="form-group checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.anonymous}
                      onChange={(e) => handleFormChange('anonymous', e.target.checked)}
                    />
                    <span className="checkmark"></span>
                    Donate anonymously
                  </label>
                </div>

                {selectedMethod === 'card' && (
                  <>
                    <div className="form-group">
                      <label>Card Number *</label>
                      <input
                        type="text"
                        placeholder="1234 5678 9012 3456"
                        value={formData.cardNumber}
                        onChange={(e) => handleFormChange('cardNumber', e.target.value)}
                        maxLength="19"
                      />
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Expiry Date *</label>
                        <input
                          type="text"
                          placeholder="MM/YY"
                          value={formData.expiryDate}
                          onChange={(e) => handleFormChange('expiryDate', e.target.value)}
                          maxLength="5"
                        />
                      </div>
                      <div className="form-group">
                        <label>CVV *</label>
                        <input
                          type="text"
                          placeholder="123"
                          value={formData.cvv}
                          onChange={(e) => handleFormChange('cvv', e.target.value)}
                          maxLength="4"
                        />
                      </div>
                    </div>
                  </>
                )}

                {selectedMethod !== 'card' && (
                  <div className="external-payment-info">
                    <p>
                      You will be redirected to {paymentMethods.find(m => m.id === selectedMethod)?.name} 
                      to complete your payment securely.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="payment-footer">
              <div className="security-info">
                <span className="security-icon">🔒</span>
                <span>Your payment information is secure and encrypted</span>
              </div>
              <button 
                className={`submit-btn ${isFormValid() ? 'enabled' : 'disabled'}`}
                onClick={handleSubmitDonation}
                disabled={!isFormValid()}
              >
                Complete {donationType === 'monthly' ? 'Subscription' : 'Donation'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DonationModal;