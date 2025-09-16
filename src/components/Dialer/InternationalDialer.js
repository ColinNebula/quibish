import React, { useState, useEffect } from 'react';
import './InternationalDialer.css';

const InternationalDialer = ({ isOpen, onClose, onCall, initialNumber = '' }) => {
  const [phoneNumber, setPhoneNumber] = useState(initialNumber);
  const [selectedCountry, setSelectedCountry] = useState('US');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCountryList, setShowCountryList] = useState(false);
  const [callHistory, setCallHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  // Popular countries with calling codes
  const countries = [
    { code: 'US', name: 'United States', dialCode: '+1', flag: '🇺🇸' },
    { code: 'CA', name: 'Canada', dialCode: '+1', flag: '🇨🇦' },
    { code: 'GB', name: 'United Kingdom', dialCode: '+44', flag: '🇬🇧' },
    { code: 'DE', name: 'Germany', dialCode: '+49', flag: '🇩🇪' },
    { code: 'FR', name: 'France', dialCode: '+33', flag: '🇫🇷' },
    { code: 'IT', name: 'Italy', dialCode: '+39', flag: '🇮🇹' },
    { code: 'ES', name: 'Spain', dialCode: '+34', flag: '🇪🇸' },
    { code: 'NL', name: 'Netherlands', dialCode: '+31', flag: '🇳🇱' },
    { code: 'AU', name: 'Australia', dialCode: '+61', flag: '🇦🇺' },
    { code: 'JP', name: 'Japan', dialCode: '+81', flag: '🇯🇵' },
    { code: 'KR', name: 'South Korea', dialCode: '+82', flag: '🇰🇷' },
    { code: 'CN', name: 'China', dialCode: '+86', flag: '🇨🇳' },
    { code: 'IN', name: 'India', dialCode: '+91', flag: '🇮🇳' },
    { code: 'BR', name: 'Brazil', dialCode: '+55', flag: '🇧🇷' },
    { code: 'MX', name: 'Mexico', dialCode: '+52', flag: '🇲🇽' },
    { code: 'RU', name: 'Russia', dialCode: '+7', flag: '🇷🇺' },
    { code: 'ZA', name: 'South Africa', dialCode: '+27', flag: '🇿🇦' },
    { code: 'EG', name: 'Egypt', dialCode: '+20', flag: '🇪🇬' },
    { code: 'NG', name: 'Nigeria', dialCode: '+234', flag: '🇳🇬' },
    { code: 'KE', name: 'Kenya', dialCode: '+254', flag: '🇰🇪' },
    { code: 'SG', name: 'Singapore', dialCode: '+65', flag: '🇸🇬' },
    { code: 'TH', name: 'Thailand', dialCode: '+66', flag: '🇹🆭' },
    { code: 'VN', name: 'Vietnam', dialCode: '+84', flag: '🇻🇳' },
    { code: 'PH', name: 'Philippines', dialCode: '+63', flag: '🇵🆭' },
    { code: 'ID', name: 'Indonesia', dialCode: '+62', flag: '🇮🇩' },
    { code: 'MY', name: 'Malaysia', dialCode: '+60', flag: '🇲🇾' },
    { code: 'PK', name: 'Pakistan', dialCode: '+92', flag: '🇵🇰' },
    { code: 'BD', name: 'Bangladesh', dialCode: '+880', flag: '🇧🇩' },
    { code: 'LK', name: 'Sri Lanka', dialCode: '+94', flag: '🇱🇰' },
    { code: 'AE', name: 'UAE', dialCode: '+971', flag: '🇦🇪' },
    { code: 'SA', name: 'Saudi Arabia', dialCode: '+966', flag: '🇸🇦' },
    { code: 'TR', name: 'Turkey', dialCode: '+90', flag: '🇹🇷' },
    { code: 'IL', name: 'Israel', dialCode: '+972', flag: '🇮🇱' },
    { code: 'AR', name: 'Argentina', dialCode: '+54', flag: '🇦🇷' },
    { code: 'CL', name: 'Chile', dialCode: '+56', flag: '🇨🇱' },
    { code: 'CO', name: 'Colombia', dialCode: '+57', flag: '🇨🇴' },
    { code: 'PE', name: 'Peru', dialCode: '+51', flag: '🇵🇪' },
  ];

  // Load call history from localStorage
  useEffect(() => {
    const history = JSON.parse(localStorage.getItem('international_call_history') || '[]');
    setCallHistory(history);
  }, []);

  // Get current country info
  const currentCountry = countries.find(c => c.code === selectedCountry) || countries[0];

  // Filter countries based on search
  const filteredCountries = countries.filter(country => 
    country.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    country.dialCode.includes(searchTerm) ||
    country.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle number input
  const handleNumberInput = (digit) => {
    setPhoneNumber(prev => prev + digit);
  };

  // Handle backspace
  const handleBackspace = () => {
    setPhoneNumber(prev => prev.slice(0, -1));
  };

  // Clear number
  const handleClear = () => {
    setPhoneNumber('');
  };

  // Format phone number for display
  const formatNumber = (number, country) => {
    if (!number) return country.dialCode;
    return `${country.dialCode} ${number}`;
  };

  // Validate phone number
  const isValidNumber = () => {
    return phoneNumber.length >= 3; // Minimum 3 digits
  };

  // Handle call
  const handleCall = () => {
    if (!isValidNumber()) {
      alert('Please enter a valid phone number');
      return;
    }

    const fullNumber = `${currentCountry.dialCode}${phoneNumber}`;
    const callRecord = {
      id: Date.now(),
      number: fullNumber,
      country: currentCountry,
      localNumber: phoneNumber,
      timestamp: new Date().toISOString(),
      type: 'outgoing'
    };

    // Save to history
    const updatedHistory = [callRecord, ...callHistory.slice(0, 49)]; // Keep last 50 calls
    setCallHistory(updatedHistory);
    localStorage.setItem('international_call_history', JSON.stringify(updatedHistory));

    // Call the onCall callback
    if (onCall) {
      onCall({
        number: fullNumber,
        country: currentCountry,
        localNumber: phoneNumber
      });
    }

    onClose();
  };

  // Select country
  const selectCountry = (country) => {
    setSelectedCountry(country.code);
    setShowCountryList(false);
    setSearchTerm('');
  };

  // Dial from history
  const dialFromHistory = (historyItem) => {
    setSelectedCountry(historyItem.country.code);
    setPhoneNumber(historyItem.localNumber);
    setShowHistory(false);
  };

  // Handle overlay click
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="dialer-overlay" onClick={handleOverlayClick}>
      <div className="dialer-modal">
        <div className="dialer-header">
          <h3>🌍 International Dialer</h3>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="dialer-content">
          {/* Country Selector */}
          <div className="country-selector">
            <button 
              className="country-btn"
              onClick={() => setShowCountryList(!showCountryList)}
            >
              <span className="country-flag">{currentCountry.flag}</span>
              <span className="country-info">
                <span className="country-name">{currentCountry.name}</span>
                <span className="country-code">{currentCountry.dialCode}</span>
              </span>
              <span className="dropdown-arrow">▼</span>
            </button>

            {showCountryList && (
              <div className="country-dropdown">
                <div className="country-search">
                  <input
                    type="text"
                    placeholder="Search countries..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="country-search-input"
                  />
                </div>
                <div className="country-list">
                  {filteredCountries.map(country => (
                    <button
                      key={country.code}
                      className="country-item"
                      onClick={() => selectCountry(country)}
                    >
                      <span className="country-flag">{country.flag}</span>
                      <span className="country-details">
                        <span className="country-name">{country.name}</span>
                        <span className="country-code">{country.dialCode}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Number Display */}
          <div className="number-display">
            <input
              type="text"
              value={formatNumber(phoneNumber, currentCountry)}
              readOnly
              className="number-input"
              placeholder={`${currentCountry.dialCode} Enter number`}
            />
            <div className="display-actions">
              {phoneNumber && (
                <button className="clear-btn" onClick={handleClear}>
                  🗑️
                </button>
              )}
              <button 
                className="history-btn"
                onClick={() => setShowHistory(!showHistory)}
                title="Call History"
              >
                🕰️
              </button>
            </div>
          </div>

          {/* Call History */}
          {showHistory && callHistory.length > 0 && (
            <div className="call-history">
              <h4>Recent Calls</h4>
              <div className="history-list">
                {callHistory.slice(0, 5).map(call => (
                  <button
                    key={call.id}
                    className="history-item"
                    onClick={() => dialFromHistory(call)}
                  >
                    <span className="history-flag">{call.country.flag}</span>
                    <span className="history-number">{call.number}</span>
                    <span className="history-time">
                      {new Date(call.timestamp).toLocaleDateString()}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Number Pad */}
          <div className="number-pad">
            <div className="pad-row">
              <button onClick={() => handleNumberInput('1')}>1</button>
              <button onClick={() => handleNumberInput('2')}>2<span>ABC</span></button>
              <button onClick={() => handleNumberInput('3')}>3<span>DEF</span></button>
            </div>
            <div className="pad-row">
              <button onClick={() => handleNumberInput('4')}>4<span>GHI</span></button>
              <button onClick={() => handleNumberInput('5')}>5<span>JKL</span></button>
              <button onClick={() => handleNumberInput('6')}>6<span>MNO</span></button>
            </div>
            <div className="pad-row">
              <button onClick={() => handleNumberInput('7')}>7<span>PQRS</span></button>
              <button onClick={() => handleNumberInput('8')}>8<span>TUV</span></button>
              <button onClick={() => handleNumberInput('9')}>9<span>WXYZ</span></button>
            </div>
            <div className="pad-row">
              <button onClick={() => handleNumberInput('*')}>*</button>
              <button onClick={() => handleNumberInput('0')}>0<span>+</span></button>
              <button onClick={() => handleNumberInput('#')}>#</button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="dialer-actions">
            <button 
              className="backspace-btn"
              onClick={handleBackspace}
              disabled={!phoneNumber}
            >
              ⌫
            </button>
            <button 
              className={`call-btn ${isValidNumber() ? 'enabled' : 'disabled'}`}
              onClick={handleCall}
              disabled={!isValidNumber()}
            >
              📞 Call
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InternationalDialer;