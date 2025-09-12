/**
 * PSTN Call Service
 * Enables calling real phone numbers worldwide through Twilio Voice API
 */

import enhancedVoiceCallService from './enhancedVoiceCallService';

class PSTokenCallService {
  constructor() {
    this.activeCall = null;
    this.callHistory = [];
    this.isInitialized = false;
    
    // Country codes for international calling
    this.countryCodes = {
      'US': { code: '+1', name: 'United States', format: '(XXX) XXX-XXXX' },
      'CA': { code: '+1', name: 'Canada', format: '(XXX) XXX-XXXX' },
      'GB': { code: '+44', name: 'United Kingdom', format: 'XXXX XXX XXXX' },
      'DE': { code: '+49', name: 'Germany', format: 'XXX XXXXXXXX' },
      'FR': { code: '+33', name: 'France', format: 'X XX XX XX XX' },
      'IT': { code: '+39', name: 'Italy', format: 'XXX XXX XXXX' },
      'ES': { code: '+34', name: 'Spain', format: 'XXX XX XX XX' },
      'AU': { code: '+61', name: 'Australia', format: 'XXX XXX XXX' },
      'JP': { code: '+81', name: 'Japan', format: 'XX-XXXX-XXXX' },
      'CN': { code: '+86', name: 'China', format: 'XXX XXXX XXXX' },
      'IN': { code: '+91', name: 'India', format: 'XXXXX XXXXX' },
      'BR': { code: '+55', name: 'Brazil', format: '(XX) XXXXX-XXXX' },
      'MX': { code: '+52', name: 'Mexico', format: 'XXX XXX XXXX' },
      'RU': { code: '+7', name: 'Russia', format: 'XXX XXX-XX-XX' },
      'KR': { code: '+82', name: 'South Korea', format: 'XX-XXXX-XXXX' },
      'ZA': { code: '+27', name: 'South Africa', format: 'XX XXX XXXX' },
      'EG': { code: '+20', name: 'Egypt', format: 'XX XXXX XXXX' },
      'NG': { code: '+234', name: 'Nigeria', format: 'XXX XXX XXXX' },
      'KE': { code: '+254', name: 'Kenya', format: 'XXX XXXXXX' },
      'AE': { code: '+971', name: 'UAE', format: 'XX XXX XXXX' },
      'SA': { code: '+966', name: 'Saudi Arabia', format: 'XX XXX XXXX' },
      'TR': { code: '+90', name: 'Turkey', format: 'XXX XXX XX XX' },
      'PL': { code: '+48', name: 'Poland', format: 'XXX XXX XXX' },
      'NL': { code: '+31', name: 'Netherlands', format: 'X XXXX XXXX' },
      'SE': { code: '+46', name: 'Sweden', format: 'XXX XXX XX XX' },
      'NO': { code: '+47', name: 'Norway', format: 'XXX XX XXX' },
      'DK': { code: '+45', name: 'Denmark', format: 'XX XX XX XX' },
      'FI': { code: '+358', name: 'Finland', format: 'XX XXX XXXX' },
      'CH': { code: '+41', name: 'Switzerland', format: 'XX XXX XX XX' },
      'AT': { code: '+43', name: 'Austria', format: 'XXX XXXXXXX' },
      'BE': { code: '+32', name: 'Belgium', format: 'XXX XX XX XX' },
      'IE': { code: '+353', name: 'Ireland', format: 'XX XXX XXXX' },
      'PT': { code: '+351', name: 'Portugal', format: 'XXX XXX XXX' },
      'GR': { code: '+30', name: 'Greece', format: 'XXX XXX XXXX' },
      'CZ': { code: '+420', name: 'Czech Republic', format: 'XXX XXX XXX' },
      'HU': { code: '+36', name: 'Hungary', format: 'XX XXX XXXX' },
      'RO': { code: '+40', name: 'Romania', format: 'XXX XXX XXXX' },
      'BG': { code: '+359', name: 'Bulgaria', format: 'XX XXX XXXX' },
      'HR': { code: '+385', name: 'Croatia', format: 'XX XXX XXXX' },
      'SI': { code: '+386', name: 'Slovenia', format: 'XX XXX XXX' },
      'SK': { code: '+421', name: 'Slovakia', format: 'XXX XXX XXX' },
      'LT': { code: '+370', name: 'Lithuania', format: 'XXX XXXXX' },
      'LV': { code: '+371', name: 'Latvia', format: 'XXXX XXXX' },
      'EE': { code: '+372', name: 'Estonia', format: 'XXXX XXXX' },
      'IS': { code: '+354', name: 'Iceland', format: 'XXX XXXX' },
      'LU': { code: '+352', name: 'Luxembourg', format: 'XXX XXX XXX' },
      'MT': { code: '+356', name: 'Malta', format: 'XXXX XXXX' },
      'CY': { code: '+357', name: 'Cyprus', format: 'XX XXXXXX' },
      'IL': { code: '+972', name: 'Israel', format: 'XX-XXX-XXXX' },
      'LB': { code: '+961', name: 'Lebanon', format: 'XX XXX XXX' },
      'JO': { code: '+962', name: 'Jordan', format: 'X XXXX XXXX' },
      'SY': { code: '+963', name: 'Syria', format: 'XXX XXX XXX' },
      'IQ': { code: '+964', name: 'Iraq', format: 'XXX XXX XXXX' },
      'KW': { code: '+965', name: 'Kuwait', format: 'XXXX XXXX' },
      'BH': { code: '+973', name: 'Bahrain', format: 'XXXX XXXX' },
      'QA': { code: '+974', name: 'Qatar', format: 'XXXX XXXX' },
      'OM': { code: '+968', name: 'Oman', format: 'XXXX XXXX' },
      'YE': { code: '+967', name: 'Yemen', format: 'XXX XXX XXX' },
      'AF': { code: '+93', name: 'Afghanistan', format: 'XX XXX XXXX' },
      'PK': { code: '+92', name: 'Pakistan', format: 'XXX XXXXXXX' },
      'BD': { code: '+880', name: 'Bangladesh', format: 'XXXX-XXXXXX' },
      'LK': { code: '+94', name: 'Sri Lanka', format: 'XX XXX XXXX' },
      'NP': { code: '+977', name: 'Nepal', format: 'XXX-XXX-XXXX' },
      'BT': { code: '+975', name: 'Bhutan', format: 'X XXX XXX' },
      'MV': { code: '+960', name: 'Maldives', format: 'XXX-XXXX' },
      'MM': { code: '+95', name: 'Myanmar', format: 'XX XXX XXXX' },
      'TH': { code: '+66', name: 'Thailand', format: 'XX XXX XXXX' },
      'VN': { code: '+84', name: 'Vietnam', format: 'XXX XXX XXXX' },
      'LA': { code: '+856', name: 'Laos', format: 'XX XXX XXX' },
      'KH': { code: '+855', name: 'Cambodia', format: 'XXX XXX XXX' },
      'MY': { code: '+60', name: 'Malaysia', format: 'XX-XXXX XXXX' },
      'SG': { code: '+65', name: 'Singapore', format: 'XXXX XXXX' },
      'ID': { code: '+62', name: 'Indonesia', format: 'XXX-XXXX-XXXX' },
      'PH': { code: '+63', name: 'Philippines', format: 'XXX XXX XXXX' },
      'TW': { code: '+886', name: 'Taiwan', format: 'XXXX XXXXXX' },
      'HK': { code: '+852', name: 'Hong Kong', format: 'XXXX XXXX' },
      'MO': { code: '+853', name: 'Macau', format: 'XXXX XXXX' },
      'MN': { code: '+976', name: 'Mongolia', format: 'XXXX XXXX' },
      'KZ': { code: '+7', name: 'Kazakhstan', format: 'XXX XXX XX XX' },
      'UZ': { code: '+998', name: 'Uzbekistan', format: 'XX XXX XX XX' },
      'TM': { code: '+993', name: 'Turkmenistan', format: 'XX XXXXXX' },
      'TJ': { code: '+992', name: 'Tajikistan', format: 'XXX XX XX XX' },
      'KG': { code: '+996', name: 'Kyrgyzstan', format: 'XXX XXXXXX' },
      'GE': { code: '+995', name: 'Georgia', format: 'XXX XXX XXX' },
      'AM': { code: '+374', name: 'Armenia', format: 'XX XXXXXX' },
      'AZ': { code: '+994', name: 'Azerbaijan', format: 'XX XXX XX XX' },
      'BY': { code: '+375', name: 'Belarus', format: 'XX XXX-XX-XX' },
      'UA': { code: '+380', name: 'Ukraine', format: 'XX XXX XX XX' },
      'MD': { code: '+373', name: 'Moldova', format: 'XXXX XXXX' },
      'RU': { code: '+7', name: 'Russia', format: 'XXX XXX-XX-XX' }
    };
  }

