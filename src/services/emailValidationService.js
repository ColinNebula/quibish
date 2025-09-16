// Email Validation Service
class EmailValidationService {
  constructor() {
    this.emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    this.disposableEmailDomains = [
      '10minutemail.com',
      'tempmail.org',
      'guerrillamail.com',
      'mailinator.com',
      'throwaway.email'
    ];
  }

  // Basic email format validation
  isValidFormat(email) {
    if (!email || typeof email !== 'string') {
      return false;
    }
    return this.emailRegex.test(email.trim().toLowerCase());
  }

  // Check if email domain is disposable
  isDisposableEmail(email) {
    if (!this.isValidFormat(email)) {
      return false;
    }
    
    const domain = email.split('@')[1].toLowerCase();
    return this.disposableEmailDomains.includes(domain);
  }

  // Comprehensive email validation
  validateEmail(email) {
    const result = {
      isValid: false,
      errors: [],
      warnings: []
    };

    // Check if email is provided
    if (!email || email.trim() === '') {
      result.errors.push('Email is required');
      return result;
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check format
    if (!this.isValidFormat(cleanEmail)) {
      result.errors.push('Invalid email format');
      return result;
    }

    // Check length
    if (cleanEmail.length > 254) {
      result.errors.push('Email is too long');
      return result;
    }

    // Check for common issues
    if (cleanEmail.includes('..')) {
      result.errors.push('Email cannot contain consecutive dots');
      return result;
    }

    if (cleanEmail.startsWith('.') || cleanEmail.endsWith('.')) {
      result.errors.push('Email cannot start or end with a dot');
      return result;
    }

    // Check for disposable email
    if (this.isDisposableEmail(cleanEmail)) {
      result.warnings.push('Disposable email addresses are not recommended');
    }

    // If we reach here, email is valid
    result.isValid = true;
    return result;
  }

  // Suggest corrections for common typos
  suggestCorrection(email) {
    if (!email) return null;

    const commonDomainTypos = {
      'gmail.co': 'gmail.com',
      'gmail.cm': 'gmail.com',
      'gmial.com': 'gmail.com',
      'gmai.com': 'gmail.com',
      'yahoo.co': 'yahoo.com',
      'yahoo.cm': 'yahoo.com',
      'hotmai.com': 'hotmail.com',
      'hotmial.com': 'hotmail.com',
      'outlook.co': 'outlook.com',
      'outlok.com': 'outlook.com'
    };

    const emailParts = email.split('@');
    if (emailParts.length !== 2) return null;

    const [localPart, domain] = emailParts;
    const correctedDomain = commonDomainTypos[domain.toLowerCase()];

    if (correctedDomain) {
      return `${localPart}@${correctedDomain}`;
    }

    return null;
  }

  // Real-time validation for form inputs
  validateRealTime(email) {
    if (!email) {
      return { isValid: false, message: '' };
    }

    if (email.length < 3) {
      return { isValid: false, message: 'Email is too short' };
    }

    if (!email.includes('@')) {
      return { isValid: false, message: 'Email must contain @' };
    }

    const validation = this.validateEmail(email);
    
    if (!validation.isValid) {
      return { 
        isValid: false, 
        message: validation.errors[0] || 'Invalid email' 
      };
    }

    if (validation.warnings.length > 0) {
      return { 
        isValid: true, 
        message: validation.warnings[0],
        isWarning: true
      };
    }

    return { isValid: true, message: 'Valid email' };
  }

  // Async validation (simulated - could integrate with real email verification API)
  async validateEmailAsync(email) {
    const basicValidation = this.validateEmail(email);
    
    if (!basicValidation.isValid) {
      return basicValidation;
    }

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Simulated deep validation results
    const result = {
      ...basicValidation,
      deliverable: Math.random() > 0.1, // 90% chance of being deliverable
      riskScore: Math.floor(Math.random() * 100),
      suggestedCorrection: this.suggestCorrection(email)
    };

    return result;
  }
}

// Create singleton instance
const emailValidationService = new EmailValidationService();

export default emailValidationService;