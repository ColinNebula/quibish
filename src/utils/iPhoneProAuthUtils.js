/**
 * iPhone Pro Authentication Enhancements
 * Additional JavaScript utilities for better iPhone Pro login/register experience
 */

// Viewport height fix for iPhone Pro models
const iPhoneProViewportFix = () => {
  const setViewportHeight = () => {
    // Get the actual viewport height, accounting for dynamic browser UI
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
    
    // iPhone Pro specific adjustments
    const isIPhonePro = window.navigator.userAgent.includes('iPhone') && 
                       window.screen.height >= 844 && 
                       window.devicePixelRatio === 3;
    
    if (isIPhonePro) {
      document.documentElement.classList.add('iphone-pro');
      
      // Handle safe area for auth forms
      const authForm = document.querySelector('.auth-form');
      if (authForm) {
        // Add extra class for iPhone Pro specific handling
        authForm.classList.add('iphone-pro-optimized');
      }
    }
  };

  // Set on load
  setViewportHeight();
  
  // Update on resize and orientation change
  window.addEventListener('resize', setViewportHeight);
  window.addEventListener('orientationchange', () => {
    // Delay to ensure orientation change is complete
    setTimeout(setViewportHeight, 100);
  });
};

// Virtual keyboard handling for iPhone Pro
const handleVirtualKeyboard = () => {
  let initialViewportHeight = window.innerHeight;
  
  const adjustForKeyboard = () => {
    const currentHeight = window.innerHeight;
    const heightDifference = initialViewportHeight - currentHeight;
    
    // If height difference is significant, keyboard is likely open
    if (heightDifference > 150) {
      document.body.classList.add('keyboard-open');
      
      // Scroll active input into view
      const activeInput = document.activeElement;
      if (activeInput && activeInput.tagName === 'INPUT') {
        setTimeout(() => {
          activeInput.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center',
            inline: 'nearest'
          });
        }, 300);
      }
    } else {
      document.body.classList.remove('keyboard-open');
    }
  };
  
  // Listen for viewport changes
  window.addEventListener('resize', adjustForKeyboard);
  
  // Handle focus events
  document.addEventListener('focusin', (e) => {
    if (e.target.tagName === 'INPUT') {
      setTimeout(adjustForKeyboard, 300);
    }
  });
  
  document.addEventListener('focusout', () => {
    setTimeout(() => {
      document.body.classList.remove('keyboard-open');
    }, 300);
  });
};

// Enhanced touch handling for iPhone Pro
const enhanceTouch = () => {
  // Add touch feedback
  document.addEventListener('touchstart', (e) => {
    if (e.target.matches('button, .text-button, input[type="submit"]')) {
      e.target.classList.add('touch-active');
    }
  });
  
  document.addEventListener('touchend', (e) => {
    if (e.target.matches('button, .text-button, input[type="submit"]')) {
      setTimeout(() => {
        e.target.classList.remove('touch-active');
      }, 150);
    }
  });
  
  // Prevent accidental zoom on input focus
  const inputs = document.querySelectorAll('input');
  inputs.forEach(input => {
    input.addEventListener('focus', () => {
      input.style.fontSize = '16px'; // Prevent iOS zoom
    });
  });
};

// Auto-scroll to top when auth form changes
const handleAuthFormChanges = () => {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        // Check if auth form content changed
        const authContainer = document.querySelector('.auth-container');
        if (authContainer && mutation.target.contains(authContainer)) {
          // Smooth scroll to top of auth form
          setTimeout(() => {
            authContainer.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'start' 
            });
          }, 100);
        }
      }
    });
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
};

// Initialize all iPhone Pro enhancements
export const initializeIPhoneProAuth = () => {
  // Only run on mobile devices
  if (window.innerWidth <= 430 && 'ontouchstart' in window) {
    iPhoneProViewportFix();
    handleVirtualKeyboard();
    enhanceTouch();
    handleAuthFormChanges();
    
    console.log('iPhone Pro authentication enhancements initialized');
  }
};

// CSS class utilities
export const iPhoneProUtils = {
  addIPhoneProClass: () => {
    const isIPhonePro = window.navigator.userAgent.includes('iPhone') && 
                       window.screen.height >= 844 && 
                       window.devicePixelRatio === 3;
    
    if (isIPhonePro) {
      document.documentElement.classList.add('iphone-pro');
      return true;
    }
    return false;
  },
  
  isKeyboardOpen: () => {
    return document.body.classList.contains('keyboard-open');
  },
  
  scrollToAuthForm: () => {
    const authForm = document.querySelector('.auth-form');
    if (authForm) {
      authForm.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center',
        inline: 'nearest'
      });
    }
  }
};

export default {
  initializeIPhoneProAuth,
  iPhoneProUtils
};