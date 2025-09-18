// Visual Effects Service - Manages advanced animations and interactions
class VisualEffectsService {
  constructor() {
    this.isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.observers = new Map();
    this.particles = [];
    this.effectsEnabled = !this.isReducedMotion;
    
    this.init();
  }

  init() {
    // Listen for reduced motion preference changes
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
      this.isReducedMotion = e.matches;
      this.effectsEnabled = !e.matches;
      
      if (this.isReducedMotion) {
        this.disableAllEffects();
      }
    });

    // Initialize scroll animations
    this.initScrollAnimations();
    
    // Initialize particle system
    if (this.effectsEnabled) {
      this.initParticles();
    }
  }

  // Add ripple effect to buttons
  addRippleEffect(element) {
    if (!this.effectsEnabled) return;

    element.classList.add('ripple-effect');
    
    element.addEventListener('click', (e) => {
      const ripple = document.createElement('span');
      const rect = element.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;
      
      ripple.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        left: ${x}px;
        top: ${y}px;
        background: rgba(255, 255, 255, 0.5);
        border-radius: 50%;
        pointer-events: none;
        transform: scale(0);
        animation: ripple 0.6s ease-out;
        z-index: 1;
      `;
      
      element.appendChild(ripple);
      
      setTimeout(() => {
        ripple.remove();
      }, 600);
    });
  }

  // Add enhanced hover effects
  addHoverEffect(element, type = 'card') {
    if (!this.effectsEnabled) return;

    element.classList.add('card-hover');
    
    element.addEventListener('mouseenter', () => {
      if (type === 'button') {
        element.style.transform = 'translateY(-2px) scale(1.02)';
      } else if (type === 'card') {
        element.style.transform = 'translateY(-4px) scale(1.02)';
      }
    });
    
    element.addEventListener('mouseleave', () => {
      element.style.transform = '';
    });
  }

  // Add entrance animation to elements
  addEntranceAnimation(element, animationType = 'slideInUp', delay = 0) {
    if (!this.effectsEnabled) return;

    element.style.opacity = '0';
    element.style.transform = this.getInitialTransform(animationType);
    
    setTimeout(() => {
      element.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
      element.style.opacity = '1';
      element.style.transform = 'none';
      
      element.addEventListener('transitionend', () => {
        element.style.transition = '';
      }, { once: true });
    }, delay);
  }

  getInitialTransform(type) {
    const transforms = {
      slideInUp: 'translateY(30px)',
      slideInDown: 'translateY(-30px)',
      slideInLeft: 'translateX(-30px)',
      slideInRight: 'translateX(30px)',
      scaleIn: 'scale(0.8)',
      fadeIn: 'translateY(0)'
    };
    return transforms[type] || transforms.slideInUp;
  }

  // Add typing indicator animation
  createTypingIndicator(container) {
    if (!this.effectsEnabled) {
      // Simple text fallback for reduced motion
      const simple = document.createElement('div');
      simple.textContent = 'User is typing...';
      simple.className = 'typing-simple';
      return simple;
    }

    const indicator = document.createElement('div');
    indicator.className = 'typing-indicator';
    
    for (let i = 0; i < 3; i++) {
      const dot = document.createElement('div');
      dot.className = 'typing-dot';
      indicator.appendChild(dot);
    }
    
    return indicator;
  }

  // Add loading skeleton
  createLoadingSkeleton(type = 'message', count = 3) {
    const container = document.createElement('div');
    container.className = 'skeleton-container';
    
    for (let i = 0; i < count; i++) {
      const skeleton = document.createElement('div');
      skeleton.className = 'skeleton-item';
      
      if (type === 'message') {
        skeleton.innerHTML = `
          <div class="skeleton skeleton-avatar"></div>
          <div class="skeleton-content">
            <div class="skeleton skeleton-text" style="width: 60%"></div>
            <div class="skeleton skeleton-text" style="width: 80%"></div>
            <div class="skeleton skeleton-text" style="width: 45%"></div>
          </div>
        `;
      } else if (type === 'conversation') {
        skeleton.innerHTML = `
          <div class="skeleton skeleton-avatar"></div>
          <div class="skeleton-content">
            <div class="skeleton skeleton-text" style="width: 70%"></div>
            <div class="skeleton skeleton-text" style="width: 50%"></div>
          </div>
        `;
      }
      
      container.appendChild(skeleton);
    }
    
    return container;
  }

  // Initialize scroll-based animations
  initScrollAnimations() {
    if (!this.effectsEnabled) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '50px'
    });

    // Observe elements with fade-in-scroll class
    const scrollElements = document.querySelectorAll('.fade-in-scroll');
    scrollElements.forEach(el => observer.observe(el));
    
    this.observers.set('scroll', observer);
  }

  // Add scroll animation to element
  addScrollAnimation(element, animationType = 'fadeIn') {
    if (!this.effectsEnabled) return;

    element.classList.add('fade-in-scroll');
    
    if (this.observers.has('scroll')) {
      this.observers.get('scroll').observe(element);
    }
  }

  // Initialize particle system
  initParticles() {
    if (!this.effectsEnabled || document.querySelector('.particles-container')) return;

    const container = document.createElement('div');
    container.className = 'particles-container';
    container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: -1;
      overflow: hidden;
    `;

    // Create floating particles
    for (let i = 0; i < 15; i++) {
      const particle = this.createParticle();
      container.appendChild(particle);
    }

    document.body.appendChild(container);
  }

  createParticle() {
    const particle = document.createElement('div');
    const size = Math.random() * 4 + 2;
    const left = Math.random() * 100;
    const duration = Math.random() * 6 + 8;
    const delay = Math.random() * 5;
    
    particle.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      background: rgba(99, 102, 241, 0.1);
      border-radius: 50%;
      left: ${left}%;
      animation: particle-float ${duration}s linear infinite;
      animation-delay: ${delay}s;
    `;
    
    return particle;
  }

  // Add success/error feedback animations
  showFeedback(element, type = 'success', message = '') {
    if (!this.effectsEnabled) {
      // Simple text feedback for reduced motion
      this.showSimpleFeedback(element, type, message);
      return;
    }

    element.classList.add(`${type}-feedback`);
    
    // Create feedback popup
    const feedback = document.createElement('div');
    feedback.className = `feedback-popup ${type}`;
    feedback.textContent = message;
    feedback.style.cssText = `
      position: absolute;
      top: -40px;
      left: 50%;
      transform: translateX(-50%);
      background: ${type === 'success' ? '#10b981' : '#ef4444'};
      color: white;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      white-space: nowrap;
      z-index: 1000;
      opacity: 0;
      animation: feedbackSlide 2s ease-out;
    `;

    element.style.position = 'relative';
    element.appendChild(feedback);

    setTimeout(() => {
      element.classList.remove(`${type}-feedback`);
      feedback.remove();
    }, 2000);
  }

  showSimpleFeedback(element, type, message) {
    const color = type === 'success' ? '#10b981' : '#ef4444';
    const originalBorder = element.style.border;
    
    element.style.border = `2px solid ${color}`;
    element.setAttribute('aria-live', 'polite');
    element.setAttribute('aria-label', message);
    
    setTimeout(() => {
      element.style.border = originalBorder;
      element.removeAttribute('aria-live');
      element.removeAttribute('aria-label');
    }, 2000);
  }

  // Add theme transition effects
  addThemeTransition(element) {
    element.classList.add('theme-transition');
  }

  // Add focus ring for accessibility
  addFocusRing(element) {
    element.classList.add('focus-ring');
  }

  // Add loading overlay
  addLoadingOverlay(container, message = 'Loading...') {
    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    
    if (this.effectsEnabled) {
      overlay.innerHTML = `
        <div class="loading-content">
          <div class="spinner"></div>
          <div class="loading-text">${message}</div>
        </div>
      `;
    } else {
      overlay.innerHTML = `
        <div class="loading-content">
          <div class="loading-text">${message}</div>
        </div>
      `;
    }
    
    container.style.position = 'relative';
    container.appendChild(overlay);
    
    return overlay;
  }

  removeLoadingOverlay(overlay) {
    if (overlay && overlay.parentNode) {
      if (this.effectsEnabled) {
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 300);
      } else {
        overlay.remove();
      }
    }
  }

  // Animate message appearance
  animateNewMessage(messageElement, isOwn = false) {
    if (!this.effectsEnabled) return;

    const animation = isOwn ? 'slideInRight' : 'slideInUp';
    this.addEntranceAnimation(messageElement, animation);
  }

  // Add glass morphism effect
  addGlassMorphism(element, isDark = false) {
    const className = isDark ? 'glass-morphism-dark' : 'glass-morphism';
    element.classList.add(className);
  }

  // Add floating animation
  addFloatingAnimation(element, reverse = false) {
    if (!this.effectsEnabled) return;

    element.classList.add(reverse ? 'floating-reverse' : 'floating');
  }

  // Add gradient animation
  addAnimatedGradient(element) {
    if (!this.effectsEnabled) return;

    element.classList.add('animated-gradient');
  }

  // Disable all effects (for accessibility)
  disableAllEffects() {
    this.effectsEnabled = false;
    
    // Remove particles
    const particlesContainer = document.querySelector('.particles-container');
    if (particlesContainer) {
      particlesContainer.remove();
    }
    
    // Clear observers
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
    
    console.log('Visual effects disabled for accessibility');
  }

  // Re-enable effects
  enableEffects() {
    if (this.isReducedMotion) return;
    
    this.effectsEnabled = true;
    this.initScrollAnimations();
    this.initParticles();
    
    console.log('Visual effects enabled');
  }

  // Get effect status
  getEffectsStatus() {
    return {
      enabled: this.effectsEnabled,
      reducedMotion: this.isReducedMotion,
      particlesActive: !!document.querySelector('.particles-container'),
      observersCount: this.observers.size
    };
  }
}

// Create singleton instance
const visualEffectsService = new VisualEffectsService();

export default visualEffectsService;