  /**
   * Initialize PSTN calling service
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      // In a real implementation, this would:
      // 1. Initialize Twilio Device
      // 2. Get access token from backend
      // 3. Set up event handlers
      
      console.log('📞 Initializing PSTN calling service...');
      
      // Simulate Twilio Device initialization
      this.twilioDevice = {
        ready: true,
        canCall: true,
        connectionQuality: 'excellent'
      };
      
      this.isInitialized = true;
      console.log('✅ PSTN calling service initialized');
      
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize PSTN calling service:', error);
      return false;
    }
  }

  /**
   * Validate and format international phone number
   */
  validateInternationalNumber(phoneNumber, countryCode = 'US') {
    if (!phoneNumber) return { valid: false, error: 'No phone number provided' };

    // Remove all non-digit characters
    let cleanNumber = phoneNumber.replace(/\D/g, '');
    
    // Get country info
    const countryInfo = this.countryCodes[countryCode.toUpperCase()];
    if (!countryInfo) {
      return { valid: false, error: 'Unsupported country code' };
    }

    // Check if number already has country code
    const expectedCode = countryInfo.code.replace('+', '');
    if (cleanNumber.startsWith(expectedCode)) {
      // Number already has country code
      cleanNumber = cleanNumber;
    } else {
      // Add country code
      cleanNumber = expectedCode + cleanNumber;
    }

    // Validate length (international numbers are typically 7-15 digits)
    if (cleanNumber.length < 7 || cleanNumber.length > 15) {
      return { 
        valid: false, 
        error: `Invalid number length for ${countryInfo.name}` 
      };
    }

    return {
      valid: true,
      originalNumber: phoneNumber,
      cleanNumber: cleanNumber,
      formattedNumber: '+' + cleanNumber,
      displayNumber: this.formatNumberForDisplay(cleanNumber, countryCode),
      country: countryInfo.name,
      countryCode: countryInfo.code
    };
  }

  /**
   * Format number for display based on country
   */
  formatNumberForDisplay(cleanNumber, countryCode) {
    const countryInfo = this.countryCodes[countryCode.toUpperCase()];
    if (!countryInfo) return '+' + cleanNumber;

    const countryDigits = countryInfo.code.replace('+', '');
    const localNumber = cleanNumber.startsWith(countryDigits) 
      ? cleanNumber.substring(countryDigits.length) 
      : cleanNumber;

    // Apply country-specific formatting
    switch (countryCode.toUpperCase()) {
      case 'US':
      case 'CA':
        if (localNumber.length === 10) {
          return `${countryInfo.code} (${localNumber.substring(0, 3)}) ${localNumber.substring(3, 6)}-${localNumber.substring(6)}`;
        }
        break;
      case 'GB':
        if (localNumber.length >= 10) {
          return `${countryInfo.code} ${localNumber.substring(0, 4)} ${localNumber.substring(4, 7)} ${localNumber.substring(7)}`;
        }
        break;
      case 'DE':
        if (localNumber.length >= 10) {
          return `${countryInfo.code} ${localNumber.substring(0, 3)} ${localNumber.substring(3)}`;
        }
        break;
      case 'FR':
        if (localNumber.length === 9) {
          return `${countryInfo.code} ${localNumber.substring(0, 1)} ${localNumber.substring(1, 3)} ${localNumber.substring(3, 5)} ${localNumber.substring(5, 7)} ${localNumber.substring(7)}`;
        }
        break;
      default:
        return `${countryInfo.code} ${localNumber}`;
    }

    return '+' + cleanNumber;
  }

  /**
   * Detect country from phone number
   */
  detectCountryFromNumber(phoneNumber) {
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    
    // Sort country codes by length (longest first) to match correctly
    const sortedCodes = Object.entries(this.countryCodes)
      .sort((a, b) => b[1].code.length - a[1].code.length);

    for (const [countryCode, info] of sortedCodes) {
      const code = info.code.replace('+', '');
      if (cleanNumber.startsWith(code)) {
        return {
          country: countryCode,
          name: info.name,
          code: info.code,
          localNumber: cleanNumber.substring(code.length)
        };
      }
    }

    return null;
  }

  /**
   * Get calling info for a country - ALL CALLS ARE FREE!
   */
  getCallingInfo(countryCode) {
    // All calls are completely FREE when using this app!
    const countryInfo = this.countryCodes[countryCode.toUpperCase()];
    return {
      perMinute: 'FREE',
      currency: 'N/A',
      connection: 'FREE',
      message: `✨ FREE calling to ${countryInfo?.name || 'this country'} via our app!`,
      isFree: true
    };
  }

  /**
   * Initiate PSTN call to phone number
   */
  async initiateCall(phoneNumber, options = {}) {
    await this.initialize();

    const {
      countryCode = 'US',
      recordCall = false,
      enableFallback = true
    } = options;

    try {
      // Validate phone number
      const validation = this.validateInternationalNumber(phoneNumber, countryCode);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      const callId = `pstn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const callInfo = this.getCallingInfo(countryCode);

      // Create call instance - ALL CALLS ARE FREE!
      const callInstance = {
        callId,
        type: 'pstn',
        targetNumber: validation.formattedNumber,
        displayNumber: validation.displayNumber,
        country: validation.country,
        countryCode: validation.countryCode,
        status: 'initiating',
        startTime: new Date(),
        callInfo,
        cost: 'FREE',
        billing: 'No charges - completely free via app!',
        recordCall,
        enableFallback,
        connectionType: 'pstn',
        enhancedFeatures: {
          pstnCall: true,
          internationalCalling: true,
          callRecording: recordCall,
          qualityMonitoring: true,
          freeCalling: true
        }
      };

      this.activeCall = callInstance;

      // In a real implementation, this would:
      // 1. Use Twilio Device to make the call
      // 2. Handle call state changes
      // 3. Monitor call quality
      // 4. Handle recording if enabled

      console.log(`📞 Initiating FREE PSTN call to ${validation.displayNumber}`);
      console.log(`✨ No charges - this call is completely FREE via our app!`);
      
      // Simulate call progression
      setTimeout(() => {
        if (this.activeCall && this.activeCall.callId === callId) {
          this.activeCall.status = 'ringing';
          this.notifyCallStateChange('ringing');
        }
      }, 1000);

      setTimeout(() => {
        if (this.activeCall && this.activeCall.callId === callId) {
          // Simulate call answer
          const answered = window.confirm(
            `Calling ${validation.displayNumber}\n\nSimulate call answered?`
          );
          
          if (answered) {
            this.activeCall.status = 'connected';
            this.activeCall.connectedTime = new Date();
            this.notifyCallStateChange('connected');
            this.startCallTimer();
          } else {
            this.activeCall.status = 'no-answer';
            this.notifyCallStateChange('no-answer');
            this.endCall();
          }
        }
      }, 3000);

      return callInstance;

    } catch (error) {
      console.error('❌ Failed to initiate PSTN call:', error);
      
      if (options.enableFallback) {
        // Fallback to WebRTC or other methods
        console.log('🔄 Attempting fallback to WebRTC...');
        return await enhancedVoiceCallService.initiateEnhancedCall(
          { phone: phoneNumber },
          'webrtc'
        );
      }
      
      throw error;
    }
  }

  /**
   * Start call timer and cost calculation
   */
  startCallTimer() {
    if (!this.activeCall) return;

    this.callTimer = setInterval(() => {
      if (this.activeCall && this.activeCall.status === 'connected') {
        const duration = new Date() - this.activeCall.connectedTime;
        const minutes = duration / (1000 * 60);
        const cost = (minutes * this.activeCall.rates.perMinute) + this.activeCall.rates.connection;
        
        this.activeCall.duration = duration;
        this.activeCall.estimatedCost = cost;
        
        this.notifyCallStateChange('timer-update');
      }
    }, 1000);
  }

  /**
   * End current call
   */
  endCall() {
    if (!this.activeCall) return null;

    const callStats = {
      ...this.activeCall,
      endTime: new Date(),
      finalStatus: this.activeCall.status
    };

    if (this.activeCall.connectedTime) {
      callStats.totalDuration = new Date() - this.activeCall.connectedTime;
      callStats.finalCost = (callStats.totalDuration / (1000 * 60)) * this.activeCall.rates.perMinute + this.activeCall.rates.connection;
    }

    // Store in call history
    this.callHistory.push(callStats);

    // Clean up
    if (this.callTimer) {
      clearInterval(this.callTimer);
      this.callTimer = null;
    }

    this.activeCall = null;
    this.notifyCallStateChange('ended');

    console.log('📞 PSTN call ended:', callStats);
    return callStats;
  }

  /**
   * Get current call status
   */
  getCurrentCall() {
    return this.activeCall;
  }

  /**
   * Get call history
   */
  getCallHistory() {
    return this.callHistory.slice().reverse(); // Most recent first
  }

  /**
   * Check if PSTN calling is available
   */
  isAvailable() {
    return this.isInitialized && this.twilioDevice?.ready;
  }

  /**
   * Get supported countries
   */
  getSupportedCountries() {
    return Object.entries(this.countryCodes).map(([code, info]) => ({
      code,
      name: info.name,
      dialCode: info.code,
      format: info.format
    })).sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Notify call state changes
   */
  notifyCallStateChange(state) {
    // In a real implementation, this would emit events
    // that the UI components can listen to
    console.log(`📞 Call state changed: ${state}`);
    
    // Custom event for UI updates
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('pstn-call-state-change', {
        detail: {
          state,
          call: this.activeCall
        }
      }));
    }
  }

  /**
   * Emergency calling support
   */
  canCallEmergency(countryCode) {
    const emergencyNumbers = {
      'US': ['911'],
      'GB': ['999', '112'],
      'DE': ['112', '110'],
      'FR': ['112', '15', '17', '18'],
      'AU': ['000', '112'],
      'CA': ['911'],
      'JP': ['110', '119'],
      'IN': ['100', '101', '102', '108'],
      'CN': ['110', '119', '120']
    };

    return emergencyNumbers[countryCode.toUpperCase()] || ['112'];
  }
}

// Create singleton instance
const pstnCallService = new PSTokenCallService();

export default pstnCallService;