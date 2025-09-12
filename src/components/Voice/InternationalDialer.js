/**
 * International Dialer Component
 * Provides UI for calling any phone number worldwide
 */

import React, { useState, useEffect, useCallback } from 'react';
import pstnCallService from '../../services/pstnCallService';
import './InternationalDialer.css';

const InternationalDialer = ({ isOpen, onClose, contact = null, darkMode = false }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('US');
  const [supportedCountries, setSupportedCountries] = useState([]);
  const [validation, setValidation] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [callRates, setCallRates] = useState(null);
  const [currentCall, setCurrentCall] = useState(null);
  const [callHistory, setCallHistory] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize component
  useEffect(() => {
    if (isOpen) {
      initializeDialer();
    }
  }, [isOpen]);

  // Listen for call state changes
  useEffect(() => {
    const handleCallStateChange = (event) => {
      const { state, call } = event.detail;
      
      if (state === 'ended') {
        setCurrentCall(null);
        loadCallHistory();
      } else {
        setCurrentCall(call);
      }
    };

    window.addEventListener('pstn-call-state-change', handleCallStateChange);
    return () => window.removeEventListener('pstn-call-state-change', handleCallStateChange);
  }, []);

  // Pre-fill contact phone number
  useEffect(() => {
    if (contact && contact.phone) {
      setPhoneNumber(contact.phone);
      
      // Try to detect country from phone number
      const detectedCountry = pstnCallService.detectCountryFromNumber(contact.phone);
      if (detectedCountry) {
        setSelectedCountry(detectedCountry.country);
      }
    }
  }, [contact]);

  // Validate phone number when it changes
  useEffect(() => {
    if (phoneNumber) {
      validatePhoneNumber();
    } else {
      setValidation(null);
      setCallRates(null);
    }
  }, [phoneNumber, selectedCountry]);

  const initializeDialer = async () => {
    try {
      // Initialize PSTN service
      await pstnCallService.initialize();
      
      // Load supported countries
      const countries = pstnCallService.getSupportedCountries();
      setSupportedCountries(countries);
      
      // Load call history
      loadCallHistory();
      
      setIsInitialized(true);
    } catch (error) {
      console.error('Failed to initialize dialer:', error);
    }
  };

  const validatePhoneNumber = async () => {
    if (!phoneNumber.trim()) {
      setValidation(null);
      return;
    }

    setIsValidating(true);
    
    try {
      const result = pstnCallService.validateInternationalNumber(phoneNumber, selectedCountry);
      setValidation(result);
      
      if (result.valid) {
        const callInfo = pstnCallService.getCallingInfo(selectedCountry);
        setCallRates(callInfo);
      }
    } catch (error) {
      console.error('Validation error:', error);
      setValidation({ valid: false, error: error.message });
    } finally {
      setIsValidating(false);
    }
  };

  const loadCallHistory = () => {
    const history = pstnCallService.getCallHistory();
    setCallHistory(history.slice(0, 10)); // Show last 10 calls
  };

  const handleCall = async () => {
    if (!validation?.valid) return;

    try {
      const call = await pstnCallService.initiateCall(phoneNumber, {
        countryCode: selectedCountry,
        recordCall: false,
        enableFallback: true
      });
      
      setCurrentCall(call);
    } catch (error) {
      alert(`Failed to start call: ${error.message}`);
    }
  };

  const handleEndCall = () => {
    pstnCallService.endCall();
  };

  const formatDuration = (duration) => {
    if (!duration) return '00:00';
    
    const minutes = Math.floor(duration / (1000 * 60));
    const seconds = Math.floor((duration % (1000 * 60)) / 1000);
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatCost = (cost) => {
    if (cost === 'FREE' || !cost) return '✨ FREE';
    if (typeof cost === 'string') return cost;
    return `$${cost.toFixed(4)}`;
  };

  if (!isOpen) return null;

  return (
    <div className={`international-dialer-overlay ${darkMode ? 'dark' : ''}`}>
      <div className="international-dialer-modal">
        {/* Header */}
        <div className="dialer-header">
          <div>
            <h2>🌍 International Calling</h2>
            <p className="free-calling-subtitle">✨ All calls are completely FREE via this app!</p>
          </div>
          <button 
            className="close-btn"
            onClick={onClose}
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="dialer-content">
          {!isInitialized ? (
            <div className="dialer-loading">
              <div className="loading-spinner"></div>
              <p>Initializing international calling...</p>
            </div>
          ) : currentCall ? (
            /* Active Call UI */
            <div className="active-call">
              <div className="call-info">
                <h3>📞 Calling {currentCall.displayNumber}</h3>
                <p className="call-status">{currentCall.status}</p>
                <p className="call-country">{currentCall.country}</p>
                
                {currentCall.status === 'connected' && (
                  <div className="call-stats">
                    <div className="call-duration">
                      Duration: {formatDuration(currentCall.duration)}
                    </div>
                    <div className="call-cost">
                      Cost: {formatCost(currentCall.estimatedCost)}
                    </div>
                  </div>
                )}
              </div>

              <div className="call-controls">
                <button 
                  className="end-call-btn"
                  onClick={handleEndCall}
                >
                  📞 End Call
                </button>
              </div>
            </div>
          ) : (
            /* Dialer UI */
            <div className="dialer-form">
              {/* Country Selection */}
              <div className="form-group">
                <label>Country</label>
                <select 
                  value={selectedCountry}
                  onChange={(e) => setSelectedCountry(e.target.value)}
                  className="country-select"
                >
                  {supportedCountries.map(country => (
                    <option key={country.code} value={country.code}>
                      {country.dialCode} {country.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Phone Number Input */}
              <div className="form-group">
                <label>Phone Number</label>
                <div className="phone-input-group">
                  <span className="country-code">
                    {supportedCountries.find(c => c.code === selectedCountry)?.dialCode || '+1'}
                  </span>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="Enter phone number"
                    className="phone-input"
                  />
                </div>
              </div>

              {/* Validation */}
              {isValidating && (
                <div className="validation-loading">
                  <div className="spinner"></div>
                  Validating number...
                </div>
              )}

              {validation && (
                <div className={`validation-result ${validation.valid ? 'valid' : 'invalid'}`}>
                  {validation.valid ? (
                    <div className="valid-number">
                      <div className="check-icon">✅</div>
                      <div className="number-info">
                        <div className="formatted-number">{validation.displayNumber}</div>
                        <div className="country-name">{validation.country}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="invalid-number">
                      <div className="error-icon">❌</div>
                      <div className="error-message">{validation.error}</div>
                    </div>
                  )}
                </div>
              )}

              {/* Free Calling Info */}
              {callRates && validation?.valid && (
                <div className="call-rates free-calling">
                  <h4>✨ Free Calling</h4>
                  <div className="rates-info">
                    <div className="rate-item">
                      <span>Cost per minute:</span>
                      <span className="free-badge">{formatCost(callRates.perMinute)}</span>
                    </div>
                    <div className="rate-item">
                      <span>Connection fee:</span>
                      <span className="free-badge">{formatCost(callRates.connection)}</span>
                    </div>
                    {callRates.message && (
                      <div className="free-message">
                        {callRates.message}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Call Button */}
              <div className="call-actions">
                <button 
                  className="call-btn free-call"
                  onClick={handleCall}
                  disabled={!validation?.valid}
                >
                  📞 FREE Call {validation?.displayNumber || 'Number'}
                </button>
              </div>

              {/* Emergency Notice */}
              <div className="emergency-notice">
                <p>⚠️ For emergencies, use your local emergency number</p>
              </div>
            </div>
          )}

          {/* Call History (when not in active call) */}
          {!currentCall && callHistory.length > 0 && (
            <div className="call-history">
              <h4>📋 Recent Calls</h4>
              <div className="history-list">
                {callHistory.map((call, index) => (
                  <div key={index} className="history-item">
                    <div className="history-info">
                      <div className="history-number">{call.displayNumber}</div>
                      <div className="history-details">
                        {call.country} • {formatDuration(call.totalDuration)} • ✨ FREE
                      </div>
                    </div>
                    <div className="history-time">
                      {new Date(call.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InternationalDialer